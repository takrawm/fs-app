import type { Account, Parameter } from "../types/accountTypes";

export class DependencyResolver {
  /**
   * 科目の依存関係を解決し、トポロジカルソートされた計算順序を返す
   */
  static resolveDependencies(
    accounts: ReadonlyArray<Account>,
    parameters: ReadonlyMap<string, Parameter>
  ): string[] {
    // 依存グラフを構築
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

    // 親子関係から依存関係を抽出（子科目合計の場合）
    accounts.forEach((account) => {
      const parameter = parameters.get(account.id);
      if (parameter?.paramType === "CHILDREN_SUM") {
        // parentIdベースで子科目を探す
        const children = accounts.filter((a) => a.parentId === account.id);

        children.forEach((child) => {
          if (graph.has(child.id)) {
            graph.get(child.id)!.add(account.id);
            inDegree.set(account.id, (inDegree.get(account.id) || 0) + 1);
          }
        });
      }
    });

    // トポロジカルソート（カーンのアルゴリズム）
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
    if (result.length !== accounts.length) {
      const remaining = accounts.filter((a) => !result.includes(a.id));
      throw new Error(
        `Circular dependency detected in accounts: ${remaining
          .map((a) => a.id)
          .join(", ")}`
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
      case "DAYS":
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

      case "FORMULA":
        if (parameter.paramReferences) {
          deps.push(...parameter.paramReferences);
        }
        break;

      case "PERCENTAGE_OF_REVENUE":
        // 売上高科目への依存（動的に解決される）
        // TODO: 実装時には売上高科目を特定する仕組みが必要
        break;

      case "GROWTH_RATE":
      case "CHILDREN_SUM":
      case "CONSTANT":
      case "MANUAL_INPUT":
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

    // 親子関係（parentIdベース）
    accounts.forEach((account) => {
      if (account.parentId) {
        edges.push({
          from: account.id,
          to: account.parentId,
          type: "parent-child",
        });
      }
    });

    return { nodes, edges };
  }
}
