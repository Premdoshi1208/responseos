# ResponseOS — Security & Safety Specification

## 1. Safety Policies & Emergency Disclosures

ResponseOS is strictly a training simulation. The application implements safeguards against accidental reliance during real emergencies:

1. **Unconditional Simulation Disclosures:** A persistent warning banner is prominently rendered across all user interfaces, and the AI agent states its training identity upon call initialization.
2. **Real Emergency Interruption Filter:** The AI pipeline passes caller input through a keyword safety filter. If terms like "this is not a drill", "this is real life", "I am bleeding to death", or "call 911 for real" are detected:
   - The simulation immediately halts.
   - The model generates an authoritative disclosure directing the user to dial 911 or their local emergency services.
   - The incident is flagged to prevent automated training triage.

---

## 2. Authorization Boundaries & Capability Tokens

To eliminate traditional password friction while guaranteeing demo workspace isolation:
1. **Capability Tokens:** When a workspace is created, the server generates two cryptographically secure unguessable tokens (`secrets.token_urlsafe(32)`):
   - `access_token` (Caller role): Grants permission to start calls, send voice/text input, and read workspace incidents.
   - `operator_token` (Operator role): Grants permission to execute operator-only tools (`assign_training_unit`, `review_incident`, `correct_incident_details`, `close_incident`).
2. **SHA-256 Storage:** Only SHA-256 hashes of tokens are stored in the database.
3. **Role Enforcement:** The `ToolExecutor` checks the caller role. If an AI agent or a caller attempts to call an operator tool, the server returns an explicit `HTTP 403 Forbidden` response and logs an unauthorized invocation audit record.

---

## 3. Prompt Injection & Adversarial Robustness

1. **Bounded Tool Schema:** The model cannot execute arbitrary shell commands or raw SQL. It can only call typed functions with validated parameters.
2. **Instruction Disregard Protection:** The system prompt explicitly instructs the model to ignore user commands attempting to promote themselves to supervisors, modify unit assignments, or bypass training disclosures.
3. **Verified Server Validation:** All state machine transitions and unit assignment constraints are validated deterministically on the Python backend, independent of the model's output.

---

## 4. Rate Limiting & Abuse Prevention

- **Global & Workspace Limits:** Configured with per-minute request limits and daily transcription quotas.
- **Audio File Boundaries:** Audio uploads are limited to 10MB and maximum 60 seconds duration.
- **Microphone Privacy:** Audio chunks are buffered in temporary files solely for Whisper transcription and deleted immediately after the transcription call completes. Raw audio recordings are not durably retained on disk.
