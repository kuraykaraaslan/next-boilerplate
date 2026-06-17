import Logger from '@kuraykaraaslan/logger';
import type { ApprovalDecisionHandler, ApprovalQueueItem } from './approval.types';

/**
 * In-memory hook map: an owning module calls `registerHandler('store_product',
 * fn)` so it is invoked when an item of that `entityType` reaches a terminal
 * decision (e.g. publish the approved product, hard-delete the rejected one).
 *
 * Module-scope on purpose — handlers are wiring registered at boot in the same
 * process and are not persisted. Invocation is fire-and-forget: a thrown /
 * rejected handler is logged and swallowed so it can never break the decision
 * write.
 */
const DECISION_HANDLERS = new Map<string, ApprovalDecisionHandler>();

/** Register (or replace) the decision handler for an `entityType`. */
export function registerHandler(entityType: string, handler: ApprovalDecisionHandler): void {
  DECISION_HANDLERS.set(entityType, handler);
}

/** Remove a previously registered handler (mainly for tests / teardown). */
export function unregisterHandler(entityType: string): void {
  DECISION_HANDLERS.delete(entityType);
}

/** Invoke the registered handler for an item's entityType, fire-and-forget. */
export function onDecision(tenantId: string, item: ApprovalQueueItem): void {
  const handler = DECISION_HANDLERS.get(item.entityType);
  if (!handler) return;
  void Promise.resolve()
    .then(() => handler({ tenantId, item }))
    .catch((err: unknown) =>
      Logger.error(
        `[approval] decision handler for ${item.entityType} failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      ),
    );
}
