# UX problem framing

Method: desk-based problem framing using the July 2026 Telstra capstone brief, sections 1, 2, 4 and 5.2, plus the inspected team console. No participants were recruited and no usability outcomes are claimed.

Persona: SafeCall duty coordinator revisiting a silent-pendant assessment after an interruption. Task: recover the checks already made and retain a next step without changing escalation state. Evidence in the brief: manual triage crosses systems and people; each recommended action must show its supporting evidence. The personal notebook is a proposed supporting tool, not a client-approved operational record.

1. Risk: the operator records context against the wrong incident. Decision: fixed pendant identity and synthetic context sit above both the editor and history (UC-01 steps 2–3). One sample case avoids selection ambiguity.
2. Risk: a temporary outage makes a successful-looking save misleading. Decision: wait for a server-acknowledged transaction, label pending state, and show recoverable failure with retained draft. Require a history refresh before retrying an uncertain request (steps 4–5).
3. Risk: an interrupted coordinator repeats checks. Decision: newest-first history sits beside the editor on wide screens and immediately below it on narrow screens; saved time and note count provide a visible cross-check (steps 2, 5–6).
4. Risk: the prototype is mistaken for an emergency operation or shared handover system. Decision: persistent synthetic warning and personal-workspace label; no escalation controls; no confidential information in sample data.
5. Risk: blank or excessive notes fail late. Decision: visible length guidance, live trimmed character count and inline error beside the input. Server rules repeat validation for direct writes.

Wireframe state coverage: authentication gate; initial loading; case empty; sample create pending/error; case with empty history; invalid input; save pending; save confirmed with history; recoverable save/read error and refresh; narrow-screen stacking. These are design states, not claims of executed tests. See wireframe figures in the submission and component test evidence for execution.
