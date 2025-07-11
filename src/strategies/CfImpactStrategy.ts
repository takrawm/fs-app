import type { CfImpact, CfImpactType } from "../types/account";
import type { CalculationContext } from "../types/parameter";
import type { CalculationResult } from "../types/financial";
import { CF_IMPACT_TYPES } from "../types/newFinancialTypes";

// CFインパクト処理専用のストラテジークラス
export class CfImpactStrategy {
  private static instance: CfImpactStrategy;

  private constructor() {}

  static getInstance(): CfImpactStrategy {
    if (!CfImpactStrategy.instance) {
      CfImpactStrategy.instance = new CfImpactStrategy();
    }
    return CfImpactStrategy.instance;
  }

  // CFインパクトの計算
  calculateCfImpact(
    accountId: string,
    cfImpact: CfImpact,
    context: CalculationContext
  ): CalculationResult {
    switch (cfImpact.type) {
      case CF_IMPACT_TYPES.IS_BASE_PROFIT:
        return this.calculateBaseProfit(accountId, cfImpact, context);
      case CF_IMPACT_TYPES.ADJUSTMENT:
        return this.calculateAdjustment(accountId, cfImpact, context);
      case CF_IMPACT_TYPES.RECLASSIFICATION:
        return this.calculateReclassification(accountId, cfImpact, context);
      default:
        throw new Error(`Unknown CF impact type: ${cfImpact.type}`);
    }
  }

  private calculateBaseProfit(
    accountId: string,
    cfImpact: CfImpact,
    context: CalculationContext
  ): CalculationResult {
    // 基準利益の場合、そのまま値を使用
    const value = context.accounts.get(accountId) || 0;
    
    return {
      accountId,
      periodId: context.currentPeriodId,
      value,
      formula: "基準利益",
      dependencies: [accountId],
      calculatedAt: new Date(),
    };
  }

  private calculateAdjustment(
    accountId: string,
    cfImpact: CfImpact,
    context: CalculationContext
  ): CalculationResult {
    // 調整項目の場合、BS項目の増減を計算
    if (!context.previousPeriodId) {
      return {
        accountId,
        periodId: context.currentPeriodId,
        value: 0,
        formula: "前期データなし",
        dependencies: [accountId],
        calculatedAt: new Date(),
      };
    }

    const currentValue = context.accounts.get(accountId) || 0;
    const previousValue = context.accounts.get(`${accountId}_${context.previousPeriodId}`) || 0;
    const change = currentValue - previousValue;

    // 資産の増加、負債・純資産の減少はCF減少要因（マイナス）
    // 資産の減少、負債・純資産の増加はCF増加要因（プラス）
    const adjustmentValue = this.determineCfAdjustmentSign(accountId, change);

    return {
      accountId,
      periodId: context.currentPeriodId,
      value: adjustmentValue,
      formula: `${accountId}の変動調整`,
      dependencies: [accountId],
      calculatedAt: new Date(),
    };
  }

  private calculateReclassification(
    accountId: string,
    cfImpact: CfImpact,
    context: CalculationContext
  ): CalculationResult {
    // 振替項目の場合、対象アカウントの値を使用
    let value = 0;
    const dependencies: string[] = [];

    if (cfImpact.targetAccountIds && cfImpact.targetAccountIds.length > 0) {
      cfImpact.targetAccountIds.forEach(targetId => {
        const targetValue = context.accounts.get(targetId) || 0;
        value += targetValue;
        dependencies.push(targetId);
      });
    } else {
      // 対象アカウントが指定されていない場合は、自身の値を使用
      value = context.accounts.get(accountId) || 0;
      dependencies.push(accountId);
    }

    return {
      accountId,
      periodId: context.currentPeriodId,
      value,
      formula: cfImpact.formula || "振替項目",
      dependencies,
      calculatedAt: new Date(),
    };
  }

  private determineCfAdjustmentSign(accountId: string, change: number): number {
    // アカウントIDやタイプから借方・貸方を判定
    // 実際の実装では、アカウント情報から判定
    // 簡易的な実装として、アカウント名で判定
    if (accountId.includes("asset") || accountId.includes("資産")) {
      return -change; // 資産の増加はCF減少
    } else if (accountId.includes("liability") || accountId.includes("負債") || 
               accountId.includes("equity") || accountId.includes("純資産")) {
      return change; // 負債・純資産の増加はCF増加
    }
    
    return change; // デフォルト
  }

  // CFセクション別の集計
  calculateCfSection(
    sectionType: "operating" | "investing" | "financing",
    accountIds: string[],
    context: CalculationContext
  ): CalculationResult {
    let totalValue = 0;
    const dependencies: string[] = [];

    accountIds.forEach(accountId => {
      const value = context.accounts.get(accountId) || 0;
      totalValue += value;
      dependencies.push(accountId);
    });

    return {
      accountId: `cf-${sectionType}`,
      periodId: context.currentPeriodId,
      value: totalValue,
      formula: `${sectionType}CF合計`,
      dependencies,
      calculatedAt: new Date(),
    };
  }
}