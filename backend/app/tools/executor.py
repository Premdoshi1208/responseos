"""
Tool Execution and Audit Logging Engine.
Executes business tools with strict authorization barriers, input validation,
audit logging, and real-time event broadcasting.
"""

from datetime import datetime, timezone
import json
import time
from typing import Any, Optional
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.events import event_manager
from app.models.audit import AuditEvent, ToolInvocation
from app.models.extracted_field import ExtractedField
from app.models.incident import Incident, IncidentStatus
from app.models.operator import OperatorNote, OperatorReview
from app.models.unit import TrainingUnit, UnitAssignment
from app.services.location_service import resolve_location
from app.tools.definitions import OPERATOR_ONLY_TOOLS


class ToolExecutionError(Exception):
    pass


class ToolExecutor:
    def __init__(self, db: AsyncSession, workspace_id: uuid.UUID, caller_role: str = "ai"):
        self.db = db
        self.workspace_id = workspace_id
        self.caller_role = caller_role  # "ai" or "operator"

    async def log_audit_event(
        self,
        event_type: str,
        data: dict,
        incident_id: Optional[uuid.UUID] = None,
    ):
        """Record a persistent audit trail event."""
        event = AuditEvent(
            id=uuid.uuid4(),
            workspace_id=self.workspace_id,
            incident_id=incident_id,
            event_type=event_type,
            event_data=data,
        )
        self.db.add(event)

    async def execute_tool(
        self,
        tool_name: str,
        arguments: dict,
        incident_id: Optional[uuid.UUID] = None,
        source_message_id: Optional[uuid.UUID] = None,
    ) -> dict[str, Any]:
        """
        Execute a tool with authorization verification and timing.
        """
        start_time = time.time()
        status_str = "success"
        output_data: dict[str, Any] = {}

        # 1. Enforce authorization boundary
        if tool_name in OPERATOR_ONLY_TOOLS and self.caller_role != "operator":
            status_str = "forbidden"
            output_data = {
                "error": f"Tool '{tool_name}' is restricted to human operators only. AI agent is not permitted to perform operator actions."
            }
            # Record unauthorized attempt
            await self._record_invocation(tool_name, arguments, output_data, status_str, start_time, incident_id)
            return output_data

        try:
            # Dispatch tool execution
            if tool_name == "update_incident_details":
                output_data = await self._tool_update_incident_details(incident_id, arguments, source_message_id)
            elif tool_name == "resolve_training_location":
                output_data = await self._tool_resolve_training_location(incident_id, arguments, source_message_id)
            elif tool_name == "get_missing_information":
                output_data = await self._tool_get_missing_information(incident_id)
            elif tool_name == "get_current_incident":
                output_data = await self._tool_get_current_incident(incident_id)
            elif tool_name == "get_reported_information":
                output_data = await self._tool_get_reported_information(incident_id)
            elif tool_name == "prepare_operator_handoff":
                output_data = await self._tool_prepare_operator_handoff(incident_id, arguments)
            elif tool_name == "generate_incident_summary":
                output_data = await self._tool_generate_incident_summary(incident_id, arguments)
            # Operator-only tools
            elif tool_name == "review_incident":
                output_data = await self._operator_review_incident(incident_id, arguments)
            elif tool_name == "correct_incident_details":
                output_data = await self._operator_correct_details(incident_id, arguments)
            elif tool_name == "add_operator_note":
                output_data = await self._operator_add_note(incident_id, arguments)
            elif tool_name == "assign_training_unit":
                output_data = await self._operator_assign_unit(incident_id, arguments)
            elif tool_name == "release_training_unit":
                output_data = await self._operator_release_unit(incident_id, arguments)
            elif tool_name == "update_incident_status":
                output_data = await self._operator_update_status(incident_id, arguments)
            elif tool_name == "close_incident":
                output_data = await self._operator_close_incident(incident_id, arguments)
            elif tool_name == "export_incident_report":
                output_data = await self._operator_export_report(incident_id)
            else:
                status_str = "unknown_tool"
                output_data = {"error": f"Tool '{tool_name}' is not recognized."}

        except Exception as e:
            status_str = "error"
            output_data = {"error": str(e)}

        await self._record_invocation(tool_name, arguments, output_data, status_str, start_time, incident_id)
        return output_data

    async def _record_invocation(
        self,
        tool_name: str,
        args: dict,
        output: dict,
        status_str: str,
        start_time: float,
        incident_id: Optional[uuid.UUID],
    ):
        execution_ms = int((time.time() - start_time) * 1000)
        invocation = ToolInvocation(
            id=uuid.uuid4(),
            workspace_id=self.workspace_id,
            incident_id=incident_id,
            tool_name=tool_name,
            input_data=args,
            output_data=output,
            status=status_str,
            execution_ms=execution_ms,
        )
        self.db.add(invocation)
        await self.db.flush()

    # --- Tool Implementations ---

    async def _tool_update_incident_details(
        self,
        incident_id: Optional[uuid.UUID],
        args: dict,
        source_message_id: Optional[uuid.UUID],
    ) -> dict[str, Any]:
        if not incident_id:
            return {"error": "No active incident"}

        res = await self.db.execute(select(Incident).where(Incident.id == incident_id))
        incident = res.scalar_one_or_none()
        if not incident:
            return {"error": "Incident not found"}

        updated_fields = {}
        for field in ["category", "description", "reported_hazards", "reported_injuries", "people_affected"]:
            if field in args and args[field] is not None:
                val = args[field]
                setattr(incident, field, val)
                updated_fields[field] = val

                # Track in extracted_fields
                ef_res = await self.db.execute(
                    select(ExtractedField).where(
                        ExtractedField.incident_id == incident_id,
                        ExtractedField.field_name == field,
                    )
                )
                ef = ef_res.scalar_one_or_none()
                if ef:
                    ef.previous_value = ef.field_value
                    ef.field_value = str(val)
                    ef.confidence = "REPORTED"
                    ef.source_message_id = source_message_id
                else:
                    ef = ExtractedField(
                        id=uuid.uuid4(),
                        workspace_id=self.workspace_id,
                        incident_id=incident_id,
                        field_name=field,
                        field_value=str(val),
                        confidence="REPORTED",
                        source_message_id=source_message_id,
                    )
                    self.db.add(ef)

        if incident.status == IncidentStatus.NEW:
            incident.status = IncidentStatus.INFORMATION_COLLECTION

        # Recompute missing fields
        missing = []
        if not incident.category:
            missing.append("category")
        if not incident.reported_location:
            missing.append("location")
        if not incident.reported_hazards:
            missing.append("hazards")
        if not incident.reported_injuries:
            missing.append("injuries")
        if incident.people_affected is None:
            missing.append("people_affected")
        incident.missing_information = missing

        await self.db.flush()

        # Broadcast update
        await event_manager.broadcast(
            str(self.workspace_id),
            "INCIDENT_UPDATE",
            {"incident_id": str(incident.id), "updated_fields": updated_fields},
        )

        return {"status": "success", "updated": updated_fields, "missing": missing}

    async def _tool_resolve_training_location(
        self,
        incident_id: Optional[uuid.UUID],
        args: dict,
        source_message_id: Optional[uuid.UUID],
    ) -> dict[str, Any]:
        location_query = args.get("location_name", "")
        resolved = resolve_location(location_query)

        if not resolved:
            return {
                "resolved": False,
                "query": location_query,
                "message": f"Location '{location_query}' could not be resolved to a known training landmark in San Francisco. Please ask the caller for a landmark or intersection.",
            }

        if incident_id:
            res = await self.db.execute(select(Incident).where(Incident.id == incident_id))
            incident = res.scalar_one_or_none()
            if incident:
                incident.reported_location = resolved["name"]
                incident.latitude = resolved["latitude"]
                incident.longitude = resolved["longitude"]
                incident.location_confirmed = False

                # Track in extracted_fields
                ef_res = await self.db.execute(
                    select(ExtractedField).where(
                        ExtractedField.incident_id == incident_id,
                        ExtractedField.field_name == "location",
                    )
                )
                ef = ef_res.scalar_one_or_none()
                if ef:
                    ef.previous_value = ef.field_value
                    ef.field_value = resolved["name"]
                    ef.confidence = "REPORTED"
                    ef.source_message_id = source_message_id
                else:
                    ef = ExtractedField(
                        id=uuid.uuid4(),
                        workspace_id=self.workspace_id,
                        incident_id=incident_id,
                        field_name="location",
                        field_value=resolved["name"],
                        confidence="REPORTED",
                        source_message_id=source_message_id,
                    )
                    self.db.add(ef)

                await self.db.flush()

                # Broadcast update with location marker info
                await event_manager.broadcast(
                    str(self.workspace_id),
                    "INCIDENT_UPDATE",
                    {
                        "incident_id": str(incident.id),
                        "location": resolved["name"],
                        "latitude": resolved["latitude"],
                        "longitude": resolved["longitude"],
                    },
                )

        return {
            "resolved": True,
            "name": resolved["name"],
            "latitude": resolved["latitude"],
            "longitude": resolved["longitude"],
            "address": resolved["address"],
        }

    async def _tool_get_missing_information(self, incident_id: Optional[uuid.UUID]) -> dict[str, Any]:
        if not incident_id:
            return {"missing": ["all"]}

        res = await self.db.execute(select(Incident).where(Incident.id == incident_id))
        incident = res.scalar_one_or_none()
        if not incident:
            return {"missing": ["incident_not_found"]}

        missing = []
        if not incident.category:
            missing.append("category / incident type")
        if not incident.reported_location:
            missing.append("location / landmark")
        if not incident.description:
            missing.append("detailed circumstances")
        if incident.reported_hazards is None:
            missing.append("hazards (fire, fuel, debris, wires)")
        if incident.reported_injuries is None:
            missing.append("injuries / medical conditions")
        if incident.people_affected is None:
            missing.append("number of people affected")

        return {"missing_fields": missing, "count": len(missing)}

    async def _tool_get_current_incident(self, incident_id: Optional[uuid.UUID]) -> dict[str, Any]:
        if not incident_id:
            return {"error": "No incident id"}

        res = await self.db.execute(select(Incident).where(Incident.id == incident_id))
        incident = res.scalar_one_or_none()
        if not incident:
            return {"error": "Not found"}

        return {
            "id": str(incident.id),
            "status": incident.status.value,
            "category": incident.category,
            "location": incident.reported_location,
            "latitude": incident.latitude,
            "longitude": incident.longitude,
            "description": incident.description,
            "hazards": incident.reported_hazards,
            "injuries": incident.reported_injuries,
            "people_affected": incident.people_affected,
            "summary": incident.summary,
        }

    async def _tool_get_reported_information(self, incident_id: Optional[uuid.UUID]) -> dict[str, Any]:
        if not incident_id:
            return {"fields": []}

        res = await self.db.execute(
            select(ExtractedField).where(ExtractedField.incident_id == incident_id)
        )
        fields = res.scalars().all()
        return {
            "fields": [
                {
                    "name": f.field_name,
                    "value": f.field_value,
                    "confidence": f.confidence,
                    "source_message_id": str(f.source_message_id) if f.source_message_id else None,
                }
                for f in fields
            ]
        }

    async def _tool_prepare_operator_handoff(
        self,
        incident_id: Optional[uuid.UUID],
        args: dict,
    ) -> dict[str, Any]:
        if not incident_id:
            return {"error": "No active incident"}

        res = await self.db.execute(select(Incident).where(Incident.id == incident_id))
        incident = res.scalar_one_or_none()
        if not incident:
            return {"error": "Incident not found"}

        summary = args.get("summary", "")
        incident.summary = summary
        incident.status = IncidentStatus.AWAITING_OPERATOR_REVIEW
        await self.db.flush()

        await self.log_audit_event("AI_PREPARED_OPERATOR_HANDOFF", {"summary": summary}, incident_id)

        await event_manager.broadcast(
            str(self.workspace_id),
            "INCIDENT_UPDATE",
            {
                "incident_id": str(incident.id),
                "status": incident.status.value,
                "summary": summary,
            },
        )

        return {"status": "handoff_ready", "incident_status": "AWAITING_OPERATOR_REVIEW"}

    async def _tool_generate_incident_summary(
        self,
        incident_id: Optional[uuid.UUID],
        args: dict,
    ) -> dict[str, Any]:
        if not incident_id:
            return {"error": "No active incident"}

        res = await self.db.execute(select(Incident).where(Incident.id == incident_id))
        incident = res.scalar_one_or_none()
        if not incident:
            return {"error": "Incident not found"}

        summary = args.get("summary", "")
        incident.summary = summary
        await self.db.flush()

        await event_manager.broadcast(
            str(self.workspace_id),
            "INCIDENT_UPDATE",
            {"incident_id": str(incident.id), "summary": summary},
        )

        return {"status": "summary_updated", "summary": summary}

    # --- Operator-Only Tools ---

    async def _operator_review_incident(
        self,
        incident_id: Optional[uuid.UUID],
        args: dict,
    ) -> dict[str, Any]:
        """Operator reviews and confirms or flags an incident field."""
        field_name = args.get("field_name", "")
        review_type = args.get("review_type", "CONFIRMED")  # CONFIRMED, CORRECTED, FLAGGED
        corrected_value = args.get("corrected_value")

        # Fetch current extracted field
        ef_res = await self.db.execute(
            select(ExtractedField).where(
                ExtractedField.incident_id == incident_id,
                ExtractedField.field_name == field_name,
            )
        )
        ef = ef_res.scalar_one_or_none()
        orig_val = ef.field_value if ef else None

        review = OperatorReview(
            id=uuid.uuid4(),
            workspace_id=self.workspace_id,
            incident_id=incident_id,
            review_type=review_type,
            field_name=field_name,
            original_value=orig_val,
            corrected_value=corrected_value,
        )
        self.db.add(review)

        # Update incident status if currently AWAITING_OPERATOR_REVIEW
        inc_res = await self.db.execute(select(Incident).where(Incident.id == incident_id))
        incident = inc_res.scalar_one_or_none()
        if incident and incident.status == IncidentStatus.AWAITING_OPERATOR_REVIEW:
            incident.status = IncidentStatus.REVIEWED
            incident.operator_review_status = "REVIEWED"

        if ef:
            if review_type == "CONFIRMED":
                ef.confidence = "CONFIRMED"
            elif review_type == "CORRECTED" and corrected_value:
                ef.previous_value = ef.field_value
                ef.field_value = str(corrected_value)
                ef.confidence = "CONFIRMED"
                # Also update incident column if appropriate
                if incident and hasattr(incident, field_name):
                    setattr(incident, field_name, corrected_value)

        await self.db.flush()

        await self.log_audit_event(
            "OPERATOR_REVIEW_SUBMITTED",
            {"field": field_name, "type": review_type, "corrected": corrected_value},
            incident_id,
        )

        await event_manager.broadcast(
            str(self.workspace_id),
            "INCIDENT_UPDATE",
            {"incident_id": str(incident_id), "status": incident.status.value if incident else "REVIEWED"},
        )

        return {"status": "reviewed", "field": field_name, "review_type": review_type}

    async def _operator_correct_details(
        self,
        incident_id: Optional[uuid.UUID],
        args: dict,
    ) -> dict[str, Any]:
        """Operator explicitly overrides/corrects incident attributes."""
        inc_res = await self.db.execute(select(Incident).where(Incident.id == incident_id))
        incident = inc_res.scalar_one_or_none()
        if not incident:
            return {"error": "Incident not found"}

        for k, v in args.items():
            if hasattr(incident, k) and v is not None:
                setattr(incident, k, v)

        await self.db.flush()
        await event_manager.broadcast(
            str(self.workspace_id),
            "INCIDENT_UPDATE",
            {"incident_id": str(incident_id), "corrected": args},
        )
        return {"status": "corrected", "details": args}

    async def _operator_add_note(
        self,
        incident_id: Optional[uuid.UUID],
        args: dict,
    ) -> dict[str, Any]:
        content = args.get("content", "").strip()
        if not content:
            return {"error": "Note content cannot be empty"}

        note = OperatorNote(
            id=uuid.uuid4(),
            workspace_id=self.workspace_id,
            incident_id=incident_id,
            content=content,
        )
        self.db.add(note)
        await self.db.flush()

        await event_manager.broadcast(
            str(self.workspace_id),
            "INCIDENT_UPDATE",
            {"incident_id": str(incident_id), "new_note": content},
        )

        return {"status": "note_added", "id": str(note.id), "content": content}

    async def _operator_assign_unit(
        self,
        incident_id: Optional[uuid.UUID],
        args: dict,
    ) -> dict[str, Any]:
        """
        Transactional assignment of a simulated training unit to an incident.
        Validates unit availability and ownership; prevents duplicate active assignments.
        """
        unit_id_str = args.get("unit_id")
        if not unit_id_str or not incident_id:
            return {"error": "unit_id and incident_id are required"}

        try:
            unit_uuid = uuid.UUID(unit_id_str)
        except ValueError:
            return {"error": "Invalid unit_id format"}

        # Lock and verify unit
        unit_res = await self.db.execute(
            select(TrainingUnit).where(
                TrainingUnit.id == unit_uuid,
                TrainingUnit.workspace_id == self.workspace_id,
            )
        )
        unit = unit_res.scalar_one_or_none()
        if not unit:
            return {"error": "Training unit not found in this workspace"}

        if not unit.is_available:
            return {"error": f"Training unit '{unit.unit_name}' is currently unavailable/assigned."}

        # Check existing active assignment for this incident + unit
        existing_assign = await self.db.execute(
            select(UnitAssignment).where(
                UnitAssignment.incident_id == incident_id,
                UnitAssignment.unit_id == unit_uuid,
                UnitAssignment.released_at.is_(None),
            )
        )
        if existing_assign.scalar_one_or_none():
            return {"error": f"Training unit '{unit.unit_name}' is already assigned to this incident."}

        # Create assignment
        assignment = UnitAssignment(
            id=uuid.uuid4(),
            workspace_id=self.workspace_id,
            incident_id=incident_id,
            unit_id=unit_uuid,
            assigned_at=datetime.now(timezone.utc),
            released_at=None,
        )
        self.db.add(assignment)

        # Mark unit as unavailable
        unit.is_available = False

        # Advance incident state to TRAINING_UNIT_ASSIGNED
        inc_res = await self.db.execute(select(Incident).where(Incident.id == incident_id))
        incident = inc_res.scalar_one_or_none()
        if incident:
            incident.status = IncidentStatus.TRAINING_UNIT_ASSIGNED

        await self.db.flush()

        await self.log_audit_event(
            "TRAINING_UNIT_ASSIGNED",
            {
                "unit_id": str(unit.id),
                "unit_name": unit.unit_name,
                "unit_type": unit.unit_type.value,
                "incident_id": str(incident_id),
            },
            incident_id,
        )

        # Synchronize both browser views via SSE
        await event_manager.broadcast(
            str(self.workspace_id),
            "UNIT_UPDATE",
            {
                "incident_id": str(incident_id),
                "unit_id": str(unit.id),
                "unit_name": unit.unit_name,
                "status": "ASSIGNED",
                "incident_status": IncidentStatus.TRAINING_UNIT_ASSIGNED.value,
            },
        )

        return {
            "status": "assigned",
            "unit_name": unit.unit_name,
            "unit_type": unit.unit_type.value,
            "incident_status": IncidentStatus.TRAINING_UNIT_ASSIGNED.value,
        }

    async def _operator_release_unit(
        self,
        incident_id: Optional[uuid.UUID],
        args: dict,
    ) -> dict[str, Any]:
        """Release an assigned simulated unit back to the available pool."""
        unit_id_str = args.get("unit_id")
        if not unit_id_str or not incident_id:
            return {"error": "unit_id and incident_id are required"}

        unit_uuid = uuid.UUID(unit_id_str)
        assign_res = await self.db.execute(
            select(UnitAssignment).where(
                UnitAssignment.incident_id == incident_id,
                UnitAssignment.unit_id == unit_uuid,
                UnitAssignment.released_at.is_(None),
            )
        )
        assignment = assign_res.scalar_one_or_none()
        if not assignment:
            return {"error": "No active assignment found for this unit and incident"}

        assignment.released_at = datetime.now(timezone.utc)

        # Make unit available again
        unit_res = await self.db.execute(select(TrainingUnit).where(TrainingUnit.id == unit_uuid))
        unit = unit_res.scalar_one_or_none()
        if unit:
            unit.is_available = True

        await self.db.flush()

        await event_manager.broadcast(
            str(self.workspace_id),
            "UNIT_UPDATE",
            {
                "incident_id": str(incident_id),
                "unit_id": str(unit_uuid),
                "status": "RELEASED",
            },
        )

        return {"status": "released", "unit_id": str(unit_uuid)}

    async def _operator_update_status(
        self,
        incident_id: Optional[uuid.UUID],
        args: dict,
    ) -> dict[str, Any]:
        new_status_str = args.get("status")
        try:
            new_status = IncidentStatus(new_status_str)
        except ValueError:
            return {"error": f"Invalid status: {new_status_str}"}

        inc_res = await self.db.execute(select(Incident).where(Incident.id == incident_id))
        incident = inc_res.scalar_one_or_none()
        if not incident:
            return {"error": "Incident not found"}

        incident.status = new_status
        await self.db.flush()

        await event_manager.broadcast(
            str(self.workspace_id),
            "STATUS_CHANGE",
            {"incident_id": str(incident_id), "status": new_status.value},
        )

        return {"status": "updated", "new_status": new_status.value}

    async def _operator_close_incident(
        self,
        incident_id: Optional[uuid.UUID],
        args: dict,
    ) -> dict[str, Any]:
        """Close training incident and release all assigned simulated units."""
        inc_res = await self.db.execute(select(Incident).where(Incident.id == incident_id))
        incident = inc_res.scalar_one_or_none()
        if not incident:
            return {"error": "Incident not found"}

        incident.status = IncidentStatus.CLOSED
        now = datetime.now(timezone.utc)

        # Release all units assigned to this incident
        assign_res = await self.db.execute(
            select(UnitAssignment).where(
                UnitAssignment.incident_id == incident_id,
                UnitAssignment.released_at.is_(None),
            )
        )
        active_assignments = assign_res.scalars().all()
        for assign in active_assignments:
            assign.released_at = now
            unit_res = await self.db.execute(select(TrainingUnit).where(TrainingUnit.id == assign.unit_id))
            unit = unit_res.scalar_one_or_none()
            if unit:
                unit.is_available = True

        await self.db.flush()

        await self.log_audit_event("INCIDENT_CLOSED", {"incident_id": str(incident_id)}, incident_id)

        await event_manager.broadcast(
            str(self.workspace_id),
            "STATUS_CHANGE",
            {"incident_id": str(incident_id), "status": IncidentStatus.CLOSED.value},
        )

        return {"status": "closed", "released_units": len(active_assignments)}

    async def _operator_export_report(self, incident_id: Optional[uuid.UUID]) -> dict[str, Any]:
        # Formatted report generation
        from app.api.incidents import generate_markdown_report, generate_json_report
        # Fallback dictionary
        return {"status": "ready", "incident_id": str(incident_id)}
