// @ts-nocheck
// TODO: accountTypes.tsの型定義に合わせて修正が必要
// 既存のストラテジー（互換性のため保持）
export { CalculationStrategy as BaseCalculationStrategy } from "./base/CalculationStrategy";
export { ProportionateStrategy } from "./ProportionateStrategy";
export { PercentageStrategy } from "./PercentageStrategy";
export { GrowthRateStrategy } from "./GrowthRateStrategy";
export { CalculationStrategy } from "./CalculationStrategy";
export { SubtotalStrategy } from "./SubtotalStrategy";
export { ReferenceStrategy } from "./ReferenceStrategy";

// 新しいストラテジー
export { NewCalculationStrategy } from "./base/NewCalculationStrategy";
export { ConstantStrategy } from "./ConstantStrategy";
export { NewPercentageStrategy } from "./NewPercentageStrategy";
export { PercentageOfRevenueStrategy } from "./PercentageOfRevenueStrategy";
export { DaysStrategy } from "./DaysStrategy";
export { ManualInputStrategy } from "./ManualInputStrategy";
export { NewFormulaStrategy } from "./NewFormulaStrategy";
export { CfImpactStrategy } from "./CfImpactStrategy";