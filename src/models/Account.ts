import type { Account, AccountCategory, AccountDetailType, CFItemType } from "../types/account";

export class AccountModel implements Account {
  id: string;
  name: string;
  category: AccountCategory;
  detailType?: AccountDetailType;
  parentId?: string;
  isCFItem: boolean;
  cfItemType?: CFItemType;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: Partial<Account> & { name: string; category: AccountCategory }) {
    this.id = data.id || this.generateId();
    this.name = data.name;
    this.category = data.category;
    this.detailType = data.detailType;
    this.parentId = data.parentId;
    this.isCFItem = data.isCFItem || false;
    this.cfItemType = data.cfItemType;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  private generateId(): string {
    return `acc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  update(data: Partial<Account>): void {
    Object.assign(this, data);
    this.updatedAt = new Date();
  }

  isAsset(): boolean {
    return this.category === "資産";
  }

  isLiability(): boolean {
    return this.category === "負債";
  }

  isEquity(): boolean {
    return this.category === "純資産";
  }

  isRevenue(): boolean {
    return this.category === "収益";
  }

  isExpense(): boolean {
    return this.category === "費用";
  }

  isBSAccount(): boolean {
    return this.isAsset() || this.isLiability() || this.isEquity();
  }

  isPLAccount(): boolean {
    return this.isRevenue() || this.isExpense();
  }

  generateCFItem(): Partial<Account> | null {
    if (!this.isBSAccount() || this.isCFItem) {
      return null;
    }

    const cfItemType = this.determineCFItemType();
    if (!cfItemType) return null;

    const cfItemName = this.generateCFItemName();
    
    return {
      name: cfItemName,
      category: "費用",
      isCFItem: true,
      cfItemType,
      parentId: this.id,
    };
  }

  private determineCFItemType(): CFItemType | null {
    if (!this.detailType) return null;

    if (this.detailType === "流動") {
      return "営業CF";
    } else if (this.detailType === "固定") {
      return "投資CF";
    }

    return null;
  }

  private generateCFItemName(): string {
    if (this.isAsset()) {
      return `${this.name}の増加`;
    } else if (this.isLiability() || this.isEquity()) {
      return `${this.name}の増加`;
    }
    return `${this.name}の変動`;
  }
}