export type ParameterConfig = 
  | { type: "比率"; value: number; referenceId: string }
  | { type: "成長率"; value: number }
  | { type: "他科目連動"; referenceId: string }
  | { type: "計算"; references: Array<{id: string; operation: "+" | "-" | "*" | "/"}>}
  | { type: "子科目合計" }
  | { type: "参照"; referenceId: string };

export interface Parameter {
  id: string;
  accountId: string;
  periodId: string;
  config: ParameterConfig;
  createdAt: Date;
  updatedAt: Date;
}

export type ParameterType = ParameterConfig["type"];

export interface CalculationContext {
  currentPeriodId: string;
  previousPeriodId?: string;
  accounts: Map<string, number>;
  parameters: Map<string, Parameter>;
}