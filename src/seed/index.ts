import type { Account } from "../types/accountTypes";
import type { Period } from "../types/periodTypes";
import type { FinancialValue } from "../types/financialValueTypes";
import { isReclassificationImpact } from "../types/accountTypes";
import accountsData from "./accounts.json";
import periodsData from "./periods.json";
import financialValuesData from "./financialValues.json";

// Seed データ読み込みクラス
export class SeedDataLoader {
  //  「クラスレベル」のstaticプロパティ（全インスタンスで共有）
  private static instance: SeedDataLoader;
  private accounts: Account[] = [];
  private periods: Period[] = [];
  private financialValues: FinancialValue[] = [];

  private constructor() {
    this.loadData();
  }

  public static getInstance(): SeedDataLoader {
    if (!SeedDataLoader.instance) {
      // private constructor()が呼ばれ、即座にthis.loadData()が実行される
      SeedDataLoader.instance = new SeedDataLoader();
    }
    // staticプロパティの活用
    return SeedDataLoader.instance;
  }

  private loadData(): void {
    // アカウントデータの読み込み
    this.accounts = accountsData as Account[];

    // 期間データの読み込み
    this.periods = periodsData as Period[];

    // 財務数値データの読み込み
    this.financialValues = financialValuesData as FinancialValue[];
  }

  // アカウント取得メソッド
  public getAccounts(): Account[] {
    return [...this.accounts];
  }

  public getAccountById(id: string): Account | undefined {
    return this.accounts.find((account) => account.id === id);
  }

  public getAccountsBySheet(sheet: string): Account[] {
    return this.accounts.filter((account) => account.sheet === sheet);
  }

  public getChildAccounts(parentId: string): Account[] {
    return this.accounts.filter((account) => account.parentId === parentId);
  }

  // 期間取得メソッド
  public getPeriods(): Period[] {
    return [...this.periods];
  }

  public getPeriodById(id: string): Period | undefined {
    return this.periods.find((period) => period.id === id);
  }

  public getHistoricalPeriods(): Period[] {
    return this.periods.filter((period) => period.isAnnual);
  }

  public getForecastPeriods(): Period[] {
    return this.periods.filter((period) => period.isForecast);
  }

  public getPeriodByYearMonth(year: number, month: number): Period | undefined {
    return this.periods.find((p) => p.year === year && p.month === month);
  }

  // ========== 財務数値関連のメソッド ==========
  public getFinancialValues(): FinancialValue[] {
    return this.financialValues;
  }

  public getFinancialValue(
    accountId: string,
    periodId: string
  ): FinancialValue | undefined {
    return this.financialValues.find(
      (fv) => fv.accountId === accountId && fv.periodId === periodId
    );
  }

  public getFinancialValuesByAccount(accountId: string): FinancialValue[] {
    return this.financialValues.filter((fv) => fv.accountId === accountId);
  }

  public getFinancialValuesByPeriod(periodId: string): FinancialValue[] {
    return this.financialValues.filter((fv) => fv.periodId === periodId);
  }

  public getCalculatedFinancialValues(): FinancialValue[] {
    return this.financialValues.filter((fv) => fv.isCalculated);
  }

  public getManualFinancialValues(): FinancialValue[] {
    return this.financialValues.filter((fv) => !fv.isCalculated);
  }

  // ヘルパーメソッド
  public getRootAccounts(): Account[] {
    return this.accounts.filter((account) => account.parentId === null);
  }

  public getAccountTree(rootId?: string): AccountTreeNode[] {
    const buildTree = (parentId: string | null): AccountTreeNode[] => {
      const accounts = parentId
        ? this.getChildAccounts(parentId)
        : this.getRootAccounts();

      return accounts.map((account) => ({
        account,
        children: buildTree(account.id),
      }));
    };

    if (rootId) {
      const root = this.getAccountById(rootId);
      if (!root) return [];
      return [
        {
          account: root,
          children: buildTree(rootId),
        },
      ];
    }

    return buildTree(null);
  }

  // データ検証メソッド
  public validateData(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // アカウントの検証
    this.accounts.forEach((account) => {
      // 親アカウントの存在確認
      if (account.parentId && !this.getAccountById(account.parentId)) {
        errors.push(
          `Account ${account.id} has invalid parentId: ${account.parentId}`
        );
      }

      // CF影響の対象アカウント確認
      if (isReclassificationImpact(account.flowAccountCfImpact)) {
        const { from, to } = account.flowAccountCfImpact.reclassification;
        if (!this.getAccountById(from)) {
          warnings.push(
            `Account ${account.id} has CF reclassification from non-existent account: ${from}`
          );
        }
        if (!this.getAccountById(to)) {
          warnings.push(
            `Account ${account.id} has CF reclassification to non-existent account: ${to}`
          );
        }
      }
    });

    return { errors, warnings, isValid: errors.length === 0 };
  }

  // データリセット（テスト用）
  public reset(): void {
    this.accounts = [];
    this.periods = [];
    this.loadData();
  }
}

// 型定義
interface AccountTreeNode {
  account: Account;
  children: AccountTreeNode[];
}

interface ValidationResult {
  errors: string[];
  warnings: string[];
  isValid: boolean;
}

// シングルトンインスタンスのエクスポート
export const seedDataLoader = SeedDataLoader.getInstance();

// 便利な関数のエクスポート
export const getSeedAccounts = () => seedDataLoader.getAccounts();
export const getSeedPeriods = () => seedDataLoader.getPeriods();
export const getSeedAccountById = (id: string) =>
  seedDataLoader.getAccountById(id);
export const getSeedPeriodById = (id: string) =>
  seedDataLoader.getPeriodById(id);
export const getSeedFinancialValues = () => seedDataLoader.getFinancialValues();
export const getSeedFinancialValue = (accountId: string, periodId: string) =>
  seedDataLoader.getFinancialValue(accountId, periodId);
