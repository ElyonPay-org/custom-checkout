import { ref, onUnmounted } from "vue";
import type { ElyonPayClient } from "../client";
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
 * ```vue
 * <script setup>
 * import { createElyonPayClient } from "@elyonpay/custom-checkout";
 * import { useDirectPayment } from "@elyonpay/custom-checkout/vue";
 *
 * const client = createElyonPayClient({ token, environment: "sandbox" });
 * const { pay, status, transaction, error, reset } = useDirectPayment(client);
 *
 * async function handlePay() {
 *   await pay({
 *     amount: 15000,
 *     merchantName: "Ma Boutique",
 *     merchantId: 258,
 *     currency: "XAF",
 *     countryName: "Cameroon",
 *     beneficiaries: [{ id: 258 }],
 *     paymentMethod: "ORANGE_MONEY",
 *     customerMsisdn: "+237690000001",
 *   });
 * }
 * </script>
 * ```
 *
 * @param client         - An `ElyonPayClient` instance.
 * @param pollingOptions - Optional polling interval/timeout overrides.
 */
export function useDirectPayment(
  client: ElyonPayClient,
  pollingOptions?: PollingOptions,
) {
  const status = ref<UseDirectPaymentReturn["status"]>("idle");
  const paymentResult = ref<PaymentResult | null>(null);
  const transaction = ref<Transaction | null>(null);
  const error = ref<Error | null>(null);

  let abortFn: (() => void) | null = null;

  function reset() {
    abortFn?.();
    abortFn = null;
    status.value = "idle";
    paymentResult.value = null;
    transaction.value = null;
    error.value = null;
  }

  async function pay(params: DirectPaymentParams) {
    // Clean up any previous polling
    abortFn?.();
    error.value = null;
    transaction.value = null;
    paymentResult.value = null;

    try {
      // Step 1: Initiate payment
      status.value = "initiating";
      const result = await client.pay(params);
      paymentResult.value = result;

      // Step 2: Poll for terminal state
      status.value = "polling";
      const controller = createPollingController(
        client,
        result.transactionId,
        pollingOptions,
        (tx) => {
          transaction.value = tx;
        },
      );
      abortFn = controller.abort;

      const finalTx = await controller.promise;
      transaction.value = finalTx;

      if (SUCCESS_STATES.includes(finalTx.state)) {
        status.value = "success";
      } else {
        status.value = "error";
      }
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      if (e.message.includes("Polling timeout")) {
        status.value = "timeout";
      } else if (!e.message.includes("aborted")) {
        status.value = "error";
      }
      error.value = e;
    }
  }

  // Abort polling on component unmount
  onUnmounted(() => {
    abortFn?.();
  });

  return { pay, transaction, paymentResult, status, error, reset };
}
