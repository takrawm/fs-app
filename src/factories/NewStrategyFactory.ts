import { PARAMETER_TYPES } from "../types/accountTypes";
import type { Parameter } from "../types/accountTypes";
import { NewCalculationStrategy } from "../strategies/base/NewCalculationStrategy";
import { ConstantStrategy } from "../strategies/ConstantStrategy";
import { NewPercentageStrategy } from "../strategies/NewPercentageStrategy";
import { PercentageOfRevenueStrategy } from "../strategies/PercentageOfRevenueStrategy";
import { DaysStrategy } from "../strategies/DaysStrategy";
import { ManualInputStrategy } from "../strategies/ManualInputStrategy";
import { NewFormulaStrategy } from "../strategies/NewFormulaStrategy";
import { CfImpactStrategy } from "../strategies/CfImpactStrategy";

export class NewStrategyFactory {
  private static strategies = new Map<string, NewCalculationStrategy>([
    [PARAMETER_TYPES.CONSTANT, new ConstantStrategy()],
    [PARAMETER_TYPES.PERCENTAGE, new NewPercentageStrategy()],
    [PARAMETER_TYPES.PERCENTAGE_OF_REVENUE, new PercentageOfRevenueStrategy()],
    [PARAMETER_TYPES.DAYS, new DaysStrategy()],
    [PARAMETER_TYPES.MANUAL_INPUT, new ManualInputStrategy()],
    [PARAMETER_TYPES.FORMULA, new NewFormulaStrategy()],
  ]);

  private static cfImpactStrategy = CfImpactStrategy.getInstance();

  static getStrategy(parameter: Parameter): NewCalculationStrategy {
    if (parameter.paramType === null) {
      throw new Error("Parameter type cannot be null");
    }

    const strategy = this.strategies.get(parameter.paramType);

    if (!strategy) {
      throw new Error(`Unknown parameter type: ${parameter.paramType}`);
    }

    return strategy;
  }

  static getCfImpactStrategy(): CfImpactStrategy {
    return this.cfImpactStrategy;
  }

  static registerStrategy(
    type: string,
    strategy: NewCalculationStrategy
  ): void {
    this.strategies.set(type, strategy);
  }

  static getAllStrategies(): Map<string, NewCalculationStrategy> {
    return new Map(this.strategies);
  }

  static getAvailableTypes(): string[] {
    return Array.from(this.strategies.keys());
  }

  // 動的にストラテジーを作成する場合
  static createStrategy(parameter: Parameter): NewCalculationStrategy {
    if (parameter.paramType === null) {
      throw new Error("Parameter type cannot be null");
    }

    switch (parameter.paramType) {
      case PARAMETER_TYPES.CONSTANT:
        return new ConstantStrategy();
      case PARAMETER_TYPES.PERCENTAGE:
        return new NewPercentageStrategy();
      case PARAMETER_TYPES.PERCENTAGE_OF_REVENUE:
        return new PercentageOfRevenueStrategy();
      case PARAMETER_TYPES.DAYS:
        return new DaysStrategy();
      case PARAMETER_TYPES.MANUAL_INPUT:
        return new ManualInputStrategy();
      case PARAMETER_TYPES.FORMULA:
        return new NewFormulaStrategy();
      default:
        throw new Error(`Unknown parameter type: ${parameter.paramType}`);
    }
  }
}
