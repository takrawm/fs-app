import type { DependencyStrategy } from "./DependencyStrategy";
import type { Account } from "../../types/accountTypes";
import {
  isFlowAccount,
  isAdjustmentImpact,
  isBaseProfitImpact,
  CF_IMPACT_TYPES,
} from "../../types/accountTypes";

/**
 * flowAccountCfImpactに基づく依存関係を抽出するストラテジー
 */
export class CfImpactDependencyStrategy implements DependencyStrategy {
  name = "CfImpactDependency";

  extractDependencies(
    account: Account,
    _allAccounts: ReadonlyArray<Account>
  ): string[] {
    const dependencies: string[] = [];

    // フロー科目でない場合は依存関係なし
    if (!isFlowAccount(account)) {
      return dependencies;
    }

    const { flowAccountCfImpact } = account;
    if (!flowAccountCfImpact || flowAccountCfImpact.type === null) {
      return dependencies;
    }

    // ADJUSTMENT タイプの場合
    if (isAdjustmentImpact(flowAccountCfImpact)) {
      const adjustment = flowAccountCfImpact.adjustment;
      if (adjustment && adjustment.targetId) {
        // 調整項目は対象科目に依存する（現在科目 → targetId）
        dependencies.push(adjustment.targetId);
      }
    }

    // IS_BASE_PROFIT タイプの場合
    if (isBaseProfitImpact(flowAccountCfImpact)) {
      // 基礎利益は利益剰余金に依存する（固定）
      const retainedEarningsId = "equity-retained-earnings";
      dependencies.push(retainedEarningsId);
    }

    // RECLASSIFICATION タイプの場合
    // 組替項目は依存関係を作らない（元の実装に従う）

    return dependencies;
  }

  isApplicable(account: Account): boolean {
    // フロー科目かつCFインパクトが設定されている場合に適用
    return (
      isFlowAccount(account) &&
      account.flowAccountCfImpact !== null &&
      account.flowAccountCfImpact !== undefined &&
      account.flowAccountCfImpact.type !== null
    );
  }
}
