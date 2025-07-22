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
    // === 特別な計算ロジック（パラメータベースの計算より優先） ===

    // 1. 利益剰余金の特別計算
    if (account.id === "equity-retained-earnings") {
      return this.calculateRetainedEarnings(account, context);
    }

    // 2. BS科目でADJUSTMENTターゲットになっている場合の残高計算
    if (
      account.sheet === "BS" &&
      this.isAdjustmentTarget(account.id, context)
    ) {
      return this.calculateBSBalance(account, context);
    }

    // 3. 親子計算（サマリー科目でparamTypeがnullの場合）
    if (account.isSummaryAccount && parameter.paramType === null) {
      return this.calculateChildrenSum(account, context);
    }

    // === 通常のパラメータベースの計算 ===
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

        parameter.paramReferences.forEach((ref) => {
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

  /**
   * 利益剰余金の計算（前期末残高 + 基礎利益の合計）
   */
  private static calculateRetainedEarnings(
    account: Readonly<Account>,
    context: CalculationContext
  ): number {
    const previousBalance = context.getPreviousValue(account.id);
    const baseProfitSum = this.getBaseProfitSum(context);
    return previousBalance + baseProfitSum;
  }

  /**
   * BS科目の残高計算（前期末残高 + 関連フロー科目の当期発生額）
   */
  private static calculateBSBalance(
    account: Readonly<Account>,
    context: CalculationContext
  ): number {
    const previousBalance = context.getPreviousValue(account.id);
    const flowAdjustmentSum = this.getFlowAdjustmentSum(account.id, context);
    return previousBalance + flowAdjustmentSum;
  }

  /**
   * 親科目の子科目合計計算
   */
  private static calculateChildrenSum(
    parentAccount: Readonly<Account>,
    context: CalculationContext
  ): number {
    return this.getChildrenSum(parentAccount.id, context);
  }

  /**
   * 指定されたBS科目がADJUSTMENTのターゲットかどうかを判定
   */
  private static isAdjustmentTarget(
    accountId: string,
    context: CalculationContext
  ): boolean {
    // この判定は現在のcontextでは直接実装が困難なため、
    // 暫定的にfalseを返し、後でCalculationContextを拡張する
    return this.hasFlowAdjustments(accountId, context);
  }

  /**
   * isBaseProfitがtrueの科目の合計を取得
   */
  private static getBaseProfitSum(context: CalculationContext): number {
    // CalculationContextを拡張してこの情報を取得する機能を追加する必要がある
    // 暫定的に0を返す
    if (
      "getBaseProfitSum" in context &&
      typeof context.getBaseProfitSum === "function"
    ) {
      return (context as any).getBaseProfitSum();
    }
    console.warn("[AccountCalculator] getBaseProfitSum not available");
    return 0;
  }

  /**
   * 指定されたターゲット科目に対するフロー科目の調整合計を取得
   */
  private static getFlowAdjustmentSum(
    targetAccountId: string,
    context: CalculationContext
  ): number {
    // CalculationContextを拡張してこの情報を取得する機能を追加する必要がある
    // 暫定的に0を返す
    if (
      "getFlowAdjustmentSum" in context &&
      typeof context.getFlowAdjustmentSum === "function"
    ) {
      return (context as any).getFlowAdjustmentSum(targetAccountId);
    }
    console.warn(
      `[AccountCalculator] getFlowAdjustmentSum not available for ${targetAccountId}`
    );
    return 0;
  }

  /**
   * 指定された親科目の子科目合計を取得
   */
  private static getChildrenSum(
    parentAccountId: string,
    context: CalculationContext
  ): number {
    // CalculationContextを拡張してこの情報を取得する機能を追加する必要がある
    // 暫定的に0を返す
    if (
      "getChildrenSum" in context &&
      typeof context.getChildrenSum === "function"
    ) {
      return (context as any).getChildrenSum(parentAccountId);
    }
    console.warn(
      `[AccountCalculator] getChildrenSum not available for ${parentAccountId}`
    );
    return 0;
  }

  /**
   * 指定されたBS科目にフロー科目からの調整があるかどうかを判定
   */
  private static hasFlowAdjustments(
    targetAccountId: string,
    context: CalculationContext
  ): boolean {
    // CalculationContextを拡張してこの情報を取得する機能を追加する必要がある
    // 暫定的にfalseを返す
    if (
      "hasFlowAdjustments" in context &&
      typeof context.hasFlowAdjustments === "function"
    ) {
      return (context as any).hasFlowAdjustments(targetAccountId);
    }
    return false;
  }
}
