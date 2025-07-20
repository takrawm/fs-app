import type {
  Account,
  BSAccount,
  FlowAccount,
  CFAccount,
  SheetType,
  DisplayOrder,
  FlowAccountCfImpact,
  Parameter,
} from "../types/accountTypes";
import type {
  CalculationContext,
  CalculationResult,
} from "../types/calculationTypes";
import { SHEET_TYPES, CF_IMPACT_TYPES } from "../types/accountTypes";
import {
  OPERATIONS,
  isGrowthRateParameter,
  isChildrenSumParameter,
  isCalculationParameter,
  isPercentageParameter,
  isProportionateParameter,
  isNullParameter,
} from "../types/accountTypes";

export class AccountModel {
  id: string;
  accountName: string;
  parentId: string | null;
  isSummaryAccount: boolean;
  sheet: SheetType;
  isCredit: boolean | null;
  displayOrder: DisplayOrder;
  parameter: Parameter;
  flowAccountCfImpact: FlowAccountCfImpact;

  constructor(
    data: Partial<Account> & { accountName: string; sheet: SheetType }
  ) {
    this.id = data.id || this.generateId();
    this.accountName = data.accountName;
    this.parentId = data.parentId ?? null;
    this.isSummaryAccount = data.isSummaryAccount ?? false;
    this.sheet = data.sheet;
    this.isCredit = data.isCredit ?? null;
    this.displayOrder = data.displayOrder || { order: "1", prefix: data.sheet };
    this.parameter = data.parameter || {
      paramType: null,
      paramValue: null,
      paramReferences: null,
    };
    this.flowAccountCfImpact = data.flowAccountCfImpact || { type: null };
  }

  private generateId(): string {
    return `acc_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  update(data: Partial<Account>): void {
    if (data.accountName !== undefined) this.accountName = data.accountName;
    if (data.parentId !== undefined) this.parentId = data.parentId;
    if (data.isSummaryAccount !== undefined)
      this.isSummaryAccount = data.isSummaryAccount;
    if (data.sheet !== undefined) this.sheet = data.sheet;
    if (data.isCredit !== undefined) this.isCredit = data.isCredit;
    if (data.displayOrder !== undefined) this.displayOrder = data.displayOrder;
    if (data.parameter !== undefined) this.parameter = data.parameter;
    if (data.flowAccountCfImpact !== undefined)
      this.flowAccountCfImpact = data.flowAccountCfImpact;
  }

  // シートタイプ判定メソッド
  isPLSheet(): boolean {
    return this.sheet === SHEET_TYPES.PL;
  }

  isBSSheet(): boolean {
    return this.sheet === SHEET_TYPES.BS;
  }

  isCFSheet(): boolean {
    return this.sheet === SHEET_TYPES.CF;
  }

  isPPESheet(): boolean {
    return this.sheet === SHEET_TYPES.PPE;
  }

  isFinancingSheet(): boolean {
    return this.sheet === SHEET_TYPES.FINANCING;
  }

  // 借方・貸方判定メソッド
  isDebitAccount(): boolean {
    return this.isCredit === false;
  }

  isCreditAccount(): boolean {
    return this.isCredit === true;
  }

  isNeutralAccount(): boolean {
    return this.isCredit === null;
  }

  // パラメータタイプ判定メソッド
  hasGrowthRateParameter(): boolean {
    return isGrowthRateParameter(this.parameter);
  }

  hasChildrenSumParameter(): boolean {
    return isChildrenSumParameter(this.parameter);
  }

  hasCalculationParameter(): boolean {
    return isCalculationParameter(this.parameter);
  }

  hasPercentageParameter(): boolean {
    return isPercentageParameter(this.parameter);
  }

  hasProportionateParameter(): boolean {
    return isProportionateParameter(this.parameter);
  }

  hasNullParameter(): boolean {
    return isNullParameter(this.parameter);
  }

  // フローアカウントCFインパクト判定メソッド
  isBaseProfitForCF(): boolean {
    return this.flowAccountCfImpact.type === CF_IMPACT_TYPES.IS_BASE_PROFIT;
  }

  isAdjustmentForCF(): boolean {
    return this.flowAccountCfImpact.type === CF_IMPACT_TYPES.ADJUSTMENT;
  }

  isReclassificationForCF(): boolean {
    return this.flowAccountCfImpact.type === CF_IMPACT_TYPES.RECLASSIFICATION;
  }

  // CFアイテム生成メソッド（新しい構造に対応）
  generateCFItem(): Partial<Account> | null {
    // 1. サマリー科目は対象外
    if (this.isSummaryAccount) {
      return null;
    }

    // 4. CF科目は対象外
    if (this.isCFSheet()) {
      return null;
    }

    // 2. FlowAccount（PL、PPE、FINANCING）の場合
    if (this.isPLSheet() || this.isPPESheet() || this.isFinancingSheet()) {
      // FlowAccountCfImpactが設定されていない場合は対象外
      if (this.flowAccountCfImpact.type === null) {
        return null;
      }
    }

    // 3. BS科目の場合
    if (this.isBSSheet()) {
      // ParameterがNullParameterの場合は対象外
      if (this.parameter.paramType === null) {
        return null;
      }
    }

    const cfItemName = this.generateCFItemName();

    return {
      accountName: cfItemName,
      sheet: SHEET_TYPES.CF,
      isSummaryAccount: false,
      isCredit: null, // CF項目は借方・貸方の概念なし
      parentId: "cf-operating",
      displayOrder: {
        order: `J${this.determinesCFSection()}01`,
        prefix: "J",
      },
      parameter: {
        paramType: null,
        paramValue: null,
        paramReferences: null,
      },
      flowAccountCfImpact: {
        type: null,
      },
    };
  }

  private generateCFItemName(): string {
    // BS科目の場合
    if (this.isBSSheet()) {
      return `${this.accountName}の変動`;
    }

    // FlowAccount（PL、PPE、FINANCING）の場合
    if (this.isPLSheet() || this.isPPESheet() || this.isFinancingSheet()) {
      return `${this.accountName}（CF）`;
    }

    // デフォルト（念のため）
    return `${this.accountName}の変動`;
  }

  private determinesCFSection(): string {
    // FlowAccount（PL、PPE、FINANCING）の場合
    if (this.isPLSheet() || this.isPPESheet() || this.isFinancingSheet()) {
      if (this.sheet === SHEET_TYPES.PPE) return "2"; // 投資CF
      if (this.sheet === SHEET_TYPES.FINANCING) return "3"; // 財務CF
      return "1"; // PL項目は営業CF
    }

    // BSAccount の場合
    if (this.isBSSheet()) {
      return "4"; // BS変動項目は最後
    }

    return "1"; // デフォルト
  }

  // 計算実行メソッド
  calculate(context: CalculationContext): CalculationResult | null {
    if (this.hasNullParameter()) {
      return null;
    }

    // 成長率計算
    if (
      this.hasGrowthRateParameter() &&
      isGrowthRateParameter(this.parameter)
    ) {
      const previousValue = context.getPreviousValue(this.id) || 0;
      const growthRate = this.parameter.paramValue;
      const currentValue = previousValue * (1 + growthRate);

      return {
        value: currentValue,
        formula: `${this.id}[t-1] × (1 + ${growthRate})`,
        references: [this.id],
      };
    }

    // 比率計算
    if (
      this.hasPercentageParameter() &&
      isPercentageParameter(this.parameter)
    ) {
      const baseAccountId = this.parameter.paramReferences.accountId;
      const baseValue = context.getValue(baseAccountId) || 0;
      const percentage = this.parameter.paramValue;
      const currentValue = baseValue * percentage;

      return {
        value: currentValue,
        formula: `${baseAccountId} × ${percentage}`,
        references: [baseAccountId],
      };
    }

    // 連動計算（比率100%）
    if (
      this.hasProportionateParameter() &&
      isProportionateParameter(this.parameter)
    ) {
      const baseAccountId = this.parameter.paramReferences.accountId;
      const baseValue = context.getValue(baseAccountId) || 0;

      return {
        value: baseValue,
        formula: baseAccountId,
        references: [baseAccountId],
      };
    }

    // 複数科目計算
    if (
      this.hasCalculationParameter() &&
      isCalculationParameter(this.parameter)
    ) {
      let result = 0;
      const formulaParts: string[] = [];
      const references: string[] = [];

      this.parameter.paramReferences.forEach((ref, index) => {
        const accountValue = context.getValue(ref.accountId) || 0;
        references.push(ref.accountId);

        switch (ref.operation) {
          case OPERATIONS.ADD:
            result += accountValue;
            formulaParts.push(
              index === 0 ? ref.accountId : `+ ${ref.accountId}`
            );
            break;
          case OPERATIONS.SUB:
            result -= accountValue;
            formulaParts.push(`- ${ref.accountId}`);
            break;
          case OPERATIONS.MUL:
            result *= accountValue;
            formulaParts.push(`× ${ref.accountId}`);
            break;
          case OPERATIONS.DIV:
            if (accountValue !== 0) {
              result /= accountValue;
              formulaParts.push(`÷ ${ref.accountId}`);
            }
            break;
        }
      });

      return {
        value: result,
        formula: formulaParts.join(" "),
        references,
      };
    }

    // 子科目合計
    if (this.hasChildrenSumParameter()) {
      // 子科目の合計ロジックは別途実装が必要
      return null;
    }

    return null;
  }

  // 表示用メソッド
  getFullPath(accounts: Account[]): string {
    const path: string[] = [this.accountName];
    let current: Account | undefined = this.toJSON();

    while (current && current.parentId) {
      const parent = accounts.find((a) => a.id === current!.parentId);
      if (parent) {
        path.unshift(parent.accountName);
        current = parent;
      } else {
        break;
      }
    }

    return path.join(" > ");
  }

  // バリデーションメソッド
  validate(): string[] {
    const errors: string[] = [];

    if (!this.accountName || this.accountName.trim() === "") {
      errors.push("勘定科目名は必須です");
    }

    if (!this.sheet) {
      errors.push("シートタイプは必須です");
    }

    if (!this.parameter) {
      errors.push("パラメータは必須です");
    }

    if (!this.flowAccountCfImpact) {
      errors.push("CFインパクトは必須です");
    }

    return errors;
  }

  // シリアライズメソッド
  toJSON(): BSAccount | FlowAccount | CFAccount {
    return {
      id: this.id,
      accountName: this.accountName,
      parentId: this.parentId,
      isSummaryAccount: this.isSummaryAccount,
      sheet: this.sheet,
      isCredit: this.isCredit,
      displayOrder: this.displayOrder,
      parameter: this.parameter,
      flowAccountCfImpact: this.flowAccountCfImpact,
    } as BSAccount | FlowAccount | CFAccount;
  }
}
