import type { Account, Parameter } from "../types/accountTypes";
import type { DependencyStrategy } from "./dependency/DependencyStrategy";
import { ParameterDependencyStrategy } from "./dependency/ParameterDependencyStrategy";
import { CfImpactDependencyStrategy } from "./dependency/CfImpactDependencyStrategy";
import { ParentChildDependencyStrategy } from "./dependency/ParentChildDependencyStrategy";

/**
 * 拡張版の依存関係解決クラス
 * ストラテジーパターンを使用して柔軟な依存関係抽出を実現
 */
export class DependencyResolverEnhanced {
  /**
   * 依存関係抽出のストラテジー
   */
  private static strategies: DependencyStrategy[] = [
    new ParameterDependencyStrategy(),
    new CfImpactDependencyStrategy(),
    new ParentChildDependencyStrategy(),
  ];

  /**
   * 科目の依存関係を解決し、トポロジカルソートされた計算順序を返す
   */
  static resolveDependencies(
    accounts: ReadonlyArray<Account>,
    parameters: ReadonlyMap<string, Parameter>
  ): string[] {
    const { graph, inDegree } = this._buildDependencyGraph(
      accounts,
      parameters
    );
    const sortedAccountIds = this._topologicalSort(
      graph,
      inDegree,
      accounts.length
    );
    return sortedAccountIds;
  }

  /**
   * 依存グラフと入次数を構築するプライベートメソッド
   */
  private static _buildDependencyGraph(
    accounts: ReadonlyArray<Account>,
    parameters: ReadonlyMap<string, Parameter>
  ): { graph: Map<string, Set<string>>; inDegree: Map<string, number> } {
    const graph = new Map<string, Set<string>>();
    const inDegree = new Map<string, number>();

    // 全科目を初期化
    accounts.forEach((account) => {
      graph.set(account.id, new Set());
      inDegree.set(account.id, 0);
    });

    // ストラテジーパターンを使用して依存関係を抽出
    accounts.forEach((account) => {
      // 各ストラテジーを適用
      this.strategies.forEach((strategy) => {
        if (strategy.isApplicable(account)) {
          const dependencies = strategy.extractDependencies(account, accounts);

          // パラメータベースの依存関係の場合、parametersマップから取得する必要がある
          if (strategy.name === "ParameterDependency") {
            const parameter = parameters.get(account.id);
            if (parameter) {
              const paramDeps = this.getDependenciesFromParameter(parameter);
              paramDeps.forEach((depId) => {
                if (graph.has(depId)) {
                  graph.get(depId)!.add(account.id);
                  inDegree.set(account.id, (inDegree.get(account.id) || 0) + 1);
                }
              });
            }
          } else {
            // その他のストラテジーの依存関係を処理
            dependencies.forEach((depId) => {
              if (graph.has(depId)) {
                // 依存の方向に注意：
                // - ParentChildDependency: 親が子に依存（親 → 子）
                // - CfImpactDependency: 現在科目が対象に依存（現在 → 対象）
                if (strategy.name === "ParentChildDependency") {
                  // 親（account）が子（depId）に依存
                  graph.get(depId)!.add(account.id);
                  inDegree.set(account.id, (inDegree.get(account.id) || 0) + 1);
                } else if (strategy.name === "CfImpactDependency") {
                  // 現在科目（account）が対象（depId）に依存するため、
                  // 依存先（depId）から依存元（account）へのエッジを張る
                  graph.get(depId)!.add(account.id);
                  inDegree.set(account.id, (inDegree.get(account.id) || 0) + 1);
                }
              }
            });
          }
        }
      });
    });

    return { graph, inDegree };
  }

  /**
   * トポロジカルソート（カーンのアルゴリズム）を実行するプライベートメソッド
   */
  private static _topologicalSort(
    graph: Map<string, Set<string>>,
    inDegree: Map<string, number>,
    totalAccounts: number
  ): string[] {
    const queue: string[] = [];
    const result: string[] = [];

    // 入次数が0の頂点をキューに追加
    inDegree.forEach((degree, accountId) => {
      if (degree === 0) {
        queue.push(accountId);
      }
    });

    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      // 隣接頂点の入次数を減らす
      const neighbors = graph.get(current) || new Set();
      neighbors.forEach((neighbor) => {
        const newDegree = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, newDegree);

        if (newDegree === 0) {
          queue.push(neighbor);
        }
      });
    }

    // 循環依存のチェック
    if (result.length !== totalAccounts) {
      const remaining = Array.from(inDegree.keys()).filter(
        (accountId) => !result.includes(accountId)
      );
      throw new Error(
        `Circular dependency detected in accounts: ${remaining.join(", ")}`
      );
    }

    return result;
  }

  /**
   * パラメータから依存する科目IDを抽出
   */
  private static getDependenciesFromParameter(parameter: Parameter): string[] {
    const deps: string[] = [];

    switch (parameter.paramType) {
      case "PERCENTAGE":
      case "PROPORTIONATE":
        if (parameter.paramReferences?.accountId) {
          deps.push(parameter.paramReferences.accountId);
        }
        break;

      case "CALCULATION":
        if (parameter.paramReferences) {
          parameter.paramReferences.forEach((ref) => {
            deps.push(ref.accountId);
          });
        }
        break;

      case "GROWTH_RATE":
      case "CASH_CALCULATION":
      case null:
        // これらは他の科目に依存しない（CASH_CALCULATIONは特別な処理で最後に計算）
        break;
    }

    return deps;
  }

  /**
   * ストラテジーを追加（拡張用）
   */
  static addStrategy(strategy: DependencyStrategy): void {
    this.strategies.push(strategy);
  }

  /**
   * ストラテジーをクリア（テスト用）
   */
  static clearStrategies(): void {
    this.strategies = [];
  }

  /**
   * デフォルトストラテジーをリセット
   */
  static resetToDefaultStrategies(): void {
    this.strategies = [
      new ParameterDependencyStrategy(),
      new CfImpactDependencyStrategy(),
      new ParentChildDependencyStrategy(),
    ];
  }

  /**
   * 現在のストラテジー一覧を取得
   */
  static getStrategies(): DependencyStrategy[] {
    return [...this.strategies];
  }

  /**
   * 循環依存をチェックする
   */
  static checkCircularDependency(
    accountId: string,
    parameters: ReadonlyMap<string, Parameter>,
    visited: Set<string> = new Set(),
    recStack: Set<string> = new Set()
  ): boolean {
    visited.add(accountId);
    recStack.add(accountId);

    const parameter = parameters.get(accountId);
    if (parameter) {
      const dependencies = this.getDependenciesFromParameter(parameter);

      for (const depId of dependencies) {
        if (!visited.has(depId)) {
          if (
            this.checkCircularDependency(depId, parameters, visited, recStack)
          ) {
            return true;
          }
        } else if (recStack.has(depId)) {
          return true; // 循環依存を検出
        }
      }
    }

    recStack.delete(accountId);
    return false;
  }

  /**
   * 依存関係の可視化用データを生成
   */
  static generateDependencyGraph(
    accounts: ReadonlyArray<Account>,
    parameters: ReadonlyMap<string, Parameter>
  ): {
    nodes: Array<{ id: string; label: string }>;
    edges: Array<{ from: string; to: string; type: string }>;
  } {
    const nodes = accounts.map((account) => ({
      id: account.id,
      label: account.accountName,
    }));

    const edges: Array<{ from: string; to: string; type: string }> = [];

    // ストラテジーパターンを使用して依存関係を抽出
    accounts.forEach((account) => {
      this.strategies.forEach((strategy) => {
        if (strategy.isApplicable(account)) {
          const dependencies = strategy.extractDependencies(account, accounts);

          if (strategy.name === "ParameterDependency") {
            const parameter = parameters.get(account.id);
            if (parameter && parameter.paramType) {
              const paramDeps = this.getDependenciesFromParameter(parameter);
              paramDeps.forEach((depId) => {
                edges.push({
                  from: depId,
                  to: account.id,
                  type: parameter.paramType,
                });
              });
            }
          } else {
            dependencies.forEach((depId) => {
              edges.push({
                from:
                  strategy.name === "ParentChildDependency"
                    ? depId
                    : account.id,
                to:
                  strategy.name === "ParentChildDependency"
                    ? account.id
                    : depId,
                type: strategy.name.toLowerCase().replace("dependency", ""),
              });
            });
          }
        }
      });
    });

    return { nodes, edges };
  }
}
