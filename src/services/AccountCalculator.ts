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
    context: Readonly<CalculationContext>
  ): CalculationResult | null {
    // パラメータタイプに応じた計算を実装
    switch (parameter.paramType) {
      case "GROWTH_RATE":
        return this.calculateGrowthRate(account, parameter, context);

      case "CHILDREN_SUM":
        return this.calculateChildrenSum(account, parameter, context);

      case "CALCULATION":
        return this.calculateFormula(account, parameter, context);

      case "PERCENTAGE":
        return this.calculatePercentage(account, parameter, context);

      case "PROPORTIONATE":
        return this.calculateProportionate(account, parameter, context);

      case "CONSTANT":
        return this.calculateConstant(account, parameter, context);

      case "DAYS":
        return this.calculateDays(account, parameter, context);

      case "MANUAL_INPUT":
        return this.calculateManualInput(account, parameter, context);

      case "FORMULA":
        return this.calculateCustomFormula(account, parameter, context);

      case "PERCENTAGE_OF_REVENUE":
        return this.calculatePercentageOfRevenue(account, parameter, context);

      case null:
        return null;

      default:
        // 型の完全性チェック
        const _exhaustive: never = parameter;
        throw new Error(
          `Unknown parameter type: ${(_exhaustive as any).paramType}`
        );
    }
  }

  /**
   * 成長率計算
   */
  private static calculateGrowthRate(
    account: Readonly<Account>,
    parameter: Parameter & { paramType: "GROWTH_RATE" },
    context: Readonly<CalculationContext>
  ): CalculationResult {
    const previousValue = context.previousValues.get(account.id) || 0;
    const currentValue = previousValue * (1 + parameter.paramValue);

    return {
      value: currentValue,
      formula: `${account.accountName}[前期] × (1 + ${(
        parameter.paramValue * 100
      ).toFixed(1)}%)`,
      references: [account.id],
    };
  }

  /**
   * 子科目合計計算
   */
  private static calculateChildrenSum(
    account: Readonly<Account>,
    parameter: Parameter & { paramType: "CHILDREN_SUM" },
    context: Readonly<CalculationContext>
  ): CalculationResult {
    // contextから全ての勘定科目の情報にアクセスする必要があるため、
    // 一時的に簡単な実装にする（実際の実装では、全accountsへのアクセスが必要）
    let sum = 0;
    const references: string[] = [];

    // contextのaccountValuesから、この科目の子科目を探して合計
    // TODO: 実際の実装では、全accountsリストにアクセスして子科目を特定する必要がある
    // 現在は簡易実装として、科目IDパターンに基づいて子科目を推定
    for (const [accountId, value] of context.accountValues) {
      if (
        accountId.startsWith(`${account.id}-child-`) ||
        accountId.startsWith(`${account.id}_`)
      ) {
        sum += value;
        references.push(accountId);
      }
    }

    return {
      value: sum,
      formula: `Σ(子科目)`,
      references,
    };
  }

  /**
   * 計算式（複数科目の演算）
   */
  private static calculateFormula(
    _account: Readonly<Account>,
    parameter: Parameter & { paramType: "CALCULATION" },
    context: Readonly<CalculationContext>
  ): CalculationResult {
    let result = 0;
    const formulaParts: string[] = [];
    const references: string[] = [];

    parameter.paramReferences.forEach((ref, index) => {
      const accountValue = context.accountValues.get(ref.accountId) || 0;
      references.push(ref.accountId);

      switch (ref.operation) {
        case "ADD":
          result += accountValue;
          formulaParts.push(index === 0 ? ref.accountId : `+ ${ref.accountId}`);
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
      references,
    };
  }

  /**
   * 比率計算
   */
  private static calculatePercentage(
    account: Readonly<Account>,
    parameter: Parameter & { paramType: "PERCENTAGE" },
    context: Readonly<CalculationContext>
  ): CalculationResult {
    const baseValue =
      context.accountValues.get(parameter.paramReferences.accountId) || 0;
    const value = baseValue * parameter.paramValue;

    return {
      value,
      formula: `[${parameter.paramReferences.accountId}] × ${(
        parameter.paramValue * 100
      ).toFixed(1)}%`,
      references: [parameter.paramReferences.accountId],
    };
  }

  /**
   * 連動計算
   */
  private static calculateProportionate(
    account: Readonly<Account>,
    parameter: Parameter & { paramType: "PROPORTIONATE" },
    context: Readonly<CalculationContext>
  ): CalculationResult {
    const value =
      context.accountValues.get(parameter.paramReferences.accountId) || 0;

    return {
      value,
      formula: `[${parameter.paramReferences.accountId}]`,
      references: [parameter.paramReferences.accountId],
    };
  }

  /**
   * 定数計算
   */
  private static calculateConstant(
    _account: Readonly<Account>,
    parameter: Parameter & { paramType: "CONSTANT" },
    context: Readonly<CalculationContext>
  ): CalculationResult {
    return {
      value: parameter.paramValue,
      formula: `定数: ${parameter.paramValue}`,
      references: [],
    };
  }

  /**
   * 日数計算
   */
  private static calculateDays(
    _account: Readonly<Account>,
    parameter: Parameter & { paramType: "DAYS" },
    context: Readonly<CalculationContext>
  ): CalculationResult {
    const baseValue =
      context.accountValues.get(parameter.paramReferences.accountId) || 0;
    const daysInPeriod = 30; // デフォルト値
    const value = (baseValue * parameter.paramValue) / daysInPeriod;

    return {
      value,
      formula: `[${parameter.paramReferences.accountId}] × ${parameter.paramValue}日 / ${daysInPeriod}日`,
      references: [parameter.paramReferences.accountId],
    };
  }

  /**
   * 手動入力
   */
  private static calculateManualInput(
    account: Readonly<Account>,
    parameter: Parameter & { paramType: "MANUAL_INPUT" },
    context: Readonly<CalculationContext>
  ): CalculationResult {
    const manualValue = context.accountValues.get(account.id);
    const value =
      manualValue !== undefined ? manualValue : parameter.paramValue || 0;

    return {
      value,
      formula:
        manualValue !== undefined
          ? "手動入力"
          : `デフォルト値: ${parameter.paramValue || 0}`,
      references: [],
    };
  }

  /**
   * カスタム計算式
   */
  private static calculateCustomFormula(
    _account: Readonly<Account>,
    parameter: Parameter & { paramType: "FORMULA" },
    _context: Readonly<CalculationContext>
  ): CalculationResult {
    // 簡易的な実装（実際にはASTパーサーを使用）
    let value = 0;
    const references = parameter.paramReferences || [];

    // SUM(children)などの特殊な計算式の処理
    if (parameter.paramValue === "SUM(children)") {
      // 子科目の合計（実装は省略）
      value = 0;
    }

    return {
      value,
      formula: parameter.paramValue,
      references,
    };
  }

  /**
   * 売上比率計算
   */
  private static calculatePercentageOfRevenue(
    _account: Readonly<Account>,
    parameter: Parameter & { paramType: "PERCENTAGE_OF_REVENUE" },
    context: Readonly<CalculationContext>
  ): CalculationResult {
    // 売上高科目を探す（簡易的な実装）
    let revenueValue = 0;
    let revenueAccountId = "";

    for (const [accountId, value] of context.accountValues) {
      if (accountId.includes("revenue") || accountId.includes("sales")) {
        revenueValue = value;
        revenueAccountId = accountId;
        break;
      }
    }

    const value = revenueValue * parameter.paramValue;

    return {
      value,
      formula: `売上高 × ${(parameter.paramValue * 100).toFixed(1)}%`,
      references: revenueAccountId ? [revenueAccountId] : [],
    };
  }

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
