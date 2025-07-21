import type { DependencyStrategy } from "./DependencyStrategy";
import type { Account } from "../../types/accountTypes";
import { 
  isPercentageParameter, 
  isProportionateParameter, 
  isCalculationParameter 
} from "../../types/accountTypes";

/**
 * パラメータに基づく依存関係を抽出するストラテジー
 */
export class ParameterDependencyStrategy implements DependencyStrategy {
  name = "ParameterDependency";

  extractDependencies(account: Account, _allAccounts: ReadonlyArray<Account>): string[] {
    const dependencies: string[] = [];
    const { parameter } = account;

    if (!parameter) {
      return dependencies;
    }

    // PERCENTAGE または PROPORTIONATE パラメータの場合
    if (isPercentageParameter(parameter) || isProportionateParameter(parameter)) {
      if (parameter.paramReferences?.accountId) {
        dependencies.push(parameter.paramReferences.accountId);
      }
    }

    // CALCULATION パラメータの場合
    if (isCalculationParameter(parameter)) {
      if (parameter.paramReferences) {
        parameter.paramReferences.forEach(ref => {
          if (ref.accountId) {
            dependencies.push(ref.accountId);
          }
        });
      }
    }

    // 重複を除去
    return [...new Set(dependencies)];
  }

  isApplicable(account: Account): boolean {
    // すべての科目でパラメータベースの依存関係をチェック
    return account.parameter !== null && account.parameter !== undefined;
  }
}