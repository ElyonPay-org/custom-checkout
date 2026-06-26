import { ref, watch, type Ref } from "vue";
import type { ElyonPayClient } from "../client";
import type { PaymentMethod } from "../types";

/**
 * Fetch the available payment methods for a country.
 *
 * ```vue
 * <script setup>
 * import { createElyonPayClient } from "@elyonpay/custom-checkout";
 * import { usePaymentMethods } from "@elyonpay/custom-checkout/vue";
 *
 * const client = createElyonPayClient({ token, environment: "sandbox" });
 * const { methods, loading, error, refetch } = usePaymentMethods(client, "CM");
 * </script>
 * ```
 *
 * @param client      - An `ElyonPayClient` instance.
 * @param countryCode - ISO 3166 country code, or a reactive ref to one.
 */
export function usePaymentMethods(
  client: ElyonPayClient,
  countryCode: string | Ref<string>,
) {
  const methods = ref<PaymentMethod[]>([]);
  const loading = ref(true);
  const error = ref<Error | null>(null);

  async function fetch_(code: string) {
    loading.value = true;
    error.value = null;
    try {
      const res = await client.getPaymentMethods(code);
      methods.value = res.payments.filter((m) => m.available);
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err));
    } finally {
      loading.value = false;
    }
  }

  // If countryCode is a ref, re-fetch on change
  if (typeof countryCode === "string") {
    fetch_(countryCode);
  } else {
    watch(countryCode, (code) => fetch_(code), { immediate: true });
  }

  const refetch = () => {
    const code =
      typeof countryCode === "string" ? countryCode : countryCode.value;
    return fetch_(code);
  };

  return { methods, loading, error, refetch };
}
