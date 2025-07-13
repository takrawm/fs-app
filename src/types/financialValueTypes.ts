// ========== 財務数値関連の型定義 ==========

/** 財務数値の型定義 */
export interface FinancialValue {
  id: string;
  accountId: string;
  periodId: string;
  value: number;
  isCalculated: boolean;
}

/** 財務数値の作成用型定義 */
export interface CreateFinancialValueData {
  accountId: string;
  periodId: string;
  value: number;
  isCalculated: boolean;
}

/** 財務数値の更新用型定義 */
export interface UpdateFinancialValueData {
  value?: number;
  isCalculated?: boolean;
}

/** 財務数値の検索条件 */
export interface FinancialValueFilter {
  accountId?: string;
  periodId?: string;
  isCalculated?: boolean;
}

/** 財務数値の集計結果 */
export interface FinancialValueSummary {
  accountId: string;
  periodId: string;
  totalValue: number;
  calculatedValue: number;
  manualValue: number;
  valueCount: number;
}
