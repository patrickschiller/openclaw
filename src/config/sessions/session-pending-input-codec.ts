import { asOptionalRecord } from "@openclaw/normalization-core/record-coerce";
import type { AgentRunTerminalOutcome } from "../../agents/agent-run-terminal-outcome.types.js";
import type { PersistedUserTurnMessage } from "../../sessions/user-turn-transcript.types.js";
import type { SessionPendingInput, SessionPendingInputRow } from "./session-pending-input.types.js";

export function parseSessionPendingInputMessage(messageJson: string): PersistedUserTurnMessage {
  const value: unknown = JSON.parse(messageJson);
  if (asOptionalRecord(value)?.role !== "user") {
    throw new Error("Pending input has an invalid persisted user message");
  }
  // SAFETY: only typed admission writes this JSON; parsing preserves its canonical message shape.
  return value as PersistedUserTurnMessage;
}

export function isFinalInputCompletion(outcome: AgentRunTerminalOutcome): boolean {
  return (
    outcome.reason === "completed" ||
    (outcome.reason === "cancelled" && outcome.stopReason !== "restart")
  );
}

export function projectSessionPendingInput(row: SessionPendingInputRow): SessionPendingInput {
  if (row.state !== "queued" && row.state !== "interrupted" && row.state !== "cancelled") {
    throw new Error("Pending input has an invalid disposition");
  }
  return {
    id: row.input_id,
    runId: row.run_id,
    message: parseSessionPendingInputMessage(row.message_json),
    acceptedAt: row.accepted_at,
    state: row.state,
  };
}
