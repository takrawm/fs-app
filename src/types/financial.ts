// 財務関連の型定義の再エクスポート
export type { CalculationContext, CalculationError } from "./calculationTypes";

// CalculationResult、CalculationStrategyは削除済み

export type { FinancialModel } from "./financialModelTypes";

export type { FinancialValue } from "./financialValueTypes";

export type { Period } from "./periodTypes";

// バリデーション関連の型定義
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface AccountValue {
  accountId: string;
  periodId: string;
  value: number;
}
