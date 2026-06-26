// ──────────────────────────────────────────────
// ElyonPay Custom Checkout — shared types
// ──────────────────────────────────────────────

/** SDK configuration passed to the client / provider. */
export interface ElyonPayConfig {
  /**
   * Your JWT token obtained via `POST /api/login`.
   * **Must be kept server-side** — only pass it from a backend proxy
   * or a secure server-side rendered context.
   */
  token: string;
  /**
   * `"sandbox"` → `https://api.elyonpay.net/api`
   * `"production"` → `https://api.elyonpay.org/api`
   * @default "sandbox"
   */
  environment?: "sandbox" | "production";
  /** Override the base URL entirely (ignores `environment`). */
  baseUrl?: string;
  /** Default language sent in requests (`fr` or `en`). @default "fr" */
  lang?: string;
}

// ──────────── Payment Methods ────────────

export interface PaymentMethod {
  /** Internal identifier, e.g. `"ORANGE_MONEY"`, `"MTN_MONEY"`, `"STRIPE"`. */
  name: string;
  /** Human-readable label, e.g. `"Orange Money"`. */
  label: string;
  /** Category: `"MOBILE_MONEY"` or `"CARD"`. */
  type: "MOBILE_MONEY" | "CARD";
  /** Whether this method is currently active. */
  available: boolean;
}

export interface PaymentMethodsResponse {
  payments: PaymentMethod[];
}

// ──────────── Direct Payment ────────────

export interface Beneficiary {
  id: number;
  [key: string]: unknown;
}

export interface DirectPaymentParams {
  /** Payment amount in local currency. */
  amount: number;
  /** Merchant display name. */
  merchantName: string;
  /** Merchant identifier. */
  merchantId: number;
  /** ISO 4217 currency code (XAF, XOF, EUR, …). */
  currency: string;
  /** Customer's country name (e.g. `"Cameroon"`). */
  countryName: string;
  /** Payment beneficiaries. */
  beneficiaries: Beneficiary[];
  /**
   * Must match `PaymentMethod.name` returned by the payment methods endpoint.
   * E.g. `"ORANGE_MONEY"`, `"MTN_MONEY"`, `"STRIPE"`.
   */
  paymentMethod: string;
  /** Customer phone number in international format (Mobile Money only). */
  customerMsisdn?: string;
  /** External transaction reference (optional). */
  transaction?: string;
}

export interface PaymentResult {
  /** Transaction ID — use for polling. */
  transactionId: number;
  /** Unique ElyonPay identifier. */
  PSPid: string;
  /** Initial status (usually `"PENDING"`). */
  state: TransactionState;
  /** Transaction amount. */
  amount: number;
  /** Total charged to the customer (fees included). */
  totalCustomer: number;
  /** ISO 4217 currency code. */
  currency: string;
  /** Payment method used. */
  payment_method: string;
  /** Creation date (ISO 8601). */
  created_at: string;
}

// ──────────── Transaction / Polling ────────────

export type TransactionState =
  | "PENDING"
  | "DELIVERED"
  | "FAILED"
  | "DECLINED"
  | "CANCELLED";

export const TERMINAL_STATES: TransactionState[] = [
  "DELIVERED",
  "FAILED",
  "DECLINED",
  "CANCELLED",
];

export const SUCCESS_STATES: TransactionState[] = ["DELIVERED"];

export const FAILURE_STATES: TransactionState[] = [
  "FAILED",
  "DECLINED",
  "CANCELLED",
];

export interface Transaction {
  id: number;
  state: TransactionState;
  amount: number;
  currency: string;
  [key: string]: unknown;
}

export interface PollingOptions {
  /** Polling interval in ms. @default 4000 */
  intervalMs?: number;
  /** Maximum polling duration in ms. @default 120000 */
  timeoutMs?: number;
}

// ──────────── Hook / Composable return types ────────────

export interface UsePaymentMethodsReturn {
  methods: PaymentMethod[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export interface UseDirectPaymentReturn {
  pay: (params: DirectPaymentParams) => Promise<void>;
  transaction: Transaction | null;
  paymentResult: PaymentResult | null;
  status: "idle" | "initiating" | "polling" | "success" | "error" | "timeout";
  error: Error | null;
  reset: () => void;
}
