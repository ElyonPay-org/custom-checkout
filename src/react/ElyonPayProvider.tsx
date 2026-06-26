import React, { createContext, useContext, useMemo } from "react";
import { ElyonPayClient } from "../client";
import type { ElyonPayConfig } from "../types";

const ElyonPayContext = createContext<ElyonPayClient | null>(null);

export interface ElyonPayProviderProps extends ElyonPayConfig {
  children: React.ReactNode;
}

/**
 * Wrap your app (or checkout page) with `<ElyonPayProvider>` to make
 * the client available to all hooks.
 *
 * ```tsx
 * <ElyonPayProvider token={jwt} environment="sandbox">
 *   <CheckoutPage />
 * </ElyonPayProvider>
 * ```
 */
export function ElyonPayProvider({
  children,
  ...config
}: ElyonPayProviderProps) {
  const client = useMemo(() => new ElyonPayClient(config), [
    config.token,
    config.environment,
    config.baseUrl,
    config.lang,
  ]);

  return (
    <ElyonPayContext.Provider value={client}>
      {children}
    </ElyonPayContext.Provider>
  );
}

/**
 * Internal hook — retrieve the `ElyonPayClient` from context.
 * Throws if used outside an `<ElyonPayProvider>`.
 */
export function useElyonPayClient(): ElyonPayClient {
  const client = useContext(ElyonPayContext);
  if (!client) {
    throw new Error(
      "[ElyonPay] useElyonPayClient must be used inside <ElyonPayProvider>.",
    );
  }
  return client;
}
