// @ts-nocheck
// TODO: accountTypes.tsの型定義に合わせて修正が必要
// @ts-nocheck
// TODO: accountTypes.tsの型定義に合わせて修正が必要
import {
  Parameter,
  CalculationContext,
  CalculationResult,
  CalculationStrategy,
  PARAMETER_TYPES,
  OPERATIONS,
  isGrowthRateParameter,
  isChildrenSumParameter,
  isCalculationParameter,
  isPercentageParameter,
  isProportionateParameter,
} from "../types/accountTypes";

/** 成長率計算ストラテジー */
export class GrowthRateCalculationStrategy implements CalculationStrategy {
  constructor(private parameter: Parameter) {
    if (!isGrowthRateParameter(parameter)) {
      throw new Error(
        "Invalid parameter type for GrowthRateCalculationStrategy"
      );
    }
  }

  calculate(context: CalculationContext): CalculationResult {
    if (!isGrowthRateParameter(this.parameter)) {
      throw new Error("Invalid parameter type");
    }

    const previousValue = context.previousValues.get(context.accountId) || 0;
    const growthRate = this.parameter.paramValue;
    const currentValue = previousValue * (1 + growthRate);

    return {
      value: currentValue,
      formula: `${context.accountId}[t-1] × (1 + ${growthRate})`,
      references: [context.accountId],
    };
  }

  getRequiredReferences(): string[] {
    return []; // 自分自身の前期値のみ必要
  }

  validate(parameter: Parameter): boolean {
    return isGrowthRateParameter(parameter) && parameter.paramValue !== null;
  }
}

/** 比率計算ストラテジー */
export class PercentageCalculationStrategy implements CalculationStrategy {
  constructor(private parameter: Parameter) {
    if (!isPercentageParameter(parameter)) {
      throw new Error(
        "Invalid parameter type for PercentageCalculationStrategy"
      );
    }
  }

  calculate(context: CalculationContext): CalculationResult {
    if (!isPercentageParameter(this.parameter)) {
      throw new Error("Invalid parameter type");
    }

    const baseAccountId = this.parameter.paramReferences.accountId;
    const baseValue = context.accountValues.get(baseAccountId) || 0;
    const percentage = this.parameter.paramValue;
    const currentValue = baseValue * percentage;

    return {
      value: currentValue,
      formula: `${baseAccountId} × ${percentage}`,
      references: [baseAccountId],
    };
  }

  getRequiredReferences(): string[] {
    if (!isPercentageParameter(this.parameter)) {
      return [];
    }
    return [this.parameter.paramReferences.accountId];
  }

  validate(parameter: Parameter): boolean {
    return (
      isPercentageParameter(parameter) &&
      parameter.paramValue >= 0 &&
      parameter.paramReferences.accountId.length > 0
    );
  }
}

/** 連動計算ストラテジー */
export class ProportionateCalculationStrategy implements CalculationStrategy {
  constructor(private parameter: Parameter) {
    if (!isProportionateParameter(parameter)) {
      throw new Error(
        "Invalid parameter type for ProportionateCalculationStrategy"
      );
    }
  }

  calculate(context: CalculationContext): CalculationResult {
    if (!isProportionateParameter(this.parameter)) {
      throw new Error("Invalid parameter type");
    }

    const baseAccountId = this.parameter.paramReferences.accountId;
    const baseValue = context.accountValues.get(baseAccountId) || 0;

    return {
      value: baseValue,
      formula: baseAccountId,
      references: [baseAccountId],
    };
  }

  getRequiredReferences(): string[] {
    if (!isProportionateParameter(this.parameter)) {
      return [];
    }
    return [this.parameter.paramReferences.accountId];
  }

  validate(parameter: Parameter): boolean {
    return (
      isProportionateParameter(parameter) &&
      parameter.paramReferences.accountId.length > 0
    );
  }
}

/** 複数科目計算ストラテジー */
export class MultipleCalculationStrategy implements CalculationStrategy {
  constructor(private parameter: Parameter) {
    if (!isCalculationParameter(parameter)) {
      throw new Error("Invalid parameter type for MultipleCalculationStrategy");
    }
  }

  calculate(context: CalculationContext): CalculationResult {
    if (!isCalculationParameter(this.parameter)) {
      throw new Error("Invalid parameter type");
    }

    let result = 0;
    const formulaParts: string[] = [];
    const references: string[] = [];

    this.parameter.paramReferences.forEach((ref, index) => {
      const accountValue = context.accountValues.get(ref.accountId) || 0;
      references.push(ref.accountId);

      switch (ref.operation) {
        case OPERATIONS.ADD:
          result += accountValue;
          formulaParts.push(index === 0 ? ref.accountId : `+ ${ref.accountId}`);
          break;
        case OPERATIONS.SUB:
          result -= accountValue;
          formulaParts.push(`- ${ref.accountId}`);
          break;
        case OPERATIONS.MUL:
          result *= accountValue;
          formulaParts.push(`× ${ref.accountId}`);
          break;
        case OPERATIONS.DIV:
          if (accountValue !== 0) {
            result /= accountValue;
            formulaParts.push(`÷ ${ref.accountId}`);
          }
          break;
      }
    });

    return {
      value: result,
      formula: formulaParts.join(" "),
      references,
    };
  }

  getRequiredReferences(): string[] {
    if (!isCalculationParameter(this.parameter)) {
      return [];
    }
    return this.parameter.paramReferences.map((ref) => ref.accountId);
  }

  validate(parameter: Parameter): boolean {
    return (
      isCalculationParameter(parameter) && parameter.paramReferences.length > 0
    );
  }
}

/** 子科目合計計算ストラテジー */
export class ChildrenSumCalculationStrategy implements CalculationStrategy {
  constructor(private parameter: Parameter) {
    if (!isChildrenSumParameter(parameter)) {
      throw new Error(
        "Invalid parameter type for ChildrenSumCalculationStrategy"
      );
    }
  }

  calculate(context: CalculationContext): CalculationResult {
    // 子科目の合計ロジックは別途実装が必要
    // ここでは仮の実装
    return {
      value: 0,
      formula: "SUM(children)",
      references: [],
    };
  }

  getRequiredReferences(): string[] {
    return []; // 子科目は動的に決まる
  }

  validate(parameter: Parameter): boolean {
    return isChildrenSumParameter(parameter);
  }
}

/** ストラテジーファクトリー（パラメータに応じて適切なストラテジーを生成） */
export class CalculationStrategyFactory {
  static createStrategy(parameter: Parameter): CalculationStrategy | null {
    switch (parameter.paramType) {
      case PARAMETER_TYPES.GROWTH_RATE:
        return new GrowthRateCalculationStrategy(parameter);

      case PARAMETER_TYPES.PERCENTAGE:
        return new PercentageCalculationStrategy(parameter);

      case PARAMETER_TYPES.CALCULATION:
        return new MultipleCalculationStrategy(parameter);

      case PARAMETER_TYPES.PROPORTIONATE:
        return new ProportionateCalculationStrategy(parameter);

      case PARAMETER_TYPES.CHILDREN_SUM:
        return new ChildrenSumCalculationStrategy(parameter);

      default:
        return null;
    }
  }

  /** パラメータと計算コンテキストから直接計算を実行 */
  static execute(
    parameter: Parameter,
    context: CalculationContext
  ): CalculationResult | null {
    const strategy = this.createStrategy(parameter);

    if (!strategy) {
      console.warn(`Unsupported parameter type: ${parameter.paramType}`);
      return null;
    }

    if (!strategy.validate(parameter)) {
      console.error(
        `Invalid parameter configuration: ${JSON.stringify(parameter)}`
      );
      return null;
    }

    return strategy.calculate(context);
  }
}
