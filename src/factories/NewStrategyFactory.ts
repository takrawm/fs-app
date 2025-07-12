// @ts-nocheck
// TODO: accountTypes.tsの型定義に合わせて修正が必要
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
    ["constant", new ConstantStrategy()],
    ["percentage", new NewPercentageStrategy()],
    ["percentageOfRevenue", new PercentageOfRevenueStrategy()],
    ["days", new DaysStrategy()],
    ["manualInput", new ManualInputStrategy()],
    ["formula", new NewFormulaStrategy()],
  ]);

  private static cfImpactStrategy = CfImpactStrategy.getInstance();

  static getStrategy(parameter: Parameter): NewCalculationStrategy {
    const strategy = this.strategies.get(parameter.type);

    if (!strategy) {
      throw new Error(`Unknown parameter type: ${parameter.type}`);
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
    switch (parameter.type) {
      case "constant":
        return new ConstantStrategy();
      case "percentage":
        return new NewPercentageStrategy();
      case "percentageOfRevenue":
        return new PercentageOfRevenueStrategy();
      case "days":
        return new DaysStrategy();
      case "manualInput":
        return new ManualInputStrategy();
      case "formula":
        return new NewFormulaStrategy();
      default:
        throw new Error(`Unknown parameter type: ${parameter.type}`);
    }
  }
}
