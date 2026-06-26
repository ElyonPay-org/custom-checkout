import { useState, useEffect, useCallback } from "react";
import { useElyonPayClient } from "./ElyonPayProvider";
import type { PaymentMethod, UsePaymentMethodsReturn } from "../types";

/**
 * Fetch the available payment methods for a country.
 *
 * ```tsx
 * const { methods, loading, error } = usePaymentMethods("CM");
 * ```
 *
 * @param countryCode - ISO 3166 country code (e.g. `"CM"`, `"CI"`, `"GA"`).
 */
export function usePaymentMethods(
  countryCode: string,
): UsePaymentMethodsReturn {
  const client = useElyonPayClient();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await client.getPaymentMethods(countryCode);
      setMethods(res.payments.filter((m) => m.available));
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [client, countryCode]);

  useEffect(() => {
    fetch_();
  }, [fetch_]);

  return { methods, loading, error, refetch: fetch_ };
}
