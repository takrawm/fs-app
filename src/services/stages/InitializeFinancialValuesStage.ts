import type { PipelineContext, PipelineStage } from "../CalculationPipeline";
import type { FinancialValue } from "../../types/financialValueTypes";

/**
 * financialValuesの整合性を保証するステージ
 * 新しい期間が追加された際の初期化バグを修正
 */
export class InitializeFinancialValuesStage implements PipelineStage {
  name = "InitializeFinancialValues";

  async execute(context: PipelineContext): Promise<PipelineContext> {
    console.log(`[${this.name}] Starting financial values initialization`);

    const { accounts, periods, financialValues, dataStore } = context;
    let addedCount = 0;
    const updatedFinancialValues = new Map(financialValues);

    // すべての account × period の組み合わせをチェック
    for (const account of accounts) {
      for (const period of periods) {
        const key = `${account.id}_${period.id}`;
        
        // financialValuesに存在しない場合は初期化
        if (!updatedFinancialValues.has(key)) {
          const defaultValue: FinancialValue = {
            accountId: account.id,
            periodId: period.id,
            value: 0,
            isCalculated: false,
          };
          
          updatedFinancialValues.set(key, defaultValue);
          
          // データストアにも反映
          if (dataStore) {
            dataStore.setValue(account.id, period.id, 0);
          }
          
          addedCount++;
        }
      }
    }

    console.log(`[${this.name}] Initialized ${addedCount} missing financial values`);
    console.log(`[${this.name}] Total financial values: ${updatedFinancialValues.size}`);

    // データストアの再構築が必要な場合
    if (addedCount > 0 && dataStore) {
      console.log(`[${this.name}] Rebuilding data store with updated values`);
      dataStore.rebuild(accounts, periods, updatedFinancialValues);
    }

    return {
      ...context,
      financialValues: updatedFinancialValues,
    };
  }

  validate(context: PipelineContext): boolean {
    return !!(
      context.accounts &&
      Array.isArray(context.accounts) &&
      context.periods &&
      Array.isArray(context.periods) &&
      context.financialValues &&
      context.financialValues instanceof Map
    );
  }
}