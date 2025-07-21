import type { PipelineContext, PipelineStage } from "../CalculationPipeline";
import {
  isFlowAccount,
  isBSAccount,
  isFlowDetailAccount,
  isSummaryAccount,
  isCalculationParameter,
  isNullParameter,
  type Account,
  type FlowAccount,
  type BSAccount,
} from "../../types/accountTypes";

/**
 * 科目定義の完全性を検証するステージ
 * CF科目生成の前提条件を確保する
 */
export class ValidateAccountDefinitionsStage implements PipelineStage {
  name = "ValidateAccountDefinitions";

  execute(context: PipelineContext): PipelineContext {
    console.log(`[${this.name}] Starting validation of account definitions`);

    const validationErrors: string[] = [];
    const cfTargetAccounts: string[] = [];

    context.accounts.forEach((account) => {
      // 基本的な検証
      if (!account.id) {
        validationErrors.push(`Account without ID found`);
        return; // IDがない場合は以降の検証をスキップ
      }

      const accountId = account.id; // 型推論を助けるため

      if (!account.accountName) {
        validationErrors.push(`Account ${accountId} has no name`);
      }
      if (!account.sheet) {
        validationErrors.push(`Account ${accountId} has no sheet type`);
      }

      // フロー科目の検証
      if (isFlowAccount(account)) {
        this.validateFlowAccount(account, validationErrors, cfTargetAccounts);
      }

      // BS科目の検証
      if (isBSAccount(account)) {
        this.validateBSAccount(account, validationErrors, cfTargetAccounts);
      }

      // サマリー科目のパラメータ検証
      if (isSummaryAccount(account)) {
        this.validateSummaryAccount(account, validationErrors);
      }
    });

    if (validationErrors.length > 0) {
      console.error(
        `[${this.name}] Validation errors found:`,
        validationErrors
      );
      throw new Error(
        `Account validation failed: ${validationErrors.join(", ")}`
      );
    }

    console.log(
      `[${this.name}] Validation completed. CF target accounts: ${cfTargetAccounts.length}`
    );

    return {
      ...context,
      cfTargetAccounts, // CF生成対象となる科目IDのリスト
    };
  }

  private validateFlowAccount(
    account: FlowAccount,
    errors: string[],
    cfTargets: string[]
  ): void {
    // フロー科目のflowAccountCfImpactの検証
    if (!account.flowAccountCfImpact) {
      errors.push(`Flow account ${account.id} has no flowAccountCfImpact`);
      return;
    }

    // 明細科目でCFインパクトがある場合、CF生成対象
    if (
      isFlowDetailAccount(account) &&
      account.flowAccountCfImpact.type !== null
    ) {
      cfTargets.push(account.id);

      // 各CF影響タイプに応じた検証
      switch (account.flowAccountCfImpact.type) {
        case "ADJUSTMENT":
          if (!account.flowAccountCfImpact.adjustment?.targetId) {
            errors.push(
              `Flow account ${account.id} with ADJUSTMENT type has no targetId`
            );
          }
          if (!account.flowAccountCfImpact.adjustment?.operation) {
            errors.push(
              `Flow account ${account.id} with ADJUSTMENT type has no operation`
            );
          }
          break;

        case "RECLASSIFICATION":
          if (!account.flowAccountCfImpact.reclassification?.from) {
            errors.push(
              `Flow account ${account.id} with RECLASSIFICATION type has no 'from' field`
            );
          }
          if (!account.flowAccountCfImpact.reclassification?.to) {
            errors.push(
              `Flow account ${account.id} with RECLASSIFICATION type has no 'to' field`
            );
          }
          break;

        case "IS_BASE_PROFIT":
          if (!account.flowAccountCfImpact.isBaseProfit) {
            errors.push(
              `Flow account ${account.id} with IS_BASE_PROFIT type has isBaseProfit=false`
            );
          }
          break;
      }
    }
  }

  private validateBSAccount(
    account: BSAccount,
    errors: string[],
    cfTargets: string[]
  ): void {
    // BS科目のパラメータ検証
    if (!account.parameter) {
      errors.push(`BS account ${account.id} has no parameter`);
      return;
    }

    // BS明細科目でパラメータがnullでない場合、CF生成対象
    if (!account.isSummaryAccount && account.parameter.paramType !== null) {
      cfTargets.push(account.id);
    }

    // BS科目はflowAccountCfImpactを持たないことを確認
    if (account.flowAccountCfImpact.type !== null) {
      errors.push(
        `BS account ${account.id} should not have flowAccountCfImpact type`
      );
    }
  }

  private validateSummaryAccount(account: Account, errors: string[]): void {
    // サマリー科目は計算パラメータかNullパラメータのみ許可
    if (
      !isCalculationParameter(account.parameter) &&
      !isNullParameter(account.parameter)
    ) {
      errors.push(
        `Summary account ${account.id} has invalid parameter type: ${account.parameter.paramType}`
      );
    }

    // サマリー科目の計算パラメータに参照が設定されているか確認
    if (isCalculationParameter(account.parameter)) {
      if (
        !account.parameter.paramReferences ||
        account.parameter.paramReferences.length === 0
      ) {
        errors.push(
          `Summary account ${account.id} with CALCULATION parameter has no references`
        );
      }
    }
  }

  validate(context: PipelineContext): boolean {
    // 必須のコンテキストプロパティの存在確認
    return !!(
      context.accounts &&
      Array.isArray(context.accounts) &&
      context.accounts.length > 0
    );
  }
}
