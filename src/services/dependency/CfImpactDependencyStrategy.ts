import type { DependencyStrategy } from "./DependencyStrategy";
import type { Account } from "../../types/accountTypes";
import {
  isFlowAccount,
  isBaseProfitSummaryAccount,
} from "../../types/accountTypes";

/**
 * flowAccountCfImpactに基づく依存関係を抽出するストラテジー
 */
export class CfImpactDependencyStrategy implements DependencyStrategy {
  name = "CfImpactDependency";

  extractDependencies(
    account: Account,
    allAccounts: ReadonlyArray<Account>
  ): string[] {
    const dependencies: string[] = [];

    // === BS科目の場合：ADJUSTMENTフロー科目に依存 ===
    if (account.sheet === "BS") {
      // このBS科目をターゲットとするADJUSTMENTフロー科目を探す
      const relatedFlowAccounts = allAccounts.filter((flowAccount) => {
        return (
          isFlowAccount(flowAccount) &&
          flowAccount.flowAccountCfImpact &&
          flowAccount.flowAccountCfImpact.type === "ADJUSTMENT" &&
          "adjustment" in flowAccount.flowAccountCfImpact &&
          flowAccount.flowAccountCfImpact.adjustment.targetId === account.id
        );
      });

      relatedFlowAccounts.forEach((flowAccount) => {
        dependencies.push(flowAccount.id);
      });
    }

    // === 利益剰余金の場合：基礎利益サマリー科目に依存 ===
    if (account.id === "equity-retained-earnings") {
      // 基礎利益サマリー科目を探す
      const baseProfitAccounts = allAccounts.filter((acc) => {
        return isBaseProfitSummaryAccount(acc);
      });

      baseProfitAccounts.forEach((baseProfitAccount) => {
        dependencies.push(baseProfitAccount.id);
      });
    }

    return dependencies;
  }

  isApplicable(account: Account): boolean {
    // BS科目または利益剰余金の場合に適用
    return account.sheet === "BS" || account.id === "equity-retained-earnings";
  }
}
