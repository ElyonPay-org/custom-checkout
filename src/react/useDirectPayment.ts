import { useState, useRef, useCallback } from "react";
import { useElyonPayClient } from "./ElyonPayProvider";
import { createPollingController } from "../polling";
import { SUCCESS_STATES } from "../types";
import type {
  DirectPaymentParams,
  PaymentResult,
  Transaction,
  PollingOptions,
  UseDirectPaymentReturn,
} from "../types";

/**
 * Initiate a direct payment and automatically poll for the result.
 *
 * ```tsx
 * const { pay, status, transaction, error, reset } = useDirectPayment();
 *
 * const handlePay = () => pay({
 *   amount: 15000,
 *   merchantName: "Ma Boutique",
 *   merchantId: 258,
 *   currency: "XAF",
 *   countryName: "Cameroon",
 *   beneficiaries: [{ id: 258 }],
 *   paymentMethod: "ORANGE_MONEY",
 *   customerMsisdn: "+237690000001",
 * });
 * ```
 */
export function useDirectPayment(
  pollingOptions?: PollingOptions,
): UseDirectPaymentReturn {
  const client = useElyonPayClient();
  const [status, setStatus] =
    useState<UseDirectPaymentReturn["status"]>("idle");
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(
    null,
  );
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<(() => void) | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.();
    abortRef.current = null;
    setStatus("idle");
    setPaymentResult(null);
    setTransaction(null);
    setError(null);
  }, []);

  const pay = useCallback(
    async (params: DirectPaymentParams) => {
      // Clean up any previous polling
      abortRef.current?.();
      setError(null);
      setTransaction(null);
      setPaymentResult(null);

      try {
        // Step 1: Initiate payment
        setStatus("initiating");
        const result = await client.pay(params);
        setPaymentResult(result);

        // Step 2: Poll for terminal state
        setStatus("polling");
        const controller = createPollingController(
          client,
          result.transactionId,
          pollingOptions,
          (tx) => setTransaction(tx),
        );
        abortRef.current = controller.abort;

        const finalTx = await controller.promise;
        setTransaction(finalTx);

        if (SUCCESS_STATES.includes(finalTx.state)) {
          setStatus("success");
        } else {
          setStatus("error");
        }
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        if (e.message.includes("Polling timeout")) {
          setStatus("timeout");
        } else if (!e.message.includes("aborted")) {
          setStatus("error");
        }
        setError(e);
      }
    },
    [client, pollingOptions],
  );

  return { pay, transaction, paymentResult, status, error, reset };
}
