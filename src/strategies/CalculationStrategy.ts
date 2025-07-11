import { CalculationStrategy as BaseCalculationStrategy } from "./base/CalculationStrategy";
import type { ParameterConfig, CalculationContext } from "../types/parameter";
import type { CalculationResult } from "../types/financial";

export class CalculationStrategy extends BaseCalculationStrategy {
  readonly type = "計算" as const;

  calculate(
    accountId: string,
    config: ParameterConfig,
    context: CalculationContext
  ): CalculationResult {
    if (config.type !== "計算") {
      throw new Error("Invalid parameter config type");
    }

    let value = 0;
    const dependencies: string[] = [];
    const formulaParts: string[] = [];

    for (const reference of config.references) {
      const refValue = this.getValue(reference.id, context);
      dependencies.push(reference.id);
      
      switch (reference.operation) {
        case "+":
          value += refValue;
          formulaParts.push(`+ [${reference.id}]`);
          break;
        case "-":
          value -= refValue;
          formulaParts.push(`- [${reference.id}]`);
          break;
        case "*":
          value *= refValue;
          formulaParts.push(`× [${reference.id}]`);
          break;
        case "/":
          if (refValue !== 0) {
            value /= refValue;
            formulaParts.push(`÷ [${reference.id}]`);
          }
          break;
      }
    }

    const formula = formulaParts.join(" ");

    return this.createResult(
      accountId,
      context.currentPeriodId,
      value,
      formula,
      dependencies
    );
  }
}