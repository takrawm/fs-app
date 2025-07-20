import type { Parameter } from "../types/accountTypes";
import {
  ProportionateStrategy,
  PercentageStrategy,
  GrowthRateStrategy,
  SubtotalStrategy,
  ReferenceStrategy,
  NewCalculationStrategy,
} from "../strategies";
import { NewStrategyFactory } from "./NewStrategyFactory";

export class StrategyFactory {
  private static strategies = new Map<string, any>([
    ["比率", new PercentageStrategy()],
    ["成長率", new GrowthRateStrategy()],
    ["他科目連動", new ProportionateStrategy()],
    // ["計算", new CalculationStrategy()], // TODO: 実装を見直す
    ["子科目合計", new SubtotalStrategy()],
    ["参照", new ReferenceStrategy()],
  ]);

  static getStrategy(type: string): any {
    const strategy = this.strategies.get(type);

    if (!strategy) {
      throw new Error(`Unknown parameter type: ${type}`);
    }

    return strategy;
  }

  static registerStrategy(type: string, strategy: any): void {
    this.strategies.set(type, strategy);
  }

  static getSubtotalStrategy(): SubtotalStrategy {
    const strategy = this.strategies.get("子科目合計");
    if (!strategy || !(strategy instanceof SubtotalStrategy)) {
      throw new Error("SubtotalStrategy not found");
    }
    return strategy;
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
