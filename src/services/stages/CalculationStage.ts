import type { PipelineContext, PipelineStage } from "../CalculationPipeline";
import type {
  CalculationContext,
  CalculationError,
} from "../../types/calculationTypes";
import type { FinancialValue } from "../../types/financialValueTypes";
import { FinancialCalculatorEnhanced } from "../FinancialCalculatorEnhanced";
import { DependencyResolverEnhanced } from "../DependencyResolverEnhanced";

/**
 * 実際の数値計算を実行するステージ
 * DependencyResolutionStageで決定された順序に基づいて計算
 */
export class CalculationStage implements PipelineStage {
  name = "Calculation";
  private targetPeriods: string[];

  constructor(targetPeriods?: string[]) {
    this.targetPeriods = targetPeriods || [];
  }

  execute(context: PipelineContext): PipelineContext {
    console.log(`[${this.name}] Starting calculation stage`);

    const {
      accounts,
      periods,
      parameters,
      dataStore,
      periodIndexSystem,
      sortedAccountIds,
    } = context;

    // sortedAccountIdsが存在しない場合はDependencyResolverで解決
    // const accountOrder = sortedAccountIds || this.resolveDependencies(context);

    const allResults = new Map<string, number>();
    const allCalculatedValues = new Map<string, FinancialValue>();
    const allErrors: CalculationError[] = [];

    // 計算対象の期間を決定
    const targetPeriodList =
      this.targetPeriods.length > 0
        ? periods.filter((p) => this.targetPeriods.includes(p.id))
        : periods;

    console.log(
      `[${this.name}] Calculating ${targetPeriodList.length} periods`
    );

    // 各期間に対して計算を実行
    for (const period of targetPeriodList) {
      console.log(
        `[${this.name}] Calculating period: ${period.name} (${period.id})`
      );

      const calculationContext = this.createCalculationContext(
        period.id,
        periodIndexSystem,
        dataStore
      );

      // FinancialCalculatorEnhancedを使用して計算
      const { results, calculatedValues, errors } =
        FinancialCalculatorEnhanced.calculatePeriod(
          accounts,
          period.id,
          calculationContext,
          parameters
        );

      // 結果を集約
      results.forEach((value, accountId) => {
        allResults.set(`${accountId}_${period.id}`, value);
      });

      calculatedValues.forEach((value, key) => {
        allCalculatedValues.set(key, value);
      });

      allErrors.push(...errors);

      // データストアを更新（次の期間の計算で使用）
      const updates = Array.from(calculatedValues.values()).map((v) => ({
        accountId: v.accountId,
        periodId: v.periodId,
        value: v.value,
      }));
      dataStore.setValues(updates);
    }

    console.log(
      `[${this.name}] Calculation completed. Results: ${allResults.size}, Errors: ${allErrors.length}`
    );

    // 更新されたfinancialValuesを生成
    const updatedFinancialValues = dataStore.toFinancialValueMap();

    return {
      ...context,
      calculationResults: allResults,
      calculationErrors: allErrors,
      financialValues: updatedFinancialValues,
    };
  }

  private createCalculationContext(
    periodId: string,
    periodIndexSystem: import("../../utils/PeriodIndexSystem").PeriodIndexSystem,
    dataStore: import("../../utils/OptimizedFinancialDataStore").OptimizedFinancialDataStore
  ): CalculationContext {
    const periodIndex = periodIndexSystem.getPeriodIndex(periodId) || 0;
    const previousPeriodId = periodIndexSystem.getPreviousPeriodId(periodId);

    return {
      periodId,
      periodIndex,
      previousPeriodId,

      getValue: (accountId: string, targetPeriodId?: string) => {
        return dataStore.getValue(accountId, targetPeriodId || periodId);
      },

      getRelativeValue: (accountId: string, offset: number) => {
        return dataStore.getRelativeValue(accountId, periodId, offset);
      },

      getPreviousValue: (accountId: string) => {
        return dataStore.getPreviousValue(accountId, periodId);
      },

      getTimeSeriesValues: (
        accountId: string,
        startOffset: number,
        endOffset: number
      ) => {
        return dataStore.getTimeSeriesValues(
          accountId,
          periodId,
          startOffset,
          endOffset
        );
      },

      getBulkValues: (accountIds: string[]) => {
        return dataStore.getBulkValues(accountIds, periodId);
      },

      setValue: (accountId: string, periodId: string, value: number) => {
        dataStore.setValue(accountId, periodId, value);
      },
    };
  }

  private resolveDependencies(context: PipelineContext): string[] {
    console.log(
      `[${this.name}] sortedAccountIds not found, resolving dependencies`
    );

    return DependencyResolverEnhanced.resolveDependencies(
      context.accounts,
      context.parameters
    );
  }

  validate(context: PipelineContext): boolean {
    return !!(
      context.accounts &&
      Array.isArray(context.accounts) &&
      context.periods &&
      Array.isArray(context.periods) &&
      context.parameters &&
      context.parameters instanceof Map &&
      context.dataStore &&
      context.periodIndexSystem
    );
  }
}
