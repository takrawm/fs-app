// 新しいParameter型定義を再エクスポート
export type {
  Parameter,
  ParameterType,
  ConstantParameter,
  PercentageParameter,
  PercentageOfRevenueParameter,
  DaysParameter,
  ManualInputParameter,
  FormulaParameter
} from './newFinancialTypes';

export {
  PARAMETER_TYPES,
  isConstantParameter,
  isPercentageParameter,
  isPercentageOfRevenueParameter,
  isDaysParameter,
  isManualInputParameter,
  isFormulaParameter
} from './newFinancialTypes';

// 旧ParameterConfig型（互換性のため残す）
export type LegacyParameterConfig = 
  | { type: "比率"; value: number; referenceId: string }
  | { type: "成長率"; value: number }
  | { type: "他科目連動"; referenceId: string }
  | { type: "計算"; references: Array<{id: string; operation: "+" | "-" | "*" | "/"}>}
  | { type: "子科目合計" }
  | { type: "参照"; referenceId: string };

// 旧Parameter型（互換性のため残す）
export interface LegacyParameter {
  id: string;
  accountId: string;
  periodId: string;
  config: LegacyParameterConfig;
  createdAt: Date;
  updatedAt: Date;
}

// 互換性のためのエイリアス
export type ParameterConfig = LegacyParameterConfig;

export interface CalculationContext {
  currentPeriodId: string;
  previousPeriodId?: string;
  accounts: Map<string, number>;
  parameters: Map<string, Parameter>;
}

// 旧パラメータから新パラメータへの変換関数
export function migrateLegacyParameter(legacy: LegacyParameter): Parameter {
  const { config } = legacy;
  
  switch (config.type) {
    case "比率":
      return {
        type: PARAMETER_TYPES.PERCENTAGE,
        value: config.value,
        baseAccountId: config.referenceId,
        description: "比率パラメータ"
      } as PercentageParameter;
      
    case "成長率":
      return {
        type: PARAMETER_TYPES.PERCENTAGE,
        value: config.value,
        baseAccountId: legacy.accountId, // 自身の前期値を参照
        description: "成長率パラメータ"
      } as PercentageParameter;
      
    case "他科目連動":
    case "参照":
      return {
        type: PARAMETER_TYPES.FORMULA,
        formula: `[${config.referenceId}]`,
        dependencies: [config.referenceId],
        description: config.type === "他科目連動" ? "他科目連動" : "参照"
      } as FormulaParameter;
      
    case "計算":
      const formula = config.references
        .map(ref => `[${ref.id}]`)
        .join(` ${config.references[0].operation} `);
      return {
        type: PARAMETER_TYPES.FORMULA,
        formula,
        dependencies: config.references.map(ref => ref.id),
        description: "計算式"
      } as FormulaParameter;
      
    case "子科目合計":
      return {
        type: PARAMETER_TYPES.FORMULA,
        formula: "SUM(children)",
        dependencies: [],
        description: "子科目合計"
      } as FormulaParameter;
      
    default:
      return {
        type: PARAMETER_TYPES.CONSTANT,
        value: 0,
        description: "デフォルト"
      } as ConstantParameter;
  }
}