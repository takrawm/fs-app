import type { PipelineContext, PipelineStage } from "../CalculationPipeline";
import { DependencyResolverEnhanced } from "../DependencyResolverEnhanced";

/**
 * 計算の実行順序を決定するステージ
 * 依存関係を解決し、トポロジカルソートされた科目IDの配列を生成
 */
export class DependencyResolutionStage implements PipelineStage {
  name = "DependencyResolution";

  async execute(context: PipelineContext): Promise<PipelineContext> {
    console.log(`[${this.name}] Starting dependency resolution`);

    const { accounts, parameters } = context;

    try {
      // DependencyResolverEnhancedを使用して依存関係を解決
      const sortedAccountIds = DependencyResolverEnhanced.resolveDependencies(
        accounts,
        parameters
      );

      console.log(`[${this.name}] Resolved dependencies for ${sortedAccountIds.length} accounts`);

      // 循環依存のチェック（追加の安全性確保）
      this.validateNoCycles(sortedAccountIds, accounts);

      return {
        ...context,
        sortedAccountIds,
      };
    } catch (error) {
      console.error(`[${this.name}] Dependency resolution failed:`, error);
      throw new Error(
        `Failed to resolve account dependencies: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  private validateNoCycles(sortedIds: string[], accounts: import("../../types/accountTypes").Account[]): void {
    // ソート結果に含まれるIDの数が元の科目数と一致することを確認
    if (sortedIds.length !== accounts.length) {
      const accountIds = new Set(accounts.map(a => a.id));
      const sortedIdSet = new Set(sortedIds);
      
      // ソートに含まれていない科目を特定
      const missingIds: string[] = [];
      accountIds.forEach(id => {
        if (!sortedIdSet.has(id)) {
          missingIds.push(id);
        }
      });

      // ソートに重複して含まれる科目を特定
      const duplicateIds = sortedIds.filter(
        (id, index) => sortedIds.indexOf(id) !== index
      );

      throw new Error(
        `Dependency resolution mismatch: ` +
        `Expected ${accounts.length} accounts, got ${sortedIds.length}. ` +
        `Missing: [${missingIds.join(", ")}], ` +
        `Duplicates: [${duplicateIds.join(", ")}]`
      );
    }
  }

  validate(context: PipelineContext): boolean {
    return !!(
      context.accounts &&
      Array.isArray(context.accounts) &&
      context.accounts.length > 0 &&
      context.parameters &&
      context.parameters instanceof Map
    );
  }
}