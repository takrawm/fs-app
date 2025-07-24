import type { Account, Parameter } from "../types/accountTypes";
import type { CalculationContext } from "../types/calculationTypes";
import { isBSAccount, isSummaryAccount } from "../types/accountTypes";

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
      console.log(
        `[AccountCalculator] 利益剰余金の特別計算を開始: ${account.accountName}`
      );
      return this.calculateRetainedEarnings(account, context);
    }

    // 2. BS科目でADJUSTMENTターゲットになっている場合の残高計算
    if (isBSAccount(account) && this.hasFlowAdjustments(account.id, context)) {
      console.log(
        `[AccountCalculator] BS科目の残高計算を開始: ${account.accountName} (${account.id})`
      );
      return this.calculateBSBalance(account, context);
    }

    // 3. フロー科目に基づくCF科目の特別計算
    if (
      account.sheet === "CF" &&
      account.id.startsWith("cf_") &&
      this.isFlowBasedCFAccount(account, context)
    ) {
      console.log(
        `[AccountCalculator] フロー科目に基づくCF科目の特別計算を開始: ${account.accountName}`
      );
      return this.calculateFlowBasedCFAccount(account, context);
    }

    // 4. 親子計算（サマリー科目でparamTypeがnullの場合）
    if (isSummaryAccount(account) && parameter.paramType === null) {
      console.log(
        `[AccountCalculator] サマリー科目の子科目合計計算: ${account.accountName}`
      );
      return this.calculateChildrenSum(account, context);
    }

    // === 通常のパラメータベースの計算 ===
    console.log(
      `[AccountCalculator] 通常計算 ${parameter.paramType}: ${account.accountName}`
    );

    switch (parameter.paramType) {
      case "GROWTH_RATE":
        const previousValue = context.getPreviousValue(account.id);
        const currentValue = previousValue * (1 + parameter.paramValue);
        console.log(
          `[AccountCalculator] GROWTH_RATE計算: ${account.accountName}, 前期: ${previousValue}, 成長率: ${parameter.paramValue}, 結果: ${currentValue}`
        );
        return currentValue;

      case "PERCENTAGE":
        const baseValue = context.getValue(parameter.paramReferences.accountId);
        const value = baseValue * parameter.paramValue;
        console.log(
          `[AccountCalculator] PERCENTAGE計算: ${account.accountName}, 基準値: ${baseValue}, 比率: ${parameter.paramValue}, 結果: ${value}`
        );
        return value;

      case "PROPORTIONATE":
        const referenceAccountId = parameter.paramReferences.accountId;
        const currentRefValue = context.getValue(referenceAccountId);
        const previousRefValue = context.getPreviousValue(referenceAccountId);
        const currentAccountValue = context.getPreviousValue(account.id);

        // 参照科目の成長率を計算（今年度 / 前年度）
        const growthRatio =
          previousRefValue !== 0 ? currentRefValue / previousRefValue : 1;

        // 当該科目の前年度値に成長率を適用
        const propValue = currentAccountValue * growthRatio;

        console.log(
          `[AccountCalculator] PROPORTIONATE計算: ${account.accountName}, 連動先: ${referenceAccountId}, 参照科目現在値: ${currentRefValue}, 参照科目前年度値: ${previousRefValue}, 成長率: ${growthRatio}, 当該科目前年度値: ${currentAccountValue}, 結果: ${propValue}`
        );
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

        console.log(
          `[AccountCalculator] CALCULATION計算: ${account.accountName}, 参照科目数: ${accountIds.length}, 結果: ${result}`
        );
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
    const baseProfit = this.getBaseProfit(context);
    const result = previousBalance + baseProfit;

    console.log(
      `[AccountCalculator] 利益剰余金計算詳細: 前期末残高=${previousBalance}, 基礎利益=${baseProfit}, 結果=${result}`
    );
    return result;
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
    const result = previousBalance + flowAdjustmentSum;

    console.log(
      `[AccountCalculator] BS残高計算詳細 ${account.accountName}: 前期末残高=${previousBalance}, フロー調整合計=${flowAdjustmentSum}, 結果=${result}`
    );
    return result;
  }

  /**
   * 親科目の子科目合計計算
   */
  private static calculateChildrenSum(
    parentAccount: Readonly<Account>,
    context: CalculationContext
  ): number {
    const result = this.getChildrenSum(parentAccount.id, context);
    console.log(
      `[AccountCalculator] 子科目合計計算 ${parentAccount.accountName}: 結果=${result}`
    );
    return result;
  }

  /**
   * isBaseProfitがtrueの科目の合計を取得
   */
  private static getBaseProfit(context: CalculationContext): number {
    return context.getBaseProfit();
  }

  /**
   * 指定されたターゲット科目に対するフロー科目の調整合計を取得
   */
  private static getFlowAdjustmentSum(
    targetAccountId: string,
    context: CalculationContext
  ): number {
    return context.getFlowAdjustmentSum(targetAccountId);
  }

  /**
   * 指定された親科目の子科目合計を取得
   */
  private static getChildrenSum(
    parentAccountId: string,
    context: CalculationContext
  ): number {
    return context.getChildrenSum(parentAccountId);
  }

  /**
   * 指定されたBS科目にフロー科目からの調整があるかどうかを判定
   */
  private static hasFlowAdjustments(
    targetAccountId: string,
    context: CalculationContext
  ): boolean {
    return context.hasFlowAdjustments(targetAccountId);
  }

  /**
   * フロー科目に基づくCF科目かどうかを判定
   * createFlowCfAccountで作成されたCF科目のみが対象
   */
  private static isFlowBasedCFAccount(
    account: Readonly<Account>,
    context: CalculationContext
  ): boolean {
    // CF科目のIDから元のフロー科目のIDを取得（cf_プレフィックスを除去）
    const originalFlowAccountId = account.id.replace("cf_", "");

    // 元のフロー科目の情報を取得
    const originalFlowAccount = context.getAccount(originalFlowAccountId);
    if (!originalFlowAccount) {
      return false;
    }

    // フロー科目（PL、PPE、FINANCING）で明細科目であることを確認
    const isFlowSheet =
      originalFlowAccount.sheet === "PL" ||
      originalFlowAccount.sheet === "PPE" ||
      originalFlowAccount.sheet === "FINANCING";

    const isDetailAccount = !originalFlowAccount.isSummaryAccount;

    // flowAccountCfImpactが存在し、ADJUSTMENTタイプであることを確認
    const hasAdjustmentImpact =
      originalFlowAccount.flowAccountCfImpact &&
      originalFlowAccount.flowAccountCfImpact.type === "ADJUSTMENT";

    return isFlowSheet && isDetailAccount && hasAdjustmentImpact;
  }

  /**
   * フロー科目に基づくCF科目の計算
   * 元のフロー科目の値に基づいて符号を決定
   */
  private static calculateFlowBasedCFAccount(
    account: Readonly<Account>,
    context: CalculationContext
  ): number {
    // CF科目のIDから元のフロー科目のIDを取得（cf_プレフィックスを除去）
    const originalFlowAccountId = account.id.replace("cf_", "");

    // 元のフロー科目の値を取得
    const originalFlowValue = context.getValue(originalFlowAccountId);

    // 元のフロー科目の情報を取得
    const originalFlowAccount = context.getAccount(originalFlowAccountId);
    if (!originalFlowAccount) {
      console.warn(
        `[AccountCalculator] CF科目計算エラー: 元のフロー科目が見つかりません: ${originalFlowAccountId}`
      );
      return 0;
    }

    // flowAccountCfImpactがADJUSTMENTでない場合は0を返す
    if (
      !originalFlowAccount.flowAccountCfImpact ||
      originalFlowAccount.flowAccountCfImpact.type !== "ADJUSTMENT"
    ) {
      console.log(
        `[AccountCalculator] CF科目計算: ${account.accountName}, 元科目: ${originalFlowAccountId}, ADJUSTMENTではないため0を返す`
      );
      return 0;
    }

    const adjustment = originalFlowAccount.flowAccountCfImpact.adjustment;
    const targetAccountId = adjustment.targetId;
    const operation = adjustment.operation;

    // ターゲットBS科目の情報を取得
    const targetAccount = context.getAccount(targetAccountId);
    if (!targetAccount) {
      console.warn(
        `[AccountCalculator] CF科目計算エラー: ターゲットBS科目が見つかりません: ${targetAccountId}`
      );
      return 0;
    }

    // 符号を決定
    let cfValue: number;
    const isTargetCredit = targetAccount.isCredit;

    if (isTargetCredit === false) {
      // ターゲットが借方科目（isCredit: false）の場合
      // 符号はoperationと逆転
      cfValue = operation === "ADD" ? -originalFlowValue : originalFlowValue;
    } else if (isTargetCredit === true) {
      // ターゲットが貸方科目（isCredit: true）の場合
      // 符号はoperationと一致
      cfValue = operation === "ADD" ? originalFlowValue : -originalFlowValue;
    } else {
      // isCreditがnullの場合（CF科目など）
      console.warn(
        `[AccountCalculator] CF科目計算エラー: ターゲット科目のisCreditがnull: ${targetAccountId}`
      );
      return 0;
    }

    console.log(
      `[AccountCalculator] CF科目計算: ${account.accountName}, 元科目: ${originalFlowAccountId}, 元科目値: ${originalFlowValue}, ターゲット: ${targetAccountId} (isCredit: ${isTargetCredit}), 操作: ${operation}, CF値: ${cfValue}`
    );

    return cfValue;
  }
}
