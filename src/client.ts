import type {
  ElyonPayConfig,
  PaymentMethodsResponse,
  DirectPaymentParams,
  PaymentResult,
  Transaction,
} from "./types";

const BASE_URLS = {
  sandbox: "https://api.elyonpay.net/api",
  production: "https://api.elyonpay.org/api",
} as const;

/**
 * Low-level HTTP client for the ElyonPay Custom Checkout API.
 *
 * ```ts
 * const client = createElyonPayClient({ token: "ey…", environment: "sandbox" });
 * const methods = await client.getPaymentMethods("CM");
 * ```
 */
export class ElyonPayClient {
  private baseUrl: string;
  private token: string;
  private lang: string;

  constructor(config: ElyonPayConfig) {
    this.token = config.token;
    this.lang = config.lang ?? "fr";
    this.baseUrl =
      config.baseUrl ?? BASE_URLS[config.environment ?? "sandbox"];
  }

  /** Update the JWT token (e.g. after a refresh). */
  setToken(token: string) {
    this.token = token;
  }

  // ──────────── Payment Methods (public — no auth) ────────────

  /**
   * Fetch available payment methods for a given country.
   * **Public endpoint** — no authentication required.
   *
   * `GET /api/public/configuration/payments/{countryCode}`
   */
  async getPaymentMethods(
    countryCode: string,
  ): Promise<PaymentMethodsResponse> {
    const res = await fetch(
      `${this.baseUrl}/public/configuration/payments/${encodeURIComponent(countryCode)}`,
    );
    if (!res.ok) {
      throw new Error(
        `[ElyonPay] getPaymentMethods failed: ${res.status} ${res.statusText}`,
      );
    }
    return res.json();
  }

  // ──────────── Direct Payment ────────────

  /**
   * Initiate a Mobile Money direct payment.
   *
   * `POST /api/mobile-money/payment/request`
   */
  async payMobileMoney(params: DirectPaymentParams): Promise<PaymentResult> {
    return this.initiatePayment(
      "/mobile-money/payment/request",
      params,
    );
  }

  /**
   * Initiate a bank card direct payment.
   *
   * `POST /api/bankcard/payment/request`
   */
  async payBankCard(params: DirectPaymentParams): Promise<PaymentResult> {
    return this.initiatePayment(
      "/bankcard/payment/request",
      params,
    );
  }

  /**
   * Initiate a direct payment — automatically routes to the correct
   * endpoint based on `paymentMethod`.
   */
  async pay(params: DirectPaymentParams): Promise<PaymentResult> {
    const isCard =
      params.paymentMethod === "STRIPE" ||
      params.paymentMethod === "MOLLIE" ||
      params.paymentMethod === "BANKCARD" ||
      params.paymentMethod === "BANK_CARD";

    return isCard ? this.payBankCard(params) : this.payMobileMoney(params);
  }

  // ──────────── Transaction status ────────────

  /**
   * Fetch the current state of a transaction.
   *
   * `GET /api/transactions/{transactionId}`
   */
  async getTransaction(transactionId: number): Promise<Transaction> {
    const res = await fetch(
      `${this.baseUrl}/transactions/${transactionId}`,
      { headers: this.authHeaders() },
    );
    if (!res.ok) {
      throw new Error(
        `[ElyonPay] getTransaction failed: ${res.status} ${res.statusText}`,
      );
    }
    return res.json();
  }

  // ──────────── Internals ────────────

  private authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
      language: this.lang,
    };
  }

  private async initiatePayment(
    path: string,
    params: DirectPaymentParams,
  ): Promise<PaymentResult> {
    const body = {
      amount: params.amount,
      user_lang: this.lang,
      merchant_name: params.merchantName,
      merchant_id: params.merchantId,
      currency: params.currency,
      country_name: params.countryName,
      beneficiaries: params.beneficiaries,
      payment_method: params.paymentMethod,
      customer_msisdn: params.customerMsisdn,
      ...(params.transaction ? { transaction: params.transaction } : {}),
    };

    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: this.authHeaders(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `[ElyonPay] payment request failed: ${res.status} ${res.statusText} ${text}`,
      );
    }

    return res.json();
  }
}

/** Convenience factory. */
export function createElyonPayClient(config: ElyonPayConfig): ElyonPayClient {
  return new ElyonPayClient(config);
}
