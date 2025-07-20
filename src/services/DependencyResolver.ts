import type { Account, Parameter } from "../types/accountTypes";

export class DependencyResolver {
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

    // パラメータから依存関係を抽出
    accounts.forEach((account) => {
      const parameter = parameters.get(account.id);
      if (!parameter) return;

      const dependencies = this.getDependenciesFromParameter(parameter);

      dependencies.forEach((depId) => {
        if (graph.has(depId)) {
          graph.get(depId)!.add(account.id);
          inDegree.set(account.id, (inDegree.get(account.id) || 0) + 1);
        }
      });
    });

    // 親子関係から依存関係を抽出（CHILDREN_SUMの場合）
    // 修正：親科目は子科目の合計で計算されるため、子 → 親 の依存関係
    accounts.forEach((account) => {
      const parameter = parameters.get(account.id);
      if (parameter?.paramType === "CHILDREN_SUM") {
        // parentIdベースで子科目を探す
        const children = accounts.filter((a) => a.parentId === account.id);

        children.forEach((child) => {
          if (graph.has(child.id)) {
            // 修正：子科目から親科目への依存関係（子 → 親）
            graph.get(child.id)!.add(account.id);
            inDegree.set(account.id, (inDegree.get(account.id) || 0) + 1);
          }
        });
      }
    });

    // flowAccountCfImpactに基づく依存関係を追加
    accounts.forEach((account) => {
      const cfImpact = account.flowAccountCfImpact;
      if (!cfImpact || cfImpact.type === null) return;

      switch (cfImpact.type) {
        case "ADJUSTMENT":
          // 調整項目の場合：現在科目 → targetIdの依存関係
          const targetId = cfImpact.adjustment.targetId;
          if (graph.has(targetId)) {
            graph.get(account.id)!.add(targetId);
            inDegree.set(targetId, (inDegree.get(targetId) || 0) + 1);
          }
          break;

        case "IS_BASE_PROFIT":
          // 基礎利益の場合：現在科目 → "equity-retained-earnings"の依存関係（固定）
          const retainedEarningsId = "equity-retained-earnings";
          if (graph.has(retainedEarningsId)) {
            graph.get(account.id)!.add(retainedEarningsId);
            inDegree.set(
              retainedEarningsId,
              (inDegree.get(retainedEarningsId) || 0) + 1
            );
          }
          break;

        case "RECLASSIFICATION":
          // 組替項目の場合：依存関係を作らない
          break;
      }
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
      case "CHILDREN_SUM":
      case null:
        // これらは他の科目に依存しない
        break;
    }

    return deps;
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

    // パラメータベースの依存関係
    accounts.forEach((account) => {
      const parameter = parameters.get(account.id);
      if (!parameter) return;

      const dependencies = this.getDependenciesFromParameter(parameter);
      dependencies.forEach((depId) => {
        edges.push({
          from: depId,
          to: account.id,
          type: parameter.paramType || "unknown",
        });
      });
    });

    // CHILDREN_SUM の親子関係（修正：子 → 親）
    accounts.forEach((account) => {
      const parameter = parameters.get(account.id);
      if (parameter?.paramType === "CHILDREN_SUM") {
        const children = accounts.filter((a) => a.parentId === account.id);
        children.forEach((child) => {
          edges.push({
            from: child.id,
            to: account.id,
            type: "children-sum",
          });
        });
      }
    });

    // flowAccountCfImpactに基づく依存関係
    accounts.forEach((account) => {
      const cfImpact = account.flowAccountCfImpact;
      if (!cfImpact || cfImpact.type === null) return;

      switch (cfImpact.type) {
        case "ADJUSTMENT":
          edges.push({
            from: account.id,
            to: cfImpact.adjustment.targetId,
            type: "cf-adjustment",
          });
          break;

        case "IS_BASE_PROFIT":
          edges.push({
            from: account.id,
            to: "equity-retained-earnings",
            type: "cf-base-profit",
          });
          break;

        case "RECLASSIFICATION":
          // 組替項目の場合：依存関係を作らない
          break;
      }
    });

    return { nodes, edges };
  }
}
