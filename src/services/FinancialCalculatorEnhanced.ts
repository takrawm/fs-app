import type { Account, Parameter } from "../types/accountTypes";
import type { FinancialValue } from "../types/financialValueTypes";
import type {
  CalculationContext,
  CalculationError,
} from "../types/calculationTypes";
import type { CalculationStrategy } from "./calculation/CalculationStrategy";

import { DependencyResolverEnhanced } from "./DependencyResolverEnhanced";
import { GrowthRateStrategy } from "./calculation/GrowthRateStrategy";
import { PercentageStrategy } from "./calculation/PercentageStrategy";
import { ProportionateStrategy } from "./calculation/ProportionateStrategy";
import { MultipleCalculationStrategy } from "./calculation/MultipleCalculationStrategy";
import { isNullParameter } from "../types/accountTypes";

/**
 * 拡張版の財務計算クラス
 * ストラテジーパターンを使用して各種計算を実行
 */
export class FinancialCalculatorEnhanced {
  /**
   * 計算ストラテジー
   */
  private static strategies: CalculationStrategy[] = [
    new GrowthRateStrategy(),
    new PercentageStrategy(),
    new ProportionateStrategy(),
    new MultipleCalculationStrategy(),
  ];

  /**
   * 期間の全科目を計算する純粋関数
   */
  static calculatePeriod(
    accounts: ReadonlyArray<Account>,
    periodId: string,
    context: CalculationContext,
    parameters: ReadonlyMap<string, Parameter>
  ): {
    results: Map<string, number>;
    calculatedValues: Map<string, FinancialValue>;
    errors: CalculationError[];
  } {
    const results = new Map<string, number>();
    const calculatedValues = new Map<string, FinancialValue>();
    const errors: CalculationError[] = [];

    try {
      // 1. 依存関係を解決（DependencyResolverEnhanced使用）
      const sortedAccountIds = DependencyResolverEnhanced.resolveDependencies(
        accounts,
        parameters
      );

      console.log(`[FinancialCalculatorEnhanced] Calculating ${sortedAccountIds.length} accounts for period ${periodId}`);

      // 2. アカウントマップを事前構築
      const accountMap = new Map(accounts.map((a) => [a.id, a]));

      // 3. 各科目の計算（ループは1回のみ）
      for (const accountId of sortedAccountIds) {
        const account = accountMap.get(accountId);
        if (!account) continue;

        const parameter = parameters.get(accountId);
        if (!parameter) continue;

        try {
          const result = this.calculateAccount(
            account,
            parameter,
            context,
            accountId
          );

          if (result !== null) {
            results.set(accountId, result);

            // 計算結果を即座にcontextに反映
            if (
              "setValue" in context &&
              typeof context.setValue === "function"
            ) {
              context.setValue(accountId, periodId, result);
            }

            // FinancialValueとして保存
            const financialValue: FinancialValue = {
              accountId,
              periodId,
              value: result,
              isCalculated: true,
            };
            calculatedValues.set(`${accountId}_${periodId}`, financialValue);
          }
        } catch (error) {
          const calculationError: CalculationError = {
            accountId,
            periodId,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          };
          errors.push(calculationError);

          // エラーが発生した場合は0として続行
          results.set(accountId, 0);
          if (
            "setValue" in context &&
            typeof context.setValue === "function"
          ) {
            context.setValue(accountId, periodId, 0);
          }
        }
      }
    } catch (error) {
      // 依存関係解決エラー
      const globalError: CalculationError = {
        accountId: "global",
        periodId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      };
      errors.push(globalError);
    }

    console.log(`[FinancialCalculatorEnhanced] Calculation completed. Results: ${results.size}, Errors: ${errors.length}`);

    return {
      results,
      calculatedValues,
      errors,
    };
  }

  /**
   * 単一科目を計算
   */
  private static calculateAccount(
    account: Account,
    parameter: Parameter,
    context: CalculationContext,
    accountId: string
  ): number | null {
    // NullParameterの場合は0を返す
    if (isNullParameter(parameter)) {
      return 0;
    }

    // 適用可能なストラテジーを探す
    for (const strategy of this.strategies) {
      if (strategy.isApplicable(parameter)) {
        // パラメータの妥当性を検証
        if (!strategy.validate(parameter)) {
          throw new Error(
            `Invalid parameter for ${strategy.name} strategy on account ${account.accountName}`
          );
        }

        // 計算を実行
        return strategy.calculate(parameter, context, accountId);
      }
    }

    // 適用可能なストラテジーがない場合
    throw new Error(
      `No applicable calculation strategy for parameter type: ${parameter.paramType}`
    );
  }

  /**
   * ストラテジーを追加（拡張用）
   */
  static addStrategy(strategy: CalculationStrategy): void {
    this.strategies.push(strategy);
  }

  /**
   * ストラテジーをクリア（テスト用）
   */
  static clearStrategies(): void {
    this.strategies = [];
  }

  /**
   * デフォルトストラテジーをリセット
   */
  static resetToDefaultStrategies(): void {
    this.strategies = [
      new GrowthRateStrategy(),
      new PercentageStrategy(),
      new ProportionateStrategy(),
      new MultipleCalculationStrategy(),
    ];
  }

  /**
   * 計算結果の検証を行う純粋関数
   */
  static validateResults(
    results: ReadonlyMap<string, number>,
    accounts: ReadonlyArray<Account>
  ): {
    isValid: boolean;
    validationErrors: string[];
  } {
    const validationErrors: string[] = [];

    // すべての科目が計算されているか確認
    for (const account of accounts) {
      if (!results.has(account.id)) {
        validationErrors.push(
          `Account ${account.id} (${account.accountName}) was not calculated`
        );
      }
    }

    // 計算結果の妥当性チェック
    for (const [accountId, result] of results) {
      if (isNaN(result) || !isFinite(result)) {
        validationErrors.push(
          `Account ${accountId} has invalid value: ${result}`
        );
      }
    }

    return {
      isValid: validationErrors.length === 0,
      validationErrors,
    };
  }
}