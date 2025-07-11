export type AccountCategory = "資産" | "負債" | "純資産" | "収益" | "費用";
export type AccountDetailType = "流動" | "固定" | "営業" | "営業外" | "特別";
export type CFItemType = "営業CF" | "投資CF" | "財務CF";

export interface Account {
  id: string;
  name: string;
  category: AccountCategory;
  detailType?: AccountDetailType;
  parentId?: string;
  isCFItem: boolean;
  cfItemType?: CFItemType;
  createdAt: Date;
  updatedAt: Date;
}

export interface AccountValue {
  accountId: string;
  periodId: string;
  value: number;
  calculatedAt: Date;
}

export interface AccountRelation {
  fromAccountId: string;
  toAccountId: string;
  relationType: "parent-child" | "reference" | "cf-mapping";
}