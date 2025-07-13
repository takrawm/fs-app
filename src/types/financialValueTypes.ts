// 財務数値の型定義
export interface FinancialValue {
  id: string;
  accountId: string;
  periodId: string;
  value: number;
  isCalculated: boolean;
}

// 財務数値作成データの型定義
export interface CreateFinancialValueData {
  accountId: string;
  periodId: string;
  value: number;
  isCalculated?: boolean;
}

// 財務数値更新データの型定義
export interface UpdateFinancialValueData {
  value?: number;
  isCalculated?: boolean;
}

// 財務数値フィルターの型定義
export interface FinancialValueFilter {
  accountId?: string;
  periodId?: string;
  isCalculated?: boolean;
}

// 財務数値サマリーの型定義
export interface FinancialValueSummary {
  totalValues: number;
  calculatedValues: number;
  manualValues: number;
  averageValue: number;
}
