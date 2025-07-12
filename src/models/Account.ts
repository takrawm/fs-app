import type { 
  Account, 
  SheetType, 
  DisplayOrder, 
  CfImpact,
  Parameter,
  CalculationContext,
  CalculationResult
} from "../types/account";
import { 
  SHEET_TYPES, 
  CF_IMPACT_TYPES
} from "../types/account";
import {
  PARAMETER_TYPES,
  OPERATIONS,
  isGrowthRateParameter,
  isChildrenSumParameter,
  isCalculationParameter,
  isPercentageParameter,
  isProportionateParameter,
  isNullParameter
} from "../types/parameter";

export class AccountModel implements Account {
  id: string;
  accountName: string;
  parentId: string | null;
  sheet: SheetType;
  isCredit: boolean | null;
  displayOrder: DisplayOrder;
  parameter: Parameter;
  cfImpact: CfImpact;
  
  // 追加のメタデータ
  createdAt: Date;
  updatedAt: Date;

  constructor(data: Partial<Account> & { accountName: string; sheet: SheetType }) {
    this.id = data.id || this.generateId();
    this.accountName = data.accountName;
    this.parentId = data.parentId ?? null;
    this.sheet = data.sheet;
    this.isCredit = data.isCredit ?? null;
    this.displayOrder = data.displayOrder || { order: "1", prefix: data.sheet };
    this.parameter = data.parameter || { 
      paramType: null, 
      paramValue: null,
      paramReferences: null
    };
    this.cfImpact = data.cfImpact || { type: CF_IMPACT_TYPES.ADJUSTMENT };
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }


  private generateId(): string {
    return `acc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  update(data: Partial<Account>): void {
    if (data.accountName !== undefined) this.accountName = data.accountName;
    if (data.parentId !== undefined) this.parentId = data.parentId;
    if (data.sheet !== undefined) this.sheet = data.sheet;
    if (data.isCredit !== undefined) this.isCredit = data.isCredit;
    if (data.displayOrder !== undefined) this.displayOrder = data.displayOrder;
    if (data.parameter !== undefined) this.parameter = data.parameter;
    if (data.cfImpact !== undefined) this.cfImpact = data.cfImpact;
    this.updatedAt = new Date();
  }

  // シートタイプ判定メソッド
  isPL(): boolean {
    return this.sheet === SHEET_TYPES.PL;
  }

  isBS(): boolean {
    return this.sheet === SHEET_TYPES.BS;
  }

  isCF(): boolean {
    return this.sheet === SHEET_TYPES.CF;
  }

  isPPE(): boolean {
    return this.sheet === SHEET_TYPES.PPE;
  }

  isFinancing(): boolean {
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

  // CFインパクト判定メソッド
  isBaseProfitForCF(): boolean {
    return this.cfImpact.type === CF_IMPACT_TYPES.IS_BASE_PROFIT;
  }

  isAdjustmentForCF(): boolean {
    return this.cfImpact.type === CF_IMPACT_TYPES.ADJUSTMENT;
  }

  isReclassificationForCF(): boolean {
    return this.cfImpact.type === CF_IMPACT_TYPES.RECLASSIFICATION;
  }

  // CFアイテム生成メソッド（新しい構造に対応）
  generateCFItem(): Partial<Account> | null {
    // CF科目自体や、CFインパクトが設定されていない場合はnull
    if (this.isCF() || !this.cfImpact) {
      return null;
    }

    // 調整項目の場合のみCFアイテムを生成
    if (this.cfImpact.type !== CF_IMPACT_TYPES.ADJUSTMENT) {
      return null;
    }

    const cfItemName = this.generateCFItemName();
    
    return {
      accountName: cfItemName,
      sheet: SHEET_TYPES.CF,
      isCredit: null, // CF項目は借方・貸方の概念なし
      parentId: this.id,
      displayOrder: {
        order: `CF${this.determinesCFSection()}01`,
        prefix: "CF"
      },
      parameter: {
        paramType: PARAMETER_TYPES.CALCULATION,
        paramValue: null,
        paramReferences: [{
          accountId: this.id,
          operation: OPERATIONS.ADD,
          lag: 0
        }]
      },
      cfImpact: {
        type: CF_IMPACT_TYPES.ADJUSTMENT,
        targetAccountIds: [this.id],
      }
    };
  }

  private generateCFItemName(): string {
    // BS項目の場合
    if (this.isBS()) {
      const prefix = this.isDebitAccount() ? "増加" : "減少";
      return `${this.accountName}の${prefix}`;
    }
    
    // PL項目の場合
    if (this.isPL()) {
      return `${this.accountName}（非現金項目）`;
    }
    
    return `${this.accountName}の変動`;
  }

  private determinesCFSection(): number {
    // 営業CF: 1, 投資CF: 2, 財務CF: 3
    if (this.sheet === SHEET_TYPES.PPE) return 2; // 投資CF
    if (this.sheet === SHEET_TYPES.FINANCING) return 3; // 財務CF
    return 1; // デフォルトは営業CF
  }

  private generateCFFormula(): string {
    // BS項目の増減を計算する式
    if (this.isBS()) {
      return `[${this.id}@current] - [${this.id}@previous]`;
    }
    
    // その他の項目
    return `[${this.id}]`;
  }

  // 計算実行メソッド
  calculate(context: CalculationContext): CalculationResult | null {
    if (this.hasNullParameter()) {
      return null;
    }

    // 成長率計算
    if (this.hasGrowthRateParameter() && isGrowthRateParameter(this.parameter)) {
      const previousValue = context.previousValues.get(this.id) || 0;
      const growthRate = this.parameter.paramValue;
      const currentValue = previousValue * (1 + growthRate);
      
      return {
        value: currentValue,
        formula: `${this.id}[t-1] × (1 + ${growthRate})`,
        references: [this.id]
      };
    }

    // 比率計算
    if (this.hasPercentageParameter() && isPercentageParameter(this.parameter)) {
      const baseAccountId = this.parameter.paramReferences.accountId;
      const baseValue = context.accountValues.get(baseAccountId) || 0;
      const percentage = this.parameter.paramValue;
      const currentValue = baseValue * percentage;
      
      return {
        value: currentValue,
        formula: `${baseAccountId} × ${percentage}`,
        references: [baseAccountId]
      };
    }

    // 連動計算（比率100%）
    if (this.hasProportionateParameter() && isProportionateParameter(this.parameter)) {
      const baseAccountId = this.parameter.paramReferences.accountId;
      const baseValue = context.accountValues.get(baseAccountId) || 0;
      
      return {
        value: baseValue,
        formula: baseAccountId,
        references: [baseAccountId]
      };
    }

    // 複数科目計算
    if (this.hasCalculationParameter() && isCalculationParameter(this.parameter)) {
      let result = 0;
      const formulaParts: string[] = [];
      const references: string[] = [];

      this.parameter.paramReferences.forEach((ref, index) => {
        const accountValue = context.accountValues.get(ref.accountId) || 0;
        references.push(ref.accountId);

        switch (ref.operation) {
          case OPERATIONS.ADD:
            result += accountValue;
            formulaParts.push(index === 0 ? ref.accountId : `+ ${ref.accountId}`);
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
        formula: formulaParts.join(' '),
        references
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
    let current: Account | undefined = this;
    
    while (current && current.parentId) {
      const parent = accounts.find(a => a.id === current!.parentId);
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
    
    if (!this.cfImpact) {
      errors.push("CFインパクトは必須です");
    }
    
    return errors;
  }

  // シリアライズメソッド
  toJSON(): Account {
    return {
      id: this.id,
      accountName: this.accountName,
      parentId: this.parentId,
      sheet: this.sheet,
      isCredit: this.isCredit,
      displayOrder: this.displayOrder,
      parameter: this.parameter,
      cfImpact: this.cfImpact
    };
  }
}