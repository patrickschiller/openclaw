import {
  preparePluginStateJournalValue,
  type PluginStateSequencedJournalParams,
} from "./plugin-state-store.journal.js";
import type { OpenKeyedStoreOptions } from "./plugin-state-store.types.js";
import {
  invalidInput,
  optionPolicy,
  requireBoundedOptions,
  validateKey,
  validateMaxEntries,
  validateNamespace,
  validateOptionalTtlMs,
} from "./plugin-state-store.validation.js";
import { registerPluginStateJournalInWorker } from "./plugin-state-worker-client.js";

/** Atomically allocates a workspace sequence and appends one journal entry. */
export async function registerPluginStateSequencedJournalEntry(params: {
  pluginId: string;
  cursorOptions: OpenKeyedStoreOptions;
  cursorKey: string;
  journalOptions: OpenKeyedStoreOptions;
  /** This owner adds a fixed-width sequence suffix so key order matches append order. */
  journalKeyPrefix: string;
  journalKeyRange: PluginStateSequencedJournalParams["journalKeyRange"];
  journalValue: Record<string, unknown>;
}): Promise<number> {
  if (params.pluginId.startsWith("core:")) {
    throw invalidInput("Plugin ids starting with 'core:' are reserved for core consumers.", "open");
  }
  const journalKeyPrefix = validateKey(params.journalKeyPrefix);
  if (params.journalKeyRange.keyStartInclusive >= params.journalKeyRange.keyEndExclusive) {
    throw invalidInput("Plugin state key range must have an increasing exclusive upper bound.");
  }
  requireBoundedOptions(params.cursorOptions);
  requireBoundedOptions(params.journalOptions);
  const cursorNamespace = validateNamespace(params.cursorOptions.namespace);
  const cursorMaxEntries = validateMaxEntries(params.cursorOptions.maxEntries);
  const cursorOverflowPolicy = optionPolicy.resolveOverflowPolicy(
    params.cursorOptions.overflowPolicy,
  );
  const cursorDefaultTtlMs = validateOptionalTtlMs(params.cursorOptions.defaultTtlMs);
  const journalNamespace = validateNamespace(params.journalOptions.namespace);
  const journalMaxEntries = validateMaxEntries(params.journalOptions.maxEntries);
  const journalOverflowPolicy = optionPolicy.resolveOverflowPolicy(
    params.journalOptions.overflowPolicy,
  );
  const journalDefaultTtlMs = validateOptionalTtlMs(params.journalOptions.defaultTtlMs);
  if (
    cursorOverflowPolicy !== "evict-oldest" ||
    journalOverflowPolicy !== "evict-oldest" ||
    cursorDefaultTtlMs !== undefined ||
    journalDefaultTtlMs !== undefined
  ) {
    throw invalidInput("sequenced plugin state journals require non-expiring evict-oldest stores");
  }
  if (params.cursorOptions.env !== params.journalOptions.env) {
    throw invalidInput("sequenced plugin state journal stores must share one environment");
  }
  const cursorKey = validateKey(params.cursorKey);
  optionPolicy.assertConsistent(params.pluginId, cursorNamespace, {
    maxEntries: cursorMaxEntries,
    overflowPolicy: cursorOverflowPolicy,
    defaultTtlMs: cursorDefaultTtlMs,
  });
  optionPolicy.assertConsistent(params.pluginId, journalNamespace, {
    maxEntries: journalMaxEntries,
    overflowPolicy: journalOverflowPolicy,
    defaultTtlMs: journalDefaultTtlMs,
  });
  const journalValueJson = preparePluginStateJournalValue(params.journalValue);
  return registerPluginStateJournalInWorker({
    pluginId: params.pluginId,
    cursorNamespace,
    cursorKey,
    cursorMaxEntries,
    journalNamespace,
    journalMaxEntries,
    journalKeyRange: {
      keyStartInclusive: params.journalKeyRange.keyStartInclusive,
      keyEndExclusive: params.journalKeyRange.keyEndExclusive,
      ...(params.journalKeyRange.valueKind === undefined
        ? {}
        : { valueKind: params.journalKeyRange.valueKind }),
    },
    journalKeyPrefix,
    journalValueJson,
    ...(params.cursorOptions.env ? { env: params.cursorOptions.env } : {}),
  });
}
