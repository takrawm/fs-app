// financial.ts - 分離された型定義ファイルから財務関連の型定義をエクスポート
export type {
  CalculationResult,
  CalculationContext,
  CalculationStrategy,
  CalculationError,
} from "./calculationTypes";

export type { FinancialModel } from "./financialModelTypes";

export type { FinancialValue } from "./financialValueTypes";

export type { Period } from "./periodTypes";

// 不足している型定義を追加
export interface ValidationError {
  field: string;
  message: string;
}

export interface AccountValue {
  accountId: string;
  periodId: string;
  value: number;
}
