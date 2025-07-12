// @ts-nocheck
// TODO: accountTypes.tsの型定義に合わせて修正が必要
import type { Account, Period, Parameter } from "../types/accountTypes";
import accountsData from "./accounts.json";
import periodsData from "./periods.json";
import parametersData from "./parameters.json";

// Seed データ読み込みクラス
export class SeedDataLoader {
  private static instance: SeedDataLoader;
  private accounts: Account[] = [];
  private periods: Period[] = [];
  private parameterMap: Map<string, Record<string, Parameter>> = new Map();

  private constructor() {
    this.loadData();
  }

  public static getInstance(): SeedDataLoader {
    if (!SeedDataLoader.instance) {
      SeedDataLoader.instance = new SeedDataLoader();
    }
    return SeedDataLoader.instance;
  }

  private loadData(): void {
    // アカウントデータの読み込み
    this.accounts = accountsData as Account[];

    // 期間データの読み込み
    this.periods = periodsData as Period[];

    // パラメータデータの読み込みと変換
    this.loadParameters();
  }

  private loadParameters(): void {
    parametersData.forEach((item: any) => {
      const accountId = item.accountId;
      const parameters: Record<string, Parameter> = {};

      Object.entries(item.parameters).forEach(([key, param]) => {
        parameters[key] = param as Parameter;
      });

      this.parameterMap.set(accountId, parameters);
    });
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
    return this.periods.find(
      (period) => period.year === year && period.month === month
    );
  }

  // パラメータ取得メソッド
  public getParametersForAccount(
    accountId: string
  ): Record<string, Parameter> | undefined {
    return this.parameterMap.get(accountId);
  }

  public getParameter(
    accountId: string,
    parameterKey: string
  ): Parameter | undefined {
    const params = this.parameterMap.get(accountId);
    return params ? params[parameterKey] : undefined;
  }

  public getDefaultParameter(accountId: string): Parameter | undefined {
    return this.getParameter(accountId, "default");
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

      // パラメータの依存関係確認
      if (account.parameter.type === "formula") {
        account.parameter.dependencies.forEach((depId) => {
          if (!this.getAccountById(depId)) {
            warnings.push(
              `Account ${account.id} has dependency on non-existent account: ${depId}`
            );
          }
        });
      }

      // CF影響の対象アカウント確認
      if (account.cfImpact.targetAccountIds) {
        account.cfImpact.targetAccountIds.forEach((targetId) => {
          if (!this.getAccountById(targetId)) {
            warnings.push(
              `Account ${account.id} has CF impact on non-existent account: ${targetId}`
            );
          }
        });
      }
    });

    return { errors, warnings, isValid: errors.length === 0 };
  }

  // データリセット（テスト用）
  public reset(): void {
    this.accounts = [];
    this.periods = [];
    this.parameterMap.clear();
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
