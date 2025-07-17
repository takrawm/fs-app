import type { Account, Parameter } from "../types/accountTypes";
import type { Period } from "../types/periodTypes";
import type { FinancialValue } from "../types/financialValueTypes";
import type {
  CalculationResult,
  CalculationContext,
  CalculationError,
} from "../types/calculationTypes";
import type { AccountRelation } from "../types/relationTypes";
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
    currentValues: ReadonlyMap<string, number>,
    previousPeriodValues: ReadonlyMap<string, number>,
    parameters: ReadonlyMap<string, Parameter>,
    relations: ReadonlyArray<AccountRelation>
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
        parameters,
        relations
      );

      // 2. トポロジカルソート順に計算
      const context: CalculationContext = {
        accountId: "", // 各アカウント計算時に設定
        periodId,
        accountValues: new Map(currentValues),
        previousValues: new Map(previousPeriodValues),
      };

      for (const accountId of sortedAccountIds) {
        const account = accounts.find((a) => a.id === accountId);
        if (!account) continue;

        const parameter = parameters.get(accountId);
        if (!parameter) continue;

        try {
          // 3. 各科目の計算（AccountCalculator使用）
          const result = AccountCalculator.calculate(
            account,
            parameter,
            context,
            relations
          );

          if (result) {
            results.set(accountId, result);

            // 計算結果をcontextに反映（次の計算で使用）
            context.accountValues.set(accountId, result.value);

            // FinancialValueとして保存
            const financialValue: FinancialValue = {
              id: `${accountId}_${periodId}`,
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
          context.accountValues.set(accountId, 0);
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
    previousPeriodValues: ReadonlyMap<string, number>,
    relations: ReadonlyArray<AccountRelation>
  ): CalculationResult | null {
    const context: CalculationContext = {
      accountId: account.id,
      periodId,
      accountValues: new Map(currentValues),
      previousValues: new Map(previousPeriodValues),
    };

    return AccountCalculator.calculate(account, parameter, context, relations);
  }

  /**
   * 複数期間を一括計算する純粋関数
   */
  static calculateMultiplePeriods(
    accounts: ReadonlyArray<Account>,
    periods: ReadonlyArray<Period>,
    initialValues: ReadonlyMap<string, number>,
    parameters: ReadonlyMap<string, Parameter>,
    relations: ReadonlyArray<AccountRelation>
  ): {
    allResults: Map<string, Map<string, CalculationResult>>;
    allValues: Map<string, Map<string, FinancialValue>>;
    allErrors: Map<string, CalculationError[]>;
  } {
    const allResults = new Map<string, Map<string, CalculationResult>>();
    const allValues = new Map<string, Map<string, FinancialValue>>();
    const allErrors = new Map<string, CalculationError[]>();

    let previousValues = new Map(initialValues);

    // 期間を順番に計算
    for (const period of periods) {
      const currentValues = new Map<string, number>();

      // 手動入力値や定数など、期間に依存しない値を設定
      for (const account of accounts) {
        const parameter = parameters.get(account.id);
        if (
          parameter?.paramType === "MANUAL_INPUT" ||
          parameter?.paramType === "CONSTANT"
        ) {
          const value = parameter.paramValue || 0;
          currentValues.set(account.id, value);
        }
      }

      // 期間の計算を実行
      const { results, calculatedValues, errors } = this.calculatePeriod(
        accounts,
        period.id,
        currentValues,
        previousValues,
        parameters,
        relations
      );

      allResults.set(period.id, results);
      allValues.set(period.id, calculatedValues);
      if (errors.length > 0) {
        allErrors.set(period.id, errors);
      }

      // 次期間の前期値として使用
      previousValues = new Map();
      for (const [accountId, result] of results) {
        previousValues.set(accountId, result.value);
      }
    }

    return {
      allResults,
      allValues,
      allErrors,
    };
  }

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
