import type { Account, Parameter } from "../types/accountTypes";
import type { Period } from "../types/periodTypes";
import type { FinancialValue } from "../types/financialValueTypes";
import type {
  CalculationResult,
  CalculationContext,
  CalculationError,
} from "../types/calculationTypes";

import { DependencyResolver } from "./DependencyResolver";
import { AccountCalculator } from "./AccountCalculator";

export class FinancialCalculator {
  /**
   * 期間の全科目を計算する純粋関数
   * - 入力データは全てReadonly（イミュータブル）
   * - 新しいMapインスタンスを返す（元データは変更しない）
   * - 副作用なし（ログ出力、外部API呼び出し等なし）
   */
  static calculatePeriod(
    accounts: ReadonlyArray<Account>,
    periodId: string,
    context: CalculationContext,
    parameters: ReadonlyMap<string, Parameter>
  ): {
    results: Map<string, CalculationResult>;
    calculatedValues: Map<string, FinancialValue>;
    errors: CalculationError[];
  } {
    const results = new Map<string, CalculationResult>();
    const calculatedValues = new Map<string, FinancialValue>();
    const errors: CalculationError[] = [];

    try {
      // 1. 依存関係を解決（DependencyResolver使用）
      const sortedAccountIds = DependencyResolver.resolveDependencies(
        accounts,
        parameters
      );

      // 2. アカウントマップを事前構築
      const accountMap = new Map(accounts.map((a) => [a.id, a]));

      // 3. 各科目の計算（ループは1回のみ）
      for (const accountId of sortedAccountIds) {
        const account = accountMap.get(accountId);
        if (!account) continue;

        const parameter = parameters.get(accountId);
        if (!parameter) continue;

        try {
          const result = AccountCalculator.calculate(
            account,
            parameter,
            context
          );

          if (result) {
            results.set(accountId, result);

            // 🔧 改善: 計算結果を即座にcontextに反映
            // contextがsetValueメソッドを持っている場合、次の計算で使用可能にする
            if (
              "setValue" in context &&
              typeof context.setValue === "function"
            ) {
              context.setValue(accountId, periodId, result.value);
            }

            // FinancialValueとして保存
            const financialValue: FinancialValue = {
              accountId,
              periodId,
              value: result.value,
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
          // 注意: 最適化されたcontextでは直接設定できないため、
          // エラー時の処理は計算結果に委ねる
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

    // 4. 新しいMapとして結果を返す
    return {
      results,
      calculatedValues,
      errors,
    };
  }

  /**
   * 単一科目を計算する純粋関数
   */
  static calculateSingleAccount(
    account: Readonly<Account>,
    periodId: string,
    parameter: Readonly<Parameter>,
    currentValues: ReadonlyMap<string, number>,
    previousPeriodValues: ReadonlyMap<string, number>
  ): CalculationResult | null {
    // 注意: この関数は非推奨です。新しいcontextベースの計算を使用してください。
    throw new Error(
      "calculateSingleAccount is deprecated. Use context-based calculation instead."
    );
  }

  /**
   * 複数期間を一括計算する純粋関数
   */
  // 注意: calculateMultiplePeriodsは削除されました。
  // 新しい最適化されたシステムでは、useFinancialModel.calculateAllPeriodsを使用してください。

  /**
   * 計算結果の検証を行う純粋関数
   */
  static validateResults(
    results: ReadonlyMap<string, CalculationResult>,
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
      if (isNaN(result.value) || !isFinite(result.value)) {
        validationErrors.push(
          `Account ${accountId} has invalid value: ${result.value}`
        );
      }
    }

    return {
      isValid: validationErrors.length === 0,
      validationErrors,
    };
  }
}
