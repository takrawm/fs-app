import type { 
  Account, 
  SheetType, 
  DisplayOrder, 
  CfImpact,
  isPLAccount as isPLAccountType,
  isBSAccount as isBSAccountType,
  isCFAccount as isCFAccountType,
  LegacyAccount
} from "../types/account";
import type { Parameter } from "../types/parameter";
import { 
  SHEET_TYPES, 
  CF_IMPACT_TYPES,
  isConstantParameter,
  isPercentageParameter,
  isFormulaParameter,
  isDaysParameter,
  migrateOldAccountToNew
} from "../types/newFinancialTypes";
import { DEFAULT_DISPLAY_ORDER, DEFAULT_CF_IMPACT } from "../utils/constants";

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
    this.displayOrder = data.displayOrder || { ...DEFAULT_DISPLAY_ORDER };
    this.parameter = data.parameter || { 
      type: "constant", 
      value: 0, 
      description: "デフォルトパラメータ" 
    };
    this.cfImpact = data.cfImpact || { ...DEFAULT_CF_IMPACT };
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  // 既存のLegacyAccountからの移行用コンストラクタ
  static fromLegacy(legacyAccount: LegacyAccount): AccountModel {
    const newAccount = migrateOldAccountToNew(legacyAccount);
    return new AccountModel(newAccount);
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
  hasConstantParameter(): boolean {
    return isConstantParameter(this.parameter);
  }

  hasPercentageParameter(): boolean {
    return isPercentageParameter(this.parameter);
  }

  hasFormulaParameter(): boolean {
    return isFormulaParameter(this.parameter);
  }

  hasDaysParameter(): boolean {
    return isDaysParameter(this.parameter);
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
        sheetOrder: 3, // CFシートの順序
        sectionOrder: this.determinesCFSection(),
        itemOrder: 1
      },
      parameter: {
        type: "formula",
        formula: this.generateCFFormula(),
        dependencies: [this.id],
        description: `${this.accountName}のCF影響`
      },
      cfImpact: {
        type: CF_IMPACT_TYPES.ADJUSTMENT,
        targetAccountIds: [this.id],
        description: `${this.accountName}の変動によるCF調整`
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