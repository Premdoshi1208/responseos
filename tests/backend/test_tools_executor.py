import pytest
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "backend"))

from app.core.database import engine, async_session
from app.models.base import Base
from app.models.incident import Incident, IncidentStatus
from app.models.unit import TrainingUnit, UnitType
from app.services.workspace_service import create_workspace
from app.tools.executor import ToolExecutor


@pytest.mark.asyncio
async def test_authorization_barrier_rejects_ai_operator_tools():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        ws = await create_workspace(session, name="Auth Test")
        ws_id = uuid.UUID(ws["id"])

        # Create dummy incident
        inc = Incident(
            id=uuid.uuid4(),
            workspace_id=ws_id,
            status=IncidentStatus.NEW,
        )
        session.add(inc)
        await session.flush()

        # AI role executor attempts operator-only action
        ai_executor = ToolExecutor(session, ws_id, caller_role="ai")
        result = await ai_executor.execute_tool(
            "assign_training_unit",
            {"unit_id": str(uuid.uuid4())},
            incident_id=inc.id,
        )
        assert "error" in result
        assert "restricted to human operators only" in result["error"]


@pytest.mark.asyncio
async def test_operator_assign_and_release_unit_lifecycle():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        ws = await create_workspace(session, name="Lifecycle Test")
        ws_id = uuid.UUID(ws["id"])

        inc = Incident(
            id=uuid.uuid4(),
            workspace_id=ws_id,
            status=IncidentStatus.AWAITING_OPERATOR_REVIEW,
        )
        session.add(inc)
        await session.flush()

        # Get Medic-1
        from sqlalchemy import select
        u_res = await session.execute(
            select(TrainingUnit).where(TrainingUnit.workspace_id == ws_id, TrainingUnit.unit_name == "Medic-1")
        )
        unit = u_res.scalar_one()
        assert unit.is_available is True

        # Operator assigns unit
        op_executor = ToolExecutor(session, ws_id, caller_role="operator")
        assign_res = await op_executor.execute_tool(
            "assign_training_unit",
            {"unit_id": str(unit.id)},
            incident_id=inc.id,
        )
        assert assign_res["status"] == "assigned"
        assert assign_res["unit_name"] == "Medic-1"
        assert assign_res["incident_status"] == IncidentStatus.TRAINING_UNIT_ASSIGNED.value

        # Unit is now unavailable
        assert unit.is_available is False

        # Duplicate assignment must fail
        dup_res = await op_executor.execute_tool(
            "assign_training_unit",
            {"unit_id": str(unit.id)},
            incident_id=inc.id,
        )
        assert "error" in dup_res

        # Release unit
        rel_res = await op_executor.execute_tool(
            "release_training_unit",
            {"unit_id": str(unit.id)},
            incident_id=inc.id,
        )
        assert rel_res["status"] == "released"
        assert unit.is_available is True
