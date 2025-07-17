import type { FlowAccountCfImpact } from "../types/accountTypes";
import type { CalculationContext } from "../types/calculationTypes";
import type { CalculationResult } from "../types/calculationTypes";
import { CF_IMPACT_TYPES } from "../types/accountTypes";

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
    cfImpact: FlowAccountCfImpact,
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
    _cfImpact: FlowAccountCfImpact,
    context: CalculationContext
  ): CalculationResult {
    // 基準利益の場合、そのまま値を使用
    const value = context.accountValues.get(accountId) || 0;

    return {
      value,
      formula: "基準利益",
      references: [accountId],
    };
  }

  private calculateAdjustment(
    accountId: string,
    _cfImpact: FlowAccountCfImpact,
    context: CalculationContext
  ): CalculationResult {
    // 調整項目の場合、BS項目の増減を計算
    if (!context.periodId) {
      return {
        value: 0,
        formula: "前期データなし",
        references: [accountId],
      };
    }

    const currentValue = context.accountValues.get(accountId) || 0;
    const previousValue = context.previousValues.get(accountId) || 0;
    const change = currentValue - previousValue;

    // 資産の増加、負債・純資産の減少はCF減少要因（マイナス）
    // 資産の減少、負債・純資産の増加はCF増加要因（プラス）
    const adjustmentValue = this.determineCfAdjustmentSign(accountId, change);

    return {
      value: adjustmentValue,
      formula: `${accountId}の変動調整`,
      references: [accountId],
    };
  }

  private calculateReclassification(
    accountId: string,
    cfImpact: FlowAccountCfImpact,
    context: CalculationContext
  ): CalculationResult {
    // 振替項目の場合、対象アカウントの値を使用
    let value = 0;
    const references: string[] = [];

    // CFインパクトタイプごとの処理
    if (cfImpact.type === CF_IMPACT_TYPES.RECLASSIFICATION && "reclassification" in cfImpact) {
      // 組替元から組替先への移動
      const fromValue = context.accountValues.get(cfImpact.reclassification.from) || 0;
      value = fromValue;
      references.push(cfImpact.reclassification.from);
    } else {
      // その他の場合は自身の値を使用
      value = context.accountValues.get(accountId) || 0;
      references.push(accountId);
    }

    return {
      value,
      formula: "振替項目",
      references,
    };
  }

  private determineCfAdjustmentSign(accountId: string, change: number): number {
    // アカウントIDやタイプから借方・貸方を判定
    // 実際の実装では、アカウント情報から判定
    // 簡易的な実装として、アカウント名で判定
    if (accountId.includes("asset") || accountId.includes("資産")) {
      return -change; // 資産の増加はCF減少
    } else if (
      accountId.includes("liability") ||
      accountId.includes("負債") ||
      accountId.includes("equity") ||
      accountId.includes("純資産")
    ) {
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
    const references: string[] = [];

    accountIds.forEach((accountId) => {
      const value = context.accountValues.get(accountId) || 0;
      totalValue += value;
      references.push(accountId);
    });

    return {
      value: totalValue,
      formula: `${sectionType}CF合計`,
      references,
    };
  }
}
