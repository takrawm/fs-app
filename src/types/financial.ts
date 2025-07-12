// financial.ts - accountTypes.tsから財務関連の型定義をエクスポート
export type {
  CalculationResult,
  CalculationContext,
  CalculationStrategy,
  FinancialModel,
  FinancialValue,
  Period,
} from "./accountTypes";

// 不足している型定義を追加
export interface ValidationError {
  field: string;
  message: string;
}

export interface CalculationError {
  accountId: string;
  periodId: string;
  error: string;
  stack?: string;
}

export interface AccountValue {
  accountId: string;
  periodId: string;
  value: number;
}
