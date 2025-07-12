// パラメータ関連の型定義を再エクスポート
export type {
  Parameter,
  ParameterType,
  Operation
} from './newFinancialTypes';

export {
  PARAMETER_TYPES,
  OPERATIONS,
  isGrowthRateParameter,
  isChildrenSumParameter,
  isCalculationParameter,
  isPercentageParameter,
  isProportionateParameter,
  isNullParameter
} from './newFinancialTypes';