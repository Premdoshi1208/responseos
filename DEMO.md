# ResponseOS — 3-Minute Demonstration Guide for Startup Founders & CTOs

Follow these instructions to experience the full ResponseOS live simulation workflow in under 3 minutes.

---

## Step 1: Open the Paired Interfaces in Two Browser Tabs

1. Navigate to the public ResponseOS URL in your browser:  
   👉 `https://responseos.onrender.com` (or local `http://localhost:8000`)
2. Click **"Start Live Simulation"** to enter the Caller Interface (`/caller`).
3. Click the amber button in the upper-right corner:  
   **"Open Paired Command Center"**  
   This opens the Operator Command Center in Tab 2, authenticated to the exact same training sandbox.
4. Arrange Tab 1 (Caller) and Tab 2 (Command Center) side-by-side on your monitor.

---

## Step 2: Speak into the Microphone (Caller Tab 1)

1. In Tab 1, click **"Choose Scenario"** and select **"Vehicle Collision"**, or click **"Start Voice Simulation"**.
2. Hold down the **"Hold to Speak"** button (or click **"Toggle Mic"**), allow browser microphone permissions, and say:
   > *"There is a two-car collision right in front of the Ferry Building in San Francisco! The driver looks injured and smoke is coming from under the hood."*
3. Release the button.
4. Observe the state progression:
   - Voice Orb pulses: `LISTENING` → `TRANSCRIBING` (Groq Whisper Turbo) → `PROCESSING` (Groq GPT-OSS) → `SPEAKING`.
   - The AI responds with a calm, professional dispatcher query asking clarifying questions.

---

## Step 3: Watch Real-Time Operator Synchronization (Command Center Tab 2)

Without touching Tab 2, observe the live updates arriving via Server-Sent Events:
1. **Queue Panel (Left):** A new incident appears labeled `Vehicle Collision` at `Ferry Building`.
2. **Interactive Map (Center):** The map automatically centers on San Francisco and drops an active amber pulsing radar pin at the **Ferry Building** (`37.7955, -122.3934`).
3. **Intelligence Panel (Right):**
   - The AI-generated executive summary appears.
   - Structured facts appear in the intelligence table:
     - **Location:** `Ferry Building`
     - **Hazards:** `Smoke, possible fuel leak`
     - **Injuries:** `Driver injured`
   - The full transcript between Caller and AI displays with real latency badges.

---

## Step 4: Complete the Simulated Dispatch Workflow (Operator Tab 2)

1. Under **"Human Operator Review"**, click **"Confirm Facts"** to sign off on the extracted facts.
2. In the **"Simulated Training Unit Dispatch"** section, select **`Medic-1 (AMBULANCE)`** from the available units dropdown.
3. Click **"Assign Unit"**.
4. Observe:
   - An actual database transaction commits the assignment.
   - `Medic-1` is marked as assigned and pinned to the incident.
   - The incident status transitions to `TRAINING_UNIT_ASSIGNED`.
5. Click **"Export Incident Report"** to view and download the formatted Markdown or JSON incident audit record.
6. Click **"Close"** to finalize the training simulation, which releases `Medic-1` back to the available fleet.

---

## Step 5: Test Safety & Edge Cases

1. In the Caller tab, say:
   > *"This is not a drill, my house is actually on fire, call 911 for real!"*
2. Notice the AI immediately interrupts the simulation, issues an emergency disclosure, and directs the user to hang up and dial 911.
