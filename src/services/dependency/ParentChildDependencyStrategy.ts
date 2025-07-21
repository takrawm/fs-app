import type { DependencyStrategy } from "./DependencyStrategy";
import type { Account } from "../../types/accountTypes";
import { isSummaryAccount } from "../../types/accountTypes";

/**
 * 親子関係による依存関係を抽出するストラテジー
 * サマリー科目は、その直接の子科目すべてに依存する
 */
export class ParentChildDependencyStrategy implements DependencyStrategy {
  name = "ParentChildDependency";

  extractDependencies(account: Account, allAccounts: ReadonlyArray<Account>): string[] {
    const dependencies: string[] = [];

    // サマリー科目でない場合は依存関係なし
    if (!isSummaryAccount(account)) {
      return dependencies;
    }

    // この科目を親とする全ての子科目を探す
    const childAccounts = allAccounts.filter(
      childAccount => childAccount.parentId === account.id
    );

    // 子科目のIDを依存関係として追加
    childAccounts.forEach(child => {
      dependencies.push(child.id);
    });

    return dependencies;
  }

  isApplicable(account: Account): boolean {
    // サマリー科目の場合に適用
    return isSummaryAccount(account);
  }
}