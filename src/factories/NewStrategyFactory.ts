import { PARAMETER_TYPES } from "../types/accountTypes";
import type { Parameter } from "../types/accountTypes";
import { NewCalculationStrategy } from "../strategies/base/NewCalculationStrategy";
import { NewPercentageStrategy } from "../strategies/NewPercentageStrategy";
import { CfImpactStrategy } from "../strategies/CfImpactStrategy";

export class NewStrategyFactory {
  private static strategies = new Map<string, NewCalculationStrategy>([
    [PARAMETER_TYPES.PERCENTAGE, new NewPercentageStrategy()],
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
      case PARAMETER_TYPES.PERCENTAGE:
        return new NewPercentageStrategy();
      default:
        throw new Error(`Unknown parameter type: ${parameter.paramType}`);
    }
  }
}
