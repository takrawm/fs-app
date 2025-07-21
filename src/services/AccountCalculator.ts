import type { Account, Parameter } from "../types/accountTypes";
import type { CalculationContext } from "../types/calculationTypes";

export class AccountCalculator {
  /**
   * 単一科目の計算を行う純粋関数
   * AccountModelのcalculateメソッドから移植するが、thisへの依存を排除
   */
  static calculate(
    account: Readonly<Account>,
    parameter: Parameter,
    context: CalculationContext
  ): number | null {
    switch (parameter.paramType) {
      case "GROWTH_RATE":
        const previousValue = context.getPreviousValue(account.id);
        const currentValue = previousValue * (1 + parameter.paramValue);
        return currentValue;

      case "PERCENTAGE":
        const baseValue = context.getValue(parameter.paramReferences.accountId);
        const value = baseValue * parameter.paramValue;
        return value;

      case "PROPORTIONATE":
        const propValue = context.getValue(parameter.paramReferences.accountId);
        return propValue;

      case "CALCULATION":
        const accountIds = parameter.paramReferences.map(
          (ref) => ref.accountId
        );
        const values = context.getBulkValues(accountIds);

        let result = 0;

        parameter.paramReferences.forEach((ref, index) => {
          const accountValue = values.get(ref.accountId) || 0;

          switch (ref.operation) {
            case "ADD":
              result += accountValue;
              break;
            case "SUB":
              result -= accountValue;
              break;
            case "MUL":
              result *= accountValue;
              break;
            case "DIV":
              if (accountValue !== 0) {
                result /= accountValue;
              }
              break;
          }
        });

        return result;

      case null:
        return null;

      default:
        const _exhaustive: never = parameter;
        throw new Error(
          `Unknown parameter type: ${(_exhaustive as any).paramType}`
        );
    }
  }

  /**
   * 計算結果の妥当性をチェックする純粋関数
   */
  static validateResult(result: number): boolean {
    return !isNaN(result) && isFinite(result);
  }

  /**
   * 依存関係が循環していないかチェックする純粋関数
   */
  static checkCircularDependency(
    accountId: string,
    parameter: Parameter,
    allParameters: ReadonlyMap<string, Parameter>,
    visited: Set<string> = new Set()
  ): boolean {
    if (visited.has(accountId)) {
      return true; // 循環依存を検出
    }

    visited.add(accountId);

    // 依存する科目IDを取得
    const dependencies = this.getDependencies(parameter);

    for (const depId of dependencies) {
      const depParameter = allParameters.get(depId);
      if (
        depParameter &&
        this.checkCircularDependency(
          depId,
          depParameter,
          allParameters,
          new Set(visited)
        )
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * パラメータから依存する科目IDを取得
   */
  private static getDependencies(parameter: Parameter): string[] {
    const deps: string[] = [];

    switch (parameter.paramType) {
      case "PERCENTAGE":
      case "PROPORTIONATE":
        if (parameter.paramReferences?.accountId) {
          deps.push(parameter.paramReferences.accountId);
        }
        break;

      case "CALCULATION":
        if (parameter.paramReferences) {
          deps.push(...parameter.paramReferences.map((ref) => ref.accountId));
        }
        break;
    }

    return deps;
  }
}
