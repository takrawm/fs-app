export interface AccountRelation {
  fromAccountId: string;
  toAccountId: string;
  relationType: "parent-child" | "cf-mapping";
}