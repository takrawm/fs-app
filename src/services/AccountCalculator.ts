import type { Account, Parameter } from "../types/accountTypes";
import type {
  CalculationContext,
  CalculationResult,
} from "../types/calculationTypes";

export class AccountCalculator {
  /**
   * 単一科目の計算を行う純粋関数
   * AccountModelのcalculateメソッドから移植するが、thisへの依存を排除
   */
  static calculate(
    account: Readonly<Account>,
    parameter: Parameter,
    context: CalculationContext
  ): CalculationResult | null {
    switch (parameter.paramType) {
      case "GROWTH_RATE":
        const previousValue = context.getPreviousValue(account.id);
        const currentValue = previousValue * (1 + parameter.paramValue);

        return {
          value: currentValue,
          formula: `${account.accountName}[前期] × (1 + ${(
            parameter.paramValue * 100
          ).toFixed(1)}%)`,
          references: [account.id],
        };

      case "PERCENTAGE":
        const baseValue = context.getValue(parameter.paramReferences.accountId);
        const value = baseValue * parameter.paramValue;

        return {
          value,
          formula: `[${parameter.paramReferences.accountId}] × ${(
            parameter.paramValue * 100
          ).toFixed(1)}%`,
          references: [parameter.paramReferences.accountId],
        };

      case "PROPORTIONATE":
        const propValue = context.getValue(parameter.paramReferences.accountId);

        return {
          value: propValue,
          formula: `[${parameter.paramReferences.accountId}]`,
          references: [parameter.paramReferences.accountId],
        };

      case "CALCULATION":
        const accountIds = parameter.paramReferences.map(
          (ref) => ref.accountId
        );
        const values = context.getBulkValues(accountIds);

        let result = 0;
        const formulaParts: string[] = [];

        parameter.paramReferences.forEach((ref, index) => {
          const accountValue = values.get(ref.accountId) || 0;

          switch (ref.operation) {
            case "ADD":
              result += accountValue;
              formulaParts.push(
                index === 0 ? ref.accountId : `+ ${ref.accountId}`
              );
              break;
            case "SUB":
              result -= accountValue;
              formulaParts.push(`- ${ref.accountId}`);
              break;
            case "MUL":
              result *= accountValue;
              formulaParts.push(`× ${ref.accountId}`);
              break;
            case "DIV":
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
          references: accountIds,
        };

      case "CONSTANT":
        return {
          value: parameter.paramValue,
          formula: `定数: ${parameter.paramValue}`,
          references: [],
        };

      case "DAYS":
        const baseAccountValue = context.getValue(
          parameter.paramReferences.accountId
        );
        const daysInPeriod = 30; // 月次の場合
        const daysValue =
          (baseAccountValue * parameter.paramValue) / daysInPeriod;

        return {
          value: daysValue,
          formula: `[${parameter.paramReferences.accountId}] × ${parameter.paramValue}日 / ${daysInPeriod}日`,
          references: [parameter.paramReferences.accountId],
        };

      case "MANUAL_INPUT":
        const manualValue = context.getValue(account.id);

        return {
          value: manualValue,
          formula: "手動入力",
          references: [],
        };

      case "CHILDREN_SUM":
        // 子科目の合計は別途DependencyResolverで処理されるため、ここでは0を返す
        return {
          value: 0,
          formula: "Σ(子科目)",
          references: [],
        };

      case "FORMULA":
        // カスタム計算式は別途実装
        return null;

      case "PERCENTAGE_OF_REVENUE":
        // 売上高科目を特定する処理が必要
        return null;

      case null:
        return null;

      default:
        const _exhaustive: never = parameter;
        throw new Error(
          `Unknown parameter type: ${(_exhaustive as any).paramType}`
        );
    }
  }

  // 古いメソッドは削除されました。新しい最適化されたcalculateメソッドを使用してください。

  // すべての古いメソッドは削除されました。
  // 新しい最適化されたcalculateメソッドがすべての計算タイプを統合して処理します。

  /**
   * 計算結果の妥当性をチェックする純粋関数
   */
  static validateResult(result: CalculationResult): boolean {
    return !isNaN(result.value) && isFinite(result.value);
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
      case "DAYS":
        if (parameter.paramReferences?.accountId) {
          deps.push(parameter.paramReferences.accountId);
        }
        break;

      case "CALCULATION":
        if (parameter.paramReferences) {
          deps.push(...parameter.paramReferences.map((ref) => ref.accountId));
        }
        break;

      case "FORMULA":
        if (parameter.paramReferences) {
          deps.push(...parameter.paramReferences);
        }
        break;
    }

    return deps;
  }
}
