import type { Parameter } from "../types/accountTypes";
import { PARAMETER_TYPES, OPERATIONS } from "../types/accountTypes";
import type {
  CalculationContext,
  CalculationResult,
  CalculationStrategy,
} from "../types/calculationTypes";

// 型ガード関数の定義
function isGrowthRateParameter(
  param: Parameter
): param is Extract<
  Parameter,
  { paramType: typeof PARAMETER_TYPES.GROWTH_RATE }
> {
  return param.paramType === PARAMETER_TYPES.GROWTH_RATE;
}

function isCalculationParameter(
  param: Parameter
): param is Extract<
  Parameter,
  { paramType: typeof PARAMETER_TYPES.CALCULATION }
> {
  return param.paramType === PARAMETER_TYPES.CALCULATION;
}

function isPercentageParameter(
  param: Parameter
): param is Extract<
  Parameter,
  { paramType: typeof PARAMETER_TYPES.PERCENTAGE }
> {
  return param.paramType === PARAMETER_TYPES.PERCENTAGE;
}

function isProportionateParameter(
  param: Parameter
): param is Extract<
  Parameter,
  { paramType: typeof PARAMETER_TYPES.PROPORTIONATE }
> {
  return param.paramType === PARAMETER_TYPES.PROPORTIONATE;
}

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

    // accountIdは引数として別途渡す必要がある
    const accountId = ""; // TODO: accountIdをコンテキストに追加するか、引数として渡す
    const previousValue = context.getPreviousValue(accountId) || 0;
    const growthRate = this.parameter.paramValue;
    const currentValue = previousValue * (1 + growthRate);

    return {
      value: currentValue,
      formula: `${accountId}[t-1] × (1 + ${growthRate})`,
      references: [accountId],
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
    const baseValue = context.getValue(baseAccountId) || 0;
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
    const baseValue = context.getValue(baseAccountId) || 0;

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
      const accountValue = context.getValue(ref.accountId) || 0;
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
