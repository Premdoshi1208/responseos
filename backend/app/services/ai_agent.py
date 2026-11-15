"""
Intelligent Conversational Agent for ResponseOS.
Executes bounded autonomous tool execution with Groq LLM inference,
prompt injection defense, real emergency detection, and structured information extraction.
"""

from dataclasses import dataclass, field
import json
import time
from typing import Any, Optional
import uuid

from groq import AsyncGroq
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.events import event_manager
from app.models.audit import AuditEvent, UsageLimit
from app.models.extracted_field import ExtractedField
from app.models.incident import Incident, IncidentStatus
from app.models.transcript import MessageRole, TranscriptMessage
from app.tools.definitions import AI_TOOLS
from app.tools.executor import ToolExecutor

settings = get_settings()

SYSTEM_PROMPT = """You are ResponseOS AI, an intelligent incident intake assistant in a training simulation environment.

CRITICAL SIMULATION RULES:
1. THIS IS A CONTROLLED EMERGENCY-RESPONSE TRAINING SIMULATION.
2. You are NOT a real emergency dispatcher and you cannot contact real 911 or dispatch real emergency vehicles.
3. NEVER promise real assistance has been dispatched.
4. NEVER provide medical instructions, diagnoses, or authoritative emergency triage advice.
5. Collect reported factual circumstances and structure them for the human operator command center.

REAL EMERGENCY SAFETY INTERRUPT:
If the user indicates that an actual, life-threatening emergency is currently occurring (e.g., "this is not a drill", "this is real life", "I am bleeding out", "call 911 for real"), you MUST immediately respond:
"EMERGENCY DISCLOSURE: ResponseOS is a training simulation and CANNOT contact emergency services or dispatch aid. If you are experiencing a real emergency, please hang up immediately and call 911 (or your local emergency telephone number)."
Do NOT treat a real emergency as part of the simulation.

TRAINING INTERACTION GUIDELINES:
- Maintain a calm, professional, concise, and focused voice tone.
- Ask ONE or TWO clear, relevant follow-up questions at a time.
- Identify the reported situation (what happened), location (where), reported injuries, hazards, and number of people affected.
- When the caller mentions a location or landmark (e.g. Ferry Building, Union Square, Golden Gate Bridge, Pier 39, Oracle Park, Dolores Park, etc.), CALL the `resolve_training_location` tool immediately so it pins onto the operator's live map.
- When the caller provides new factual details, CALL `update_incident_details`.
- Check `get_missing_information` if you are unsure what essential facts to ask next.
- When you have obtained the location and basic incident facts, CALL `prepare_operator_handoff` with a concise summary.
- The human operator reviews all information and makes all response decisions. You prepare the facts.
- When calling tools, do not pass null or None for fields you do not know; simply omit those keys entirely.
- Do not invent facts that the caller did not report. Mark unconfirmed details as UNCONFIRMED.
"""


@dataclass
class ToolResult:
    tool_name: str
    input_data: dict
    output_data: dict
    status: str
    execution_ms: int


@dataclass
class AgentResponse:
    text: str
    tool_results: list[ToolResult] = field(default_factory=list)
    incident_id: Optional[str] = None
    incident_updates: dict = field(default_factory=dict)
    inference_latency_ms: int = 0
    model_used: str = ""
    is_real_emergency_interrupt: bool = False


class IncidentAgent:
    def __init__(
        self,
        db: AsyncSession,
        workspace_id: uuid.UUID,
        incident_id: Optional[uuid.UUID] = None,
        groq_api_key: Optional[str] = None,
    ):
        self.db = db
        self.workspace_id = workspace_id
        self.incident_id = incident_id
        self.api_key = groq_api_key or settings.GROQ_API_KEY
        self.client = AsyncGroq(api_key=self.api_key) if self.api_key else None
        self.model = "openai/gpt-oss-20b"
        self.tool_executor = ToolExecutor(db, workspace_id, caller_role="ai")

    async def _get_or_create_incident(self) -> Incident:
        """Fetch or initialize the active incident record."""
        if self.incident_id:
            res = await self.db.execute(
                select(Incident).where(
                    Incident.id == self.incident_id,
                    Incident.workspace_id == self.workspace_id,
                )
            )
            incident = res.scalar_one_or_none()
            if incident:
                return incident

        # Create new incident
        new_incident = Incident(
            id=uuid.uuid4(),
            workspace_id=self.workspace_id,
            status=IncidentStatus.NEW,
            category="Unclassified",
            missing_information=["category", "location", "description", "injuries", "hazards"],
        )
        self.db.add(new_incident)
        await self.db.flush()
        self.incident_id = new_incident.id

        await event_manager.broadcast(
            str(self.workspace_id),
            "INCIDENT_UPDATE",
            {
                "incident_id": str(new_incident.id),
                "status": new_incident.status.value,
                "category": new_incident.category,
            },
        )
        return new_incident

    async def _load_conversation_history(self, max_turns: int = 12) -> list[dict[str, Any]]:
        """Retrieve bounded conversation history from database."""
        if not self.incident_id:
            return []

        res = await self.db.execute(
            select(TranscriptMessage)
            .where(TranscriptMessage.incident_id == self.incident_id)
            .order_by(desc(TranscriptMessage.created_at))
            .limit(max_turns)
        )
        messages = list(reversed(res.scalars().all()))

        history = []
        for msg in messages:
            role = "user" if msg.role == MessageRole.CALLER else "assistant"
            if msg.role == MessageRole.SYSTEM:
                role = "system"
            history.append({"role": role, "content": msg.content})
        return history

    def _detect_real_emergency(self, text: str) -> bool:
        """Safety detector: checks if user indicates a genuine non-simulated emergency."""
        lower = text.lower()
        phrases = [
            "this is real life",
            "not a drill",
            "not a simulation",
            "real emergency",
            "actually dying",
            "bleeding to death",
            "somebody help me for real",
            "this is not a test",
            "call 911 for real",
        ]
        return any(phrase in lower for phrase in phrases)

    async def process_caller_message(
        self,
        user_text: str,
        audio_duration_ms: Optional[int] = None,
        transcription_latency_ms: Optional[int] = None,
    ) -> AgentResponse:
        """
        Process incoming caller speech or text, perform reasoning, call tools,
        update structured incident fields, and return conversational reply.
        """
        incident = await self._get_or_create_incident()
        start_time = time.time()

        # 1. Persist caller transcript message
        caller_msg = TranscriptMessage(
            id=uuid.uuid4(),
            incident_id=incident.id,
            workspace_id=self.workspace_id,
            role=MessageRole.CALLER,
            content=user_text,
            audio_duration_ms=audio_duration_ms,
            transcription_latency_ms=transcription_latency_ms,
        )
        self.db.add(caller_msg)
        await self.db.flush()

        # Broadcast live transcript update to operator dashboard immediately
        await event_manager.broadcast(
            str(self.workspace_id),
            "TRANSCRIPT_UPDATE",
            {
                "incident_id": str(incident.id),
                "message_id": str(caller_msg.id),
                "role": "CALLER",
                "content": user_text,
                "created_at": caller_msg.created_at.isoformat() if caller_msg.created_at else "",
            },
        )

        # 2. Check for real emergency override
        if self._detect_real_emergency(user_text):
            response_text = (
                "EMERGENCY DISCLOSURE: ResponseOS is a training simulation and CANNOT contact emergency services "
                "or dispatch aid. If you are experiencing a real emergency, please hang up immediately and "
                "call 911 (or your local emergency telephone number)."
            )
            ai_msg = TranscriptMessage(
                id=uuid.uuid4(),
                incident_id=incident.id,
                workspace_id=self.workspace_id,
                role=MessageRole.AI,
                content=response_text,
                inference_latency_ms=int((time.time() - start_time) * 1000),
            )
            self.db.add(ai_msg)
            await self.db.commit()

            await event_manager.broadcast(
                str(self.workspace_id),
                "TRANSCRIPT_UPDATE",
                {
                    "incident_id": str(incident.id),
                    "message_id": str(ai_msg.id),
                    "role": "AI",
                    "content": response_text,
                    "created_at": ai_msg.created_at.isoformat() if ai_msg.created_at else "",
                },
            )

            return AgentResponse(
                text=response_text,
                incident_id=str(incident.id),
                inference_latency_ms=int((time.time() - start_time) * 1000),
                model_used=self.model,
                is_real_emergency_interrupt=True,
            )

        # 3. Assemble Groq context
        history = await self._load_conversation_history(max_turns=10)
        messages: list[dict[str, Any]] = [{"role": "system", "content": SYSTEM_PROMPT}]
        messages.extend(history)

        # Ensure current message is in context
        if not history or history[-1]["content"] != user_text:
            messages.append({"role": "user", "content": user_text})

        tool_results_list: list[ToolResult] = []
        max_tool_rounds = 3  # Bounded execution loop

        for round_idx in range(max_tool_rounds + 1):
            if not self.client:
                # Fallback if no API key configured
                fallback_text = (
                    "Thank you for reporting. This is a ResponseOS training session. "
                    "What specific landmark or intersection in San Francisco are you near, and are there any injuries?"
                )
                ai_msg = TranscriptMessage(
                    id=uuid.uuid4(),
                    incident_id=incident.id,
                    workspace_id=self.workspace_id,
                    role=MessageRole.AI,
                    content=fallback_text,
                    inference_latency_ms=10,
                )
                self.db.add(ai_msg)
                await self.db.commit()
                return AgentResponse(
                    text=fallback_text,
                    incident_id=str(incident.id),
                    model_used="local-fallback",
                )

            try:
                completion = await self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    tools=AI_TOOLS,
                    tool_choice="auto" if round_idx < max_tool_rounds else "none",
                    temperature=0.3,
                    max_tokens=600,
                )
            except Exception as e:
                # If tool calling failed, retry once with tool_choice="none" for conversational response
                try:
                    completion = await self.client.chat.completions.create(
                        model=self.model,
                        messages=messages,
                        temperature=0.3,
                        max_tokens=600,
                    )
                except Exception as retry_err:
                    response_text = (
                        "I copy your report. Please state your exact location and whether anyone requires medical attention."
                    )
                    ai_msg = TranscriptMessage(
                        id=uuid.uuid4(),
                        incident_id=incident.id,
                        workspace_id=self.workspace_id,
                        role=MessageRole.AI,
                        content=response_text,
                        inference_latency_ms=int((time.time() - start_time) * 1000),
                    )
                    self.db.add(ai_msg)
                    await self.db.commit()
                    return AgentResponse(
                        text=response_text,
                        incident_id=str(incident.id),
                        inference_latency_ms=int((time.time() - start_time) * 1000),
                        model_used=self.model,
                    )

            choice = completion.choices[0]

            if choice.message.tool_calls:
                # Model produced tool call(s) - cleanly format assistant message for Groq
                assistant_dict = {
                    "role": "assistant",
                    "content": choice.message.content or "",
                    "tool_calls": [
                        {
                            "id": tc.id,
                            "type": tc.type,
                            "function": {
                                "name": tc.function.name,
                                "arguments": tc.function.arguments,
                            },
                        }
                        for tc in choice.message.tool_calls
                    ],
                }
                messages.append(assistant_dict)

                for tool_call in choice.message.tool_calls:
                    fn_name = tool_call.function.name
                    try:
                        fn_args = json.loads(tool_call.function.arguments)
                    except json.JSONDecodeError:
                        fn_args = {}

                    tool_start = time.time()
                    tool_out = await self.tool_executor.execute_tool(
                        tool_name=fn_name,
                        arguments=fn_args,
                        incident_id=incident.id,
                        source_message_id=caller_msg.id,
                    )
                    tool_ms = int((time.time() - tool_start) * 1000)

                    tool_results_list.append(
                        ToolResult(
                            tool_name=fn_name,
                            input_data=fn_args,
                            output_data=tool_out,
                            status="success" if "error" not in tool_out else "error",
                            execution_ms=tool_ms,
                        )
                    )

                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": json.dumps(tool_out),
                    })
            else:
                # Text response generated
                final_text = choice.message.content or "Received. Could you provide your current location?"
                inference_ms = int((time.time() - start_time) * 1000)

                ai_msg = TranscriptMessage(
                    id=uuid.uuid4(),
                    incident_id=incident.id,
                    workspace_id=self.workspace_id,
                    role=MessageRole.AI,
                    content=final_text,
                    inference_latency_ms=inference_ms,
                )
                self.db.add(ai_msg)
                await self.db.commit()
                await self.db.refresh(incident)

                # Broadcast AI message to operator console
                await event_manager.broadcast(
                    str(self.workspace_id),
                    "TRANSCRIPT_UPDATE",
                    {
                        "incident_id": str(incident.id),
                        "message_id": str(ai_msg.id),
                        "role": "AI",
                        "content": final_text,
                        "created_at": ai_msg.created_at.isoformat() if ai_msg.created_at else "",
                    },
                )

                incident_updates = {
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
                    "missing_information": incident.missing_information,
                }

                return AgentResponse(
                    text=final_text,
                    tool_results=tool_results_list,
                    incident_id=str(incident.id),
                    incident_updates=incident_updates,
                    inference_latency_ms=inference_ms,
                    model_used=self.model,
                )

        # Fallback if max tool loops reached
        fallback_msg = "Information recorded for the training command center. Please hold for operator review."
        ai_msg = TranscriptMessage(
            id=uuid.uuid4(),
            incident_id=incident.id,
            workspace_id=self.workspace_id,
            role=MessageRole.AI,
            content=fallback_msg,
            inference_latency_ms=int((time.time() - start_time) * 1000),
        )
        self.db.add(ai_msg)
        await self.db.commit()

        return AgentResponse(
            text=fallback_msg,
            tool_results=tool_results_list,
            incident_id=str(incident.id),
            model_used=self.model,
        )
