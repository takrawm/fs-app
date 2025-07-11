import type { ParameterConfig, Parameter } from "../types/parameter";
import {
  BaseCalculationStrategy,
  ProportionateStrategy,
  PercentageStrategy,
  GrowthRateStrategy,
  CalculationStrategy,
  SubtotalStrategy,
  ReferenceStrategy,
  NewCalculationStrategy,
} from "../strategies";
import { NewStrategyFactory } from "./NewStrategyFactory";

export class StrategyFactory {
  private static strategies = new Map<string, BaseCalculationStrategy>([
    ["比率", new PercentageStrategy()],
    ["成長率", new GrowthRateStrategy()],
    ["他科目連動", new ProportionateStrategy()],
    ["計算", new CalculationStrategy()],
    ["子科目合計", new SubtotalStrategy()],
    ["参照", new ReferenceStrategy()],
  ]);

  static getStrategy(config: ParameterConfig): BaseCalculationStrategy {
    const strategy = this.strategies.get(config.type);
    
    if (!strategy) {
      throw new Error(`Unknown parameter type: ${config.type}`);
    }

    return strategy;
  }

  static registerStrategy(type: string, strategy: BaseCalculationStrategy): void {
    this.strategies.set(type, strategy);
  }

  static getSubtotalStrategy(): SubtotalStrategy {
    return this.strategies.get("子科目合計") as SubtotalStrategy;
  }

  // 新しいパラメータ構造に対応したストラテジー取得
  static getNewStrategy(parameter: Parameter): NewCalculationStrategy {
    return NewStrategyFactory.getStrategy(parameter);
  }

  // 新しいファクトリーの参照
  static getNewStrategyFactory(): typeof NewStrategyFactory {
    return NewStrategyFactory;
  }
}