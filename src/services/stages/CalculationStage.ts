import type { PipelineContext, PipelineStage } from "../CalculationPipeline";
import type {
  CalculationContext,
  CalculationError,
} from "../../types/calculationTypes";
import type { FinancialValue } from "../../types/financialValueTypes";
import { FinancialCalculatorEnhanced } from "../FinancialCalculatorEnhanced";
import { DependencyResolverEnhanced } from "../DependencyResolverEnhanced";
import {
  isFlowAccount,
  isAdjustmentImpact,
  isBaseProfitSummaryAccount,
} from "../../types/accountTypes";

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
      // sortedAccountIds, // 現在は未使用
    } = context;

    try {
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
          dataStore,
          context
        );

        // FinancialCalculatorEnhancedを使用して計算
        const { results, calculatedValues, errors } =
          FinancialCalculatorEnhanced.calculatePeriod(
            accounts,
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
    } finally {
      // 処理完了
      console.log(`[${this.name}] Stage completed`);
    }
  }

  private createCalculationContext(
    periodId: string,
    periodIndexSystem: import("../../utils/PeriodIndexSystem").PeriodIndexSystem,
    dataStore: import("../../utils/OptimizedFinancialDataStore").OptimizedFinancialDataStore,
    pipelineContext: PipelineContext
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

      // === 新しい計算ロジック用のメソッド ===

      getChildrenSum: (parentAccountId: string) => {
        const childAccounts = pipelineContext.accounts.filter(
          (acc) => acc.parentId === parentAccountId
        );

        let sum = 0;
        childAccounts.forEach((child) => {
          const childValue = dataStore.getValue(child.id, periodId);
          sum += childValue;
        });

        console.log(
          `[CalculationStage] 子科目合計計算 ${parentAccountId}: 子科目数=${childAccounts.length}, 合計=${sum}`
        );
        return sum;
      },

      getFlowAdjustmentSum: (targetAccountId: string) => {
        let sum = 0;
        const adjustments: Array<{
          accountId: string;
          accountName: string;
          operation: string;
          value: number;
        }> = [];

        pipelineContext.accounts.forEach((account) => {
          // フロー科目かつflowAccountCfImpactがADJUSTMENTで、targetIdが一致する場合
          if (
            isFlowAccount(account) &&
            isAdjustmentImpact(account.flowAccountCfImpact) &&
            account.flowAccountCfImpact.adjustment.targetId === targetAccountId
          ) {
            const flowValue = dataStore.getValue(account.id, periodId);
            const operation = account.flowAccountCfImpact.adjustment.operation;

            adjustments.push({
              accountId: account.id,
              accountName: account.accountName,
              operation,
              value: flowValue,
            });

            if (operation === "ADD") {
              sum += flowValue;
            } else if (operation === "SUB") {
              sum -= flowValue;
            }
          }
        });

        console.log(
          `[CalculationStage] フロー調整合計 ${targetAccountId}: 調整科目数=${adjustments.length}, 合計=${sum}`,
          adjustments
        );
        return sum;
      },

      hasFlowAdjustments: (targetAccountId: string) => {
        const hasAdjustments = pipelineContext.accounts.some((account) => {
          return (
            isFlowAccount(account) &&
            isAdjustmentImpact(account.flowAccountCfImpact) &&
            account.flowAccountCfImpact.adjustment.targetId === targetAccountId
          );
        });

        console.log(
          `[CalculationStage] フロー調整有無チェック ${targetAccountId}: ${hasAdjustments}`
        );
        return hasAdjustments;
      },

      getBaseProfit: () => {
        interface BaseProfitAccountType {
          accountId: string;
          accountName: string;
          value: number;
        }

        let baseProfitAccount: BaseProfitAccountType | null = null;

        pipelineContext.accounts.forEach((account) => {
          // 基礎利益サマリー科目のみを対象とする
          if (isBaseProfitSummaryAccount(account)) {
            const accountValue = dataStore.getValue(account.id, periodId);

            if (baseProfitAccount !== null) {
              console.warn(
                `[CalculationStage] 警告: 複数の基礎利益科目が見つかりました。既存: ${baseProfitAccount.accountName}, 新規: ${account.accountName}`
              );
            }

            baseProfitAccount = {
              accountId: account.id,
              accountName: account.accountName,
              value: accountValue,
            };
          }
        });

        if (baseProfitAccount === null) {
          console.warn(
            `[CalculationStage] 警告: 基礎利益科目が見つかりませんでした`
          );
          return 0;
        }

        console.log(
          `[CalculationStage] 基礎利益: ${
            (baseProfitAccount as any).accountName
          } = ${(baseProfitAccount as any).value}`,
          baseProfitAccount
        );
        return (baseProfitAccount as any).value;
      },

      // CF科目計算用: 科目情報を取得
      getAccount: (accountId: string) => {
        return (
          pipelineContext.accounts.find((acc) => acc.id === accountId) || null
        );
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
