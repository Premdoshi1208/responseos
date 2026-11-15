import pytest
import sys
import uuid
from pathlib import Path
import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "backend"))

from app.core.database import engine, async_session
from app.models.base import Base
from app.main import app


@pytest.mark.asyncio
async def test_full_critical_end_to_end_journey():
    # Setup fresh database schema
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # Step 1: Create isolated training workspace
        ws_res = await client.post("/api/workspaces", json={"name": "E2E Critical Journey Sandbox"})
        assert ws_res.status_code == 201
        ws_data = ws_res.json()
        workspace_id = ws_data["id"]
        caller_token = ws_data["access_token"]
        operator_token = ws_data["operator_token"]
        assert caller_token is not None
        assert operator_token is not None

        caller_headers = {"X-Workspace-Token": caller_token}
        operator_headers = {"X-Operator-Token": operator_token}

        # Step 2: Verify simulated units initialized
        units_res = await client.get("/api/units", headers=caller_headers)
        assert units_res.status_code == 200
        units = units_res.json()
        assert len(units) == 6
        medic_unit = next(u for u in units if u["unit_name"] == "Medic-1")
        assert medic_unit["is_available"] is True

        # Step 3: Caller starts vehicle collision call near Ferry Building
        caller_turn_res = await client.post(
            "/api/voice/conversation",
            headers=caller_headers,
            json={
                "text": "Two cars just collided directly in front of the Ferry Building in San Francisco! The driver in the sedan is injured, and there is smoke coming from the engine.",
                "audio_duration_ms": 4200,
                "transcription_latency_ms": 320,
            },
        )
        assert caller_turn_res.status_code == 200
        turn_data = caller_turn_res.json()
        incident_id = turn_data["incident_id"]
        assert incident_id is not None
        assert len(turn_data["text"]) > 0
        assert turn_data["inference_latency_ms"] > 0

        # Step 4: Verify structured facts extracted and landmark resolved
        inc_detail_res = await client.get(f"/api/incidents/{incident_id}", headers=caller_headers)
        assert inc_detail_res.status_code == 200
        inc_detail = inc_detail_res.json()
        assert inc_detail["category"] == "vehicle_collision"
        assert inc_detail["reported_location"] == "Ferry Building"
        assert pytest.approx(inc_detail["latitude"], 0.001) == 37.7955
        assert pytest.approx(inc_detail["longitude"], 0.001) == -122.3934

        # Step 5: Verify conversation transcript persisted
        transcript_res = await client.get(f"/api/incidents/{incident_id}/transcript", headers=caller_headers)
        assert transcript_res.status_code == 200
        transcript = transcript_res.json()
        assert len(transcript) >= 2  # Caller statement + AI response

        # Step 6: Operator reviews and confirms incident facts
        review_res = await client.post(
            f"/api/incidents/{incident_id}/review",
            headers=operator_headers,
            json={
                "field_name": "location",
                "review_type": "CONFIRMED",
            },
        )
        assert review_res.status_code == 200

        # Step 7: Operator adds note
        note_res = await client.post(
            f"/api/incidents/{incident_id}/notes",
            headers=operator_headers,
            json={"content": "Confirmed visual smoke on traffic cameras near Embarcadero."},
        )
        assert note_res.status_code == 200

        # Step 8: Operator assigns simulated training unit Medic-1
        assign_res = await client.post(
            f"/api/units/{medic_unit['id']}/assign",
            headers=operator_headers,
            json={"incident_id": incident_id},
        )
        assert assign_res.status_code == 200
        assert assign_res.json()["status"] == "assigned"

        # Step 9: Verify unit status reflects assignment
        units_after_res = await client.get("/api/units", headers=operator_headers)
        updated_medic = next(u for u in units_after_res.json() if u["unit_name"] == "Medic-1")
        assert updated_medic["is_available"] is False
        assert updated_medic["active_incident_id"] == incident_id

        # Step 10: Duplicate assignment prevention
        dup_res = await client.post(
            f"/api/units/{medic_unit['id']}/assign",
            headers=operator_headers,
            json={"incident_id": incident_id},
        )
        assert dup_res.status_code == 400

        # Step 11: Export Incident Report (Markdown and JSON)
        md_report = await client.get(f"/api/incidents/{incident_id}/report?format=markdown", headers=caller_headers)
        assert md_report.status_code == 200
        assert "RESPONSEOS — INCIDENT SIMULATION REPORT" in md_report.text
        assert "Ferry Building" in md_report.text
        assert "Medic-1" in md_report.text

        json_report = await client.get(f"/api/incidents/{incident_id}/report?format=json", headers=caller_headers)
        assert json_report.status_code == 200
        assert json_report.json()["reported_location"] == "Ferry Building"

        # Step 12: Operator closes training incident
        close_res = await client.post(f"/api/incidents/{incident_id}/close", headers=operator_headers)
        assert close_res.status_code == 200

        # Step 13: Verify Medic-1 is released
        units_final_res = await client.get("/api/units", headers=operator_headers)
        released_medic = next(u for u in units_final_res.json() if u["unit_name"] == "Medic-1")
        assert released_medic["is_available"] is True

        # Step 14: Workspace isolation verification with a second workspace
        ws2_res = await client.post("/api/workspaces", json={"name": "Isolated Workspace 2"})
        ws2_caller_token = ws2_res.json()["access_token"]
        ws2_incidents = await client.get("/api/incidents", headers={"X-Workspace-Token": ws2_caller_token})
        assert len(ws2_incidents.json()) == 0  # Cannot see workspace 1 incidents!
