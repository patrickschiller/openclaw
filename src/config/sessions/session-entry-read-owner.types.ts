import type { AgentDatabaseRegistryChange } from "../../state/openclaw-agent-db-contract.js";
import type { SessionEntryReadOnlyWorkerScope } from "./session-accessor.types.js";
import type { CanonicalSessionReaderContinuation } from "./session-canonical-key.js";
import type { PreparedSessionEntryWorkerRead } from "./session-entry-read-runtime.types.js";
import type { SessionEntryReadWorkerResult } from "./session-entry-read.types.js";
import type { IncognitoSessionBinding } from "./session-incognito-binding.js";
import type { SessionStoreReadCandidate } from "./session-store-read-candidates.js";
import type { SessionHistoryWorkerDatabase } from "./session-transcript-worker.types.js";

export type SessionEntryReadWorkerOwner = {
  kind: "native" | "incognito" | "file" | "unresolved";
  incognito?: IncognitoSessionBinding;
  assertCurrent: () => void;
  scope?: SessionEntryReadOnlyWorkerScope;
  source?: SessionEntryReadWorkerResult["source"];
  selectedStore?: Readonly<Pick<SessionStoreReadCandidate, "path" | "physicalPath">>;
  onRegistryChange?: (change: AgentDatabaseRegistryChange) => void;
  refreshBeforeDispatch?: (assertRetainedTarget: () => void) => Promise<void>;
  revalidateTarget?: () => Promise<void>;
};

export type SessionStoreWorkerReader = Pick<
  SessionEntryReadWorkerOwner,
  "onRegistryChange" | "refreshBeforeDispatch" | "revalidateTarget"
> & {
  reader: SessionHistoryWorkerDatabase;
  database: PreparedSessionEntryWorkerRead["database"];
  logicalAgentId: string;
  selectedStore: NonNullable<SessionEntryReadWorkerOwner["selectedStore"]>;
  continuation?: CanonicalSessionReaderContinuation;
  assertCurrent: () => void;
};
