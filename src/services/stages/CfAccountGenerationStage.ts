import type { PipelineContext, PipelineStage } from "../CalculationPipeline";
import type {
  Account,
  CFDetailAccount,
  NullParameter,
  FlowAccountCfImpact,
  DisplayOrder,
} from "../../types/accountTypes";
import {
  SHEET_TYPES,
  CF_IMPACT_TYPES,
  isBSAccount,
  isFlowAccount,
  isFlowDetailAccount,
  isSummaryAccount,
} from "../../types/accountTypes";

/**
 * 財務諸表定義に基づき、CF（キャッシュフロー）科目を動的に生成するステージ
 */
export class CfAccountGenerationStage implements PipelineStage {
  name = "CfAccountGeneration";

  execute(context: PipelineContext): PipelineContext {
    console.log(`[${this.name}] Starting CF account generation`);

    const { accounts } = context;
    const generatedCfAccounts: Account[] = [];
    const processedAccountIds = new Set<string>();

    // 既存のCF科目を除外した科目リストを処理
    const nonCfAccounts = accounts.filter(
      (account) => account.sheet !== SHEET_TYPES.CF
    );

    for (const account of nonCfAccounts) {
      // 重複処理を防ぐ
      if (processedAccountIds.has(account.id)) {
        continue;
      }

      const cfAccount = this.generateCfAccount(account);
      if (cfAccount) {
        generatedCfAccounts.push(cfAccount);
        processedAccountIds.add(account.id);
      }
    }

    console.log(
      `[${this.name}] Generated ${generatedCfAccounts.length} CF accounts`
    );

    // 生成されたCF科目を既存の科目リストに追加
    const updatedAccounts = [...accounts, ...generatedCfAccounts];

    return {
      ...context,
      accounts: updatedAccounts,
      cfGeneratedAccounts: generatedCfAccounts,
    };
  }

  private generateCfAccount(account: Account): CFDetailAccount | null {
    // サマリー科目はCF生成対象外
    if (isSummaryAccount(account)) {
      return null;
    }

    // BS科目の判定
    if (isBSAccount(account)) {
      // BS科目でパラメータがnullの場合は対象外
      if (account.parameter.paramType === null) {
        return null;
      }

      // BS科目のCF科目を生成
      return this.createBsCfAccount(account);
    }

    // フロー科目（PL、PPE、FINANCING）の判定
    if (isFlowAccount(account) && isFlowDetailAccount(account)) {
      // flowAccountCfImpact.typeがnullの場合は対象外
      if (account.flowAccountCfImpact.type === null) {
        return null;
      }

      // フロー科目のCF科目を生成
      return this.createFlowCfAccount(account);
    }

    return null;
  }

  private createBsCfAccount(account: Account): CFDetailAccount {
    const cfAccountName = `${account.accountName}の変動`;
    const cfAccountId = `cf_${account.id}`;

    const nullParameter: NullParameter = {
      paramType: null,
      paramValue: null,
      paramReferences: null,
    };

    const noCfImpact: FlowAccountCfImpact = {
      type: null,
    };

    const displayOrder: DisplayOrder = {
      order: this.generateCfDisplayOrder(account, "BS"),
      prefix: "CF",
    };

    const cfAccount: CFDetailAccount = {
      id: cfAccountId,
      accountName: cfAccountName,
      parentId: this.determineCfParentId(account),
      isSummaryAccount: false,
      sheet: SHEET_TYPES.CF,
      isCredit: null, // CF科目は借方・貸方の概念なし
      displayOrder,
      parameter: nullParameter,
      flowAccountCfImpact: noCfImpact,
    };

    return cfAccount;
  }

  private createFlowCfAccount(account: Account): CFDetailAccount {
    const cfAccountName = `${account.accountName}(CF)`;
    const cfAccountId = `cf_${account.id}`;

    const nullParameter: NullParameter = {
      paramType: null,
      paramValue: null,
      paramReferences: null,
    };

    const noCfImpact: FlowAccountCfImpact = {
      type: null,
    };

    const displayOrder: DisplayOrder = {
      order: this.generateCfDisplayOrder(account, "FLOW"),
      prefix: "CF",
    };

    const cfAccount: CFDetailAccount = {
      id: cfAccountId,
      accountName: cfAccountName,
      parentId: this.determineCfParentId(account),
      isSummaryAccount: false,
      sheet: SHEET_TYPES.CF,
      isCredit: null,
      displayOrder,
      parameter: nullParameter,
      flowAccountCfImpact: noCfImpact,
    };

    return cfAccount;
  }

  private generateCfDisplayOrder(
    account: Account,
    type: "BS" | "FLOW"
  ): string {
    // CFセクションの判定
    const section = this.determineCfSection(account);

    // タイプに応じた順序プレフィックス
    const typePrefix = type === "BS" ? "1" : "2";

    // 元の表示順序を利用して一意性を保つ
    const originalOrder = account.displayOrder?.order || "00";

    return `${section}${typePrefix}${originalOrder}`;
  }

  private determineCfSection(account: Account): string {
    // デフォルトは営業活動（J1）
    let section = "J1";

    // BS科目の場合
    if (isBSAccount(account)) {
      // 固定資産系は投資活動（J2）
      if (
        account.accountName.includes("固定資産") ||
        account.accountName.includes("投資") ||
        account.accountName.includes("有価証券")
      ) {
        section = "J2";
      }
      // 負債・資本系は財務活動（J3）
      else if (
        account.accountName.includes("借入") ||
        account.accountName.includes("社債") ||
        account.accountName.includes("資本")
      ) {
        section = "J3";
      }
    }

    // PPE科目は投資活動（J2）
    if (account.sheet === SHEET_TYPES.PPE) {
      section = "J2";
    }

    // FINANCING科目は財務活動（J3）
    if (account.sheet === SHEET_TYPES.FINANCING) {
      section = "J3";
    }

    return section;
  }

  private determineCfParentId(account: Account): string {
    const section = this.determineCfSection(account);

    switch (section) {
      case "J1":
        return "cf-operating"; // 営業活動によるCF
      case "J2":
        return "cf-investing"; // 投資活動によるCF
      case "J3":
        return "cf-financing"; // 財務活動によるCF
      default:
        return "cf-operating";
    }
  }

  validate(context: PipelineContext): boolean {
    return !!(
      context.accounts &&
      Array.isArray(context.accounts) &&
      context.accounts.length > 0
    );
  }
}
