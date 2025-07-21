import type { Account } from "../../types/accountTypes";

/**
 * 依存関係を抽出するストラテジーのインターフェース
 */
export interface DependencyStrategy {
  /**
   * ストラテジーの名前
   */
  name: string;

  /**
   * 指定された科目が依存する科目IDのリストを返す
   * @param account 対象の科目
   * @param allAccounts すべての科目（参照解決用）
   * @returns 依存する科目IDの配列
   */
  extractDependencies(account: Account, allAccounts: ReadonlyArray<Account>): string[];

  /**
   * このストラテジーが適用可能かどうかを判定
   * @param account 対象の科目
   * @returns 適用可能な場合true
   */
  isApplicable(account: Account): boolean;
}