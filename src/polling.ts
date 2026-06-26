import type { ElyonPayClient } from "./client";
import type { Transaction, PollingOptions } from "./types";
import { TERMINAL_STATES } from "./types";

/**
 * Poll a transaction until it reaches a terminal state or the timeout
 * is exceeded.
 *
 * Returns the final `Transaction` object.
 * Throws if the timeout is reached before a terminal state.
 *
 * @param client   - An `ElyonPayClient` instance.
 * @param txId     - The `transactionId` returned by a direct payment call.
 * @param options  - Polling interval & timeout.
 * @param onUpdate - Optional callback fired on every poll tick.
 */
export async function pollTransaction(
  client: ElyonPayClient,
  txId: number,
  options?: PollingOptions,
  onUpdate?: (tx: Transaction) => void,
): Promise<Transaction> {
  const intervalMs = options?.intervalMs ?? 4000;
  const timeoutMs = options?.timeoutMs ?? 120_000;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const tx = await client.getTransaction(txId);
    onUpdate?.(tx);

    if (TERMINAL_STATES.includes(tx.state)) {
      return tx;
    }

    await sleep(intervalMs);
  }

  throw new Error(
    `[ElyonPay] Polling timeout after ${timeoutMs}ms for transaction ${txId}`,
  );
}

/**
 * Create an abortable polling controller.
 * Useful for React/Vue cleanup on unmount.
 */
export function createPollingController(
  client: ElyonPayClient,
  txId: number,
  options?: PollingOptions,
  onUpdate?: (tx: Transaction) => void,
) {
  let aborted = false;

  const promise = (async (): Promise<Transaction> => {
    const intervalMs = options?.intervalMs ?? 4000;
    const timeoutMs = options?.timeoutMs ?? 120_000;
    const start = Date.now();

    while (!aborted && Date.now() - start < timeoutMs) {
      const tx = await client.getTransaction(txId);
      if (aborted) throw new Error("[ElyonPay] Polling aborted");
      onUpdate?.(tx);

      if (TERMINAL_STATES.includes(tx.state)) {
        return tx;
      }

      await sleep(intervalMs);
    }

    if (aborted) throw new Error("[ElyonPay] Polling aborted");
    throw new Error(
      `[ElyonPay] Polling timeout after ${timeoutMs}ms for transaction ${txId}`,
    );
  })();

  return {
    promise,
    abort: () => {
      aborted = true;
    },
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
