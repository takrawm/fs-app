// @ts-nocheck
// TODO: accountTypes.tsの型定義に合わせて修正が必要
/**
 * アカウントデータ移行スクリプト
 * 既存のaccounts.jsonとparameters.jsonを統合し、新しい型定義に準拠したaccounts.jsonを生成
 */

import * as fs from "fs";
import * as path from "path";
import { SeedDataValidator } from "../utils/seedDataValidator";
import type {
  Account,
  SheetType,
  DisplayOrder,
  CfImpact,
} from "../types/accountTypes";
import type { Parameter } from "../types/accountTypes";
import {
  SHEET_TYPES,
  CF_IMPACT_TYPES,
  PARAMETER_TYPES,
  type ConstantParameter,
  type PercentageParameter,
  type PercentageOfRevenueParameter,
  type DaysParameter,
  type ManualInputParameter,
  type FormulaParameter,
} from "../types/newFinancialTypes";

interface MigrationLog {
  timestamp: string;
  action: string;
  details: any;
}

interface MigrationResult {
  success: boolean;
  accountsCount: number;
  errors: string[];
  warnings: string[];
  logs: MigrationLog[];
}

class AccountDataMigrator {
  private oldAccountsPath = path.join(process.cwd(), "src/seed/accounts.json");
  private parametersPath = path.join(process.cwd(), "src/seed/parameters.json");
  private newAccountsPath = path.join(
    process.cwd(),
    "src/seed/accounts.new.json"
  );
  private backupPath = path.join(
    process.cwd(),
    "src/seed/accounts.backup.json"
  );

  private oldAccounts: any[] = [];
  private parameters: any[] = [];
  private newAccounts: Account[] = [];
  private migrationLogs: MigrationLog[] = [];
  private errors: string[] = [];
  private warnings: string[] = [];

  constructor() {}

  async migrate(): Promise<MigrationResult> {
    console.log("=== アカウントデータ移行開始 ===\n");

    try {
      // 1. データの読み込み
      await this.loadData();

      // 2. バックアップの作成
      await this.createBackup();

      // 3. データの移行
      await this.migrateAccounts();

      // 4. 検証
      const isValid = await this.validateNewData();

      // 5. 保存
      if (isValid) {
        await this.saveNewData();
      }

      return {
        success: isValid,
        accountsCount: this.newAccounts.length,
        errors: this.errors,
        warnings: this.warnings,
        logs: this.migrationLogs,
      };
    } catch (error) {
      this.logError("移行処理エラー", error);
      return {
        success: false,
        accountsCount: 0,
        errors: this.errors,
        warnings: this.warnings,
        logs: this.migrationLogs,
      };
    }
  }

  private async loadData(): Promise<void> {
    console.log("データファイルの読み込み中...");

    // accounts.json
    const accountsData = fs.readFileSync(this.oldAccountsPath, "utf-8");
    this.oldAccounts = JSON.parse(accountsData);
    console.log(`✓ accounts.json: ${this.oldAccounts.length}件`);

    // parameters.json
    const parametersData = fs.readFileSync(this.parametersPath, "utf-8");
    this.parameters = JSON.parse(parametersData);
    console.log(`✓ parameters.json: ${this.parameters.length}件`);
    console.log("");
  }

  private async createBackup(): Promise<void> {
    console.log("バックアップを作成中...");
    fs.copyFileSync(this.oldAccountsPath, this.backupPath);
    console.log(`✓ バックアップ作成: ${this.backupPath}\n`);
    this.log("バックアップ作成", { path: this.backupPath });
  }

  private async migrateAccounts(): Promise<void> {
    console.log("アカウントデータの移行中...");

    // パラメータマップの作成
    const paramMap = new Map<string, any>();
    this.parameters.forEach((p) => {
      if (p.accountId && p.parameters) {
        paramMap.set(p.accountId, p.parameters);
      }
    });

    // 各アカウントの移行
    for (const oldAccount of this.oldAccounts) {
      try {
        const newAccount = this.migrateAccount(oldAccount, paramMap);
        this.newAccounts.push(newAccount);
        console.log(`✓ ${oldAccount.id}: ${oldAccount.accountName}`);
      } catch (error) {
        this.logError(`アカウント移行エラー: ${oldAccount.id}`, error);
      }
    }

    // 不足しているアカウントの追加（必要に応じて）
    this.addMissingAccounts();

    console.log(`\n移行完了: ${this.newAccounts.length}件のアカウント\n`);
  }

  private migrateAccount(oldAccount: any, paramMap: Map<string, any>): Account {
    // 基本情報の移行
    const account: Account = {
      id: oldAccount.id,
      accountName: oldAccount.accountName,
      parentId: oldAccount.parentId || null,
      sheet: this.migrateSheetType(oldAccount.sheet),
      isCredit: oldAccount.isCredit ?? null,
      displayOrder: this.migrateDisplayOrder(oldAccount.displayOrder),
      parameter: this.migrateParameter(oldAccount, paramMap),
      cfImpact: this.migrateCfImpact(oldAccount.cfImpact),
    };

    this.log("アカウント移行", {
      id: account.id,
      name: account.accountName,
      oldSheet: oldAccount.sheet,
      newSheet: account.sheet,
    });

    return account;
  }

  private migrateSheetType(oldSheet: string): SheetType {
    // シートタイプの正規化
    const sheetMap: Record<string, SheetType> = {
      PL: SHEET_TYPES.PL,
      BS: SHEET_TYPES.BS,
      CF: SHEET_TYPES.CF,
      PPE: SHEET_TYPES.PPE,
      FINANCING: SHEET_TYPES.FINANCING,
      Financing: SHEET_TYPES.FINANCING, // 大文字小文字の修正
    };

    const newSheet = sheetMap[oldSheet];
    if (!newSheet) {
      this.logWarning(`不明なシートタイプ: ${oldSheet}`, { oldSheet });
      return SHEET_TYPES.BS; // デフォルト
    }

    return newSheet;
  }

  private migrateDisplayOrder(oldDisplayOrder: any): DisplayOrder {
    if (
      oldDisplayOrder &&
      typeof oldDisplayOrder.sheetOrder === "number" &&
      typeof oldDisplayOrder.sectionOrder === "number" &&
      typeof oldDisplayOrder.itemOrder === "number"
    ) {
      return oldDisplayOrder;
    }

    // デフォルト値
    return {
      sheetOrder: 1,
      sectionOrder: 1,
      itemOrder: 1,
    };
  }

  private migrateParameter(
    oldAccount: any,
    paramMap: Map<string, any>
  ): Parameter {
    // アカウント内のパラメータを優先
    let param = oldAccount.parameter;

    // parameters.json から追加情報を取得
    const additionalParams = paramMap.get(oldAccount.id);
    if (additionalParams && additionalParams.default) {
      // より詳細なパラメータ情報がある場合は統合
      param = this.mergeParameters(param, additionalParams.default);
    }

    return this.convertToNewParameter(param, oldAccount.id);
  }

  private mergeParameters(accountParam: any, paramFileParam: any): any {
    // parameters.json の情報を優先（より詳細なため）
    if (!accountParam) return paramFileParam;
    if (!paramFileParam) return accountParam;

    // 型が同じ場合は値を統合
    if (accountParam.type === paramFileParam.type) {
      return {
        ...accountParam,
        ...paramFileParam,
        // 値は明示的に設定されているものを優先
        value: paramFileParam.value ?? accountParam.value,
        defaultValue: paramFileParam.defaultValue ?? accountParam.defaultValue,
      };
    }

    // 型が異なる場合はparameters.jsonを優先
    this.logWarning("パラメータタイプの不一致", {
      accountParam,
      paramFileParam,
    });
    return paramFileParam;
  }

  private convertToNewParameter(param: any, accountId: string): Parameter {
    if (!param || !param.type) {
      // デフォルトパラメータ
      return {
        type: PARAMETER_TYPES.CONSTANT,
        value: 0,
      } as ConstantParameter;
    }

    switch (param.type) {
      case "constant":
        return {
          type: PARAMETER_TYPES.CONSTANT,
          value: param.value ?? 0,
        } as ConstantParameter;

      case "percentage":
        return {
          type: PARAMETER_TYPES.PERCENTAGE,
          value: param.value ?? 0,
          baseAccountId: param.baseAccountId || this.findBaseAccount(accountId),
        } as PercentageParameter;

      case "percentageOfRevenue":
        return {
          type: PARAMETER_TYPES.PERCENTAGE_OF_REVENUE,
          value: param.value ?? 0,
        } as PercentageOfRevenueParameter;

      case "days":
        return {
          type: PARAMETER_TYPES.DAYS,
          days: param.days ?? param.value ?? 0,
          baseAccountId: param.baseAccountId || this.findBaseAccount(accountId),
        } as DaysParameter;

      case "manualInput":
        return {
          type: PARAMETER_TYPES.MANUAL_INPUT,
          defaultValue: param.defaultValue,
        } as ManualInputParameter;

      case "formula":
        return {
          type: PARAMETER_TYPES.FORMULA,
          formula: param.formula || "",
          dependencies: this.extractDependencies(
            param.formula || "",
            param.dependencies
          ),
        } as FormulaParameter;

      default:
        this.logWarning(`不明なパラメータタイプ: ${param.type}`, { param });
        return {
          type: PARAMETER_TYPES.CONSTANT,
          value: 0,
        } as ConstantParameter;
    }
  }

  private findBaseAccount(accountId: string): string {
    // 日数パラメータや比率パラメータのベースアカウントを推定
    if (accountId.includes("ar") || accountId.includes("receivable")) {
      return "revenue-sales";
    }
    if (accountId.includes("ap") || accountId.includes("payable")) {
      return "expense-cogs";
    }
    if (accountId.includes("inventory")) {
      return "expense-cogs";
    }

    // デフォルトは売上高
    return "revenue-sales";
  }

  private extractDependencies(
    formula: string,
    existingDeps?: string[]
  ): string[] {
    if (existingDeps && existingDeps.length > 0) {
      return existingDeps;
    }

    // 簡易的な依存関係抽出（[accountId]パターン）
    const deps: string[] = [];
    const regex = /\[([^\]]+)\]/g;
    let match;

    while ((match = regex.exec(formula)) !== null) {
      const dep = match[1];
      if (!deps.includes(dep)) {
        deps.push(dep);
      }
    }

    return deps;
  }

  private migrateCfImpact(oldCfImpact: any): CfImpact {
    if (!oldCfImpact) {
      return {
        type: CF_IMPACT_TYPES.ADJUSTMENT,
      };
    }

    // タイプの正規化
    const typeMap: Record<string, CfImpact["type"]> = {
      isBaseProfit: CF_IMPACT_TYPES.IS_BASE_PROFIT,
      adjustment: CF_IMPACT_TYPES.ADJUSTMENT,
      reclassification: CF_IMPACT_TYPES.RECLASSIFICATION,
    };

    const newType = typeMap[oldCfImpact.type] || CF_IMPACT_TYPES.ADJUSTMENT;

    const cfImpact: CfImpact = {
      type: newType,
    };

    if (oldCfImpact.targetAccountIds) {
      cfImpact.targetAccountIds = oldCfImpact.targetAccountIds;
    }

    if (oldCfImpact.formula) {
      cfImpact.formula = oldCfImpact.formula;
    }

    return cfImpact;
  }

  private addMissingAccounts(): void {
    // 依存関係で参照されているが存在しないアカウントを追加
    const existingIds = new Set(this.newAccounts.map((a) => a.id));
    const missingIds = new Set<string>();

    // FormulaParameterの依存関係をチェック
    this.newAccounts.forEach((account) => {
      if (account.parameter.type === PARAMETER_TYPES.FORMULA) {
        const formulaParam = account.parameter as FormulaParameter;
        formulaParam.dependencies.forEach((dep) => {
          if (!existingIds.has(dep) && !missingIds.has(dep)) {
            missingIds.add(dep);
          }
        });
      }
    });

    // 不足アカウントの追加
    missingIds.forEach((id) => {
      // expense-depreciation の追加
      if (id === "expense-depreciation") {
        const depreciationAccount: Account = {
          id: "expense-depreciation",
          accountName: "減価償却費",
          parentId: null,
          sheet: SHEET_TYPES.PL,
          isCredit: false,
          displayOrder: {
            sheetOrder: 1,
            sectionOrder: 2,
            itemOrder: 10,
          },
          parameter: {
            type: PARAMETER_TYPES.FORMULA,
            formula: "[asset-ppe-depreciation]",
            dependencies: ["asset-ppe-depreciation"],
          } as FormulaParameter,
          cfImpact: {
            type: CF_IMPACT_TYPES.ADJUSTMENT,
          },
        };

        this.newAccounts.push(depreciationAccount);
        this.log("不足アカウント追加", {
          id,
          name: depreciationAccount.accountName,
        });
        console.log(`✓ 不足アカウント追加: ${id}`);
      }
    });
  }

  private async validateNewData(): Promise<boolean> {
    console.log("新しいデータの検証中...\n");

    const validator = new SeedDataValidator()
      .setAccounts(this.newAccounts)
      .setPeriods([]) // 期間データは別途処理
      .setFinancialValues([]);

    const result = validator.validate();

    if (!result.isValid) {
      console.error("❌ 検証エラー:");
      result.errors.forEach((error) => {
        console.error(
          `  - ${error.context}: ${error.field} - ${error.message}`
        );
      });
      this.errors.push(
        ...result.errors.map((e) => `${e.context}: ${e.field} - ${e.message}`)
      );
    }

    if (result.warnings.length > 0) {
      console.warn("⚠️  警告:");
      result.warnings.forEach((warning) => {
        console.warn(
          `  - ${warning.context}: ${warning.field} - ${warning.message}`
        );
      });
      this.warnings.push(
        ...result.warnings.map((w) => `${w.context}: ${w.field} - ${w.message}`)
      );
    }

    console.log(`\n検証結果: ${result.isValid ? "✅ 成功" : "❌ 失敗"}\n`);
    return result.isValid;
  }

  private async saveNewData(): Promise<void> {
    console.log("新しいデータを保存中...");

    const jsonData = JSON.stringify(this.newAccounts, null, 2);
    fs.writeFileSync(this.newAccountsPath, jsonData);

    console.log(`✓ 新しいaccounts.json保存: ${this.newAccountsPath}\n`);
    this.log("データ保存", {
      path: this.newAccountsPath,
      count: this.newAccounts.length,
    });
  }

  private log(action: string, details: any): void {
    this.migrationLogs.push({
      timestamp: new Date().toISOString(),
      action,
      details,
    });
  }

  private logError(message: string, error: any): void {
    console.error(`❌ ${message}:`, error);
    this.errors.push(`${message}: ${error.message || error}`);
    this.log("エラー", { message, error: error.message || error });
  }

  private logWarning(message: string, details: any): void {
    console.warn(`⚠️  ${message}:`, details);
    this.warnings.push(message);
    this.log("警告", { message, details });
  }

  generateReport(): string {
    const lines: string[] = ["# アカウントデータ移行レポート\n"];

    lines.push(`生成日時: ${new Date().toISOString()}\n`);

    lines.push("## 移行結果サマリー\n");
    lines.push(`- 移行アカウント数: ${this.newAccounts.length}件`);
    lines.push(`- エラー数: ${this.errors.length}件`);
    lines.push(`- 警告数: ${this.warnings.length}件\n`);

    if (this.errors.length > 0) {
      lines.push("## エラー\n");
      this.errors.forEach((error, index) => {
        lines.push(`${index + 1}. ${error}`);
      });
      lines.push("");
    }

    if (this.warnings.length > 0) {
      lines.push("## 警告\n");
      this.warnings.forEach((warning, index) => {
        lines.push(`${index + 1}. ${warning}`);
      });
      lines.push("");
    }

    lines.push("## 移行ログ\n");
    this.migrationLogs.slice(-20).forEach((log) => {
      lines.push(`- [${log.timestamp}] ${log.action}`);
      if (log.details) {
        lines.push(`  詳細: ${JSON.stringify(log.details)}`);
      }
    });

    return lines.join("\n");
  }
}

// メイン実行関数
async function main() {
  try {
    const migrator = new AccountDataMigrator();
    const result = await migrator.migrate();

    // レポートの生成と保存
    const report = migrator.generateReport();
    const reportPath = path.join(process.cwd(), "migration-report.md");
    fs.writeFileSync(reportPath, report);

    console.log("=== 移行完了 ===");
    console.log(`移行レポートを保存しました: ${reportPath}`);

    if (result.success) {
      console.log("\n✅ 移行が成功しました！");
      console.log("\n次のステップ:");
      console.log("1. src/seed/accounts.new.json を確認");
      console.log(
        "2. 問題がなければ accounts.json を accounts.new.json で置き換え"
      );
      console.log("3. parameters.json を削除");
    } else {
      console.error("\n❌ 移行に失敗しました。エラーを確認してください。");
    }
  } catch (error) {
    console.error("移行中にエラーが発生しました:", error);
    process.exit(1);
  }
}

// スクリプトとして実行
main().catch(console.error);

export { AccountDataMigrator, MigrationResult };
