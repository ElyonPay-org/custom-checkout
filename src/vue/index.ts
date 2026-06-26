export { usePaymentMethods } from "./usePaymentMethods";
export { useDirectPayment } from "./useDirectPayment";

// Re-export core utilities & types so consumers don't need a second import
export {
  ElyonPayClient,
  createElyonPayClient,
  pollTransaction,
  createPollingController,
  TERMINAL_STATES,
  SUCCESS_STATES,
  FAILURE_STATES,
} from "../index";

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
} from "../types";
