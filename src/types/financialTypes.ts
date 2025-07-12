export interface Period {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  order: number;
  isActual: boolean;
}

export interface FinancialModel {
  id: string;
  name: string;
  description?: string;
  periods: Period[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CalculationResult {
  accountId: string;
  periodId: string;
  value: number;
  formula?: string;
  dependencies: string[];
  calculatedAt: Date;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface CalculationError {
  accountId: string;
  periodId: string;
  error: string;
  stack?: string;
}