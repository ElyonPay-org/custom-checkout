// Core
export { ElyonPayClient, createElyonPayClient } from "./client";
export { pollTransaction, createPollingController } from "./polling";

// Types
export type {
  ElyonPayConfig,
  PaymentMethod,
  PaymentMethodsResponse,
  Beneficiary,
  DirectPaymentParams,
  PaymentResult,
  Transaction,
  TransactionState,
  PollingOptions,
  UsePaymentMethodsReturn,
  UseDirectPaymentReturn,
} from "./types";

export { TERMINAL_STATES, SUCCESS_STATES, FAILURE_STATES } from "./types";
