/**
 * FinancialValueシードデータ生成スクリプト
 * アカウントと期間の組み合わせで財務値データを生成し、パラメータに基づいて計算
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Account } from '../types/account';
import type { Period, FinancialValue } from '../types/newFinancialTypes';
import {
  PARAMETER_TYPES,
  isConstantParameter,
  isPercentageParameter,
  isPercentageOfRevenueParameter,
  isDaysParameter,
  isManualInputParameter,
  isFormulaParameter,
  type FormulaParameter
} from '../types/newFinancialTypes';

interface GenerationResult {
  success: boolean;
  valuesCount: number;
  errors: string[];
  warnings: string[];
}

interface AccountWithDependencies {
  account: Account;
  dependencies: string[];
  level: number;
}

class FinancialValueGenerator {
  private accountsPath = path.join(process.cwd(), 'src/seed/accounts.new.json');
  private periodsPath = path.join(process.cwd(), 'src/seed/periods.json');
  private outputPath = path.join(process.cwd(), 'src/seed/financialValues.json');
  
  private accounts: Account[] = [];
  private periods: Period[] = [];
  private financialValues: FinancialValue[] = [];
  private valueMap: Map<string, number> = new Map();
  private errors: string[] = [];
  private warnings: string[] = [];

  constructor() {}

  async generate(): Promise<GenerationResult> {
    console.log('=== FinancialValueデータ生成開始 ===\n');

    try {
      // 1. データの読み込み
      await this.loadData();

      // 2. 依存関係の解析とトポロジカルソート
      const sortedAccounts = this.topologicalSort();

      // 3. 財務値の生成
      await this.generateValues(sortedAccounts);

      // 4. 保存
      await this.saveData();

      return {
        success: true,
        valuesCount: this.financialValues.length,
        errors: this.errors,
        warnings: this.warnings
      };

    } catch (error) {
      this.logError('生成処理エラー', error);
      return {
        success: false,
        valuesCount: 0,
        errors: this.errors,
        warnings: this.warnings
      };
    }
  }

  private async loadData(): Promise<void> {
    console.log('データファイルの読み込み中...');
    
    // 新しいaccounts.jsonを読み込み（存在しない場合は既存のものを使用）
    const accountsPath = fs.existsSync(this.accountsPath) 
      ? this.accountsPath 
      : path.join(process.cwd(), 'src/seed/accounts.json');
    
    const accountsData = fs.readFileSync(accountsPath, 'utf-8');
    this.accounts = JSON.parse(accountsData);
    console.log(`✓ accounts: ${this.accounts.length}件`);

    const periodsData = fs.readFileSync(this.periodsPath, 'utf-8');
    this.periods = JSON.parse(periodsData);
    console.log(`✓ periods: ${this.periods.length}件`);
    console.log('');
  }

  private topologicalSort(): AccountWithDependencies[] {
    console.log('依存関係の解析中...');
    
    // 依存関係グラフの構築
    const dependencyMap = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    
    this.accounts.forEach(account => {
      inDegree.set(account.id, 0);
      dependencyMap.set(account.id, []);
    });

    // 依存関係の収集
    this.accounts.forEach(account => {
      const deps = this.extractDependencies(account);
      deps.forEach(dep => {
        if (dependencyMap.has(dep)) {
          dependencyMap.get(dep)!.push(account.id);
          inDegree.set(account.id, (inDegree.get(account.id) || 0) + 1);
        }
      });
    });

    // トポロジカルソート
    const queue: string[] = [];
    const sorted: AccountWithDependencies[] = [];
    let level = 0;

    // 入次数0のノードをキューに追加
    inDegree.forEach((degree, accountId) => {
      if (degree === 0) {
        queue.push(accountId);
      }
    });

    while (queue.length > 0) {
      const currentLevel = queue.length;
      
      for (let i = 0; i < currentLevel; i++) {
        const accountId = queue.shift()!;
        const account = this.accounts.find(a => a.id === accountId)!;
        
        sorted.push({
          account,
          dependencies: this.extractDependencies(account),
          level
        });

        // 依存しているアカウントの入次数を減らす
        const dependents = dependencyMap.get(accountId) || [];
        dependents.forEach(dependent => {
          const newDegree = (inDegree.get(dependent) || 0) - 1;
          inDegree.set(dependent, newDegree);
          
          if (newDegree === 0) {
            queue.push(dependent);
          }
        });
      }
      
      level++;
    }

    // 循環依存のチェック
    if (sorted.length !== this.accounts.length) {
      this.logWarning('循環依存が検出されました', {
        totalAccounts: this.accounts.length,
        sortedAccounts: sorted.length
      });
    }

    console.log(`✓ 依存関係解析完了: ${level}レベル\n`);
    return sorted;
  }

  private extractDependencies(account: Account): string[] {
    const deps: string[] = [];

    // パラメータからの依存関係
    if (isPercentageParameter(account.parameter)) {
      deps.push(account.parameter.baseAccountId);
    } else if (isDaysParameter(account.parameter)) {
      deps.push(account.parameter.baseAccountId);
    } else if (isFormulaParameter(account.parameter)) {
      deps.push(...account.parameter.dependencies);
    }

    // 売上高比率の場合は売上高に依存
    if (isPercentageOfRevenueParameter(account.parameter)) {
      deps.push('revenue-sales');
    }

    return [...new Set(deps)]; // 重複を除去
  }

  private async generateValues(sortedAccounts: AccountWithDependencies[]): Promise<void> {
    console.log('財務値の生成中...');
    
    let generatedCount = 0;
    
    // 各期間で値を生成
    for (const period of this.periods) {
      console.log(`\n期間: ${period.displayName}`);
      
      // レベル順に計算
      for (const { account, dependencies, level } of sortedAccounts) {
        try {
          const value = this.calculateValue(account, period, dependencies);
          
          const financialValue: FinancialValue = {
            accountId: account.id,
            periodId: period.id,
            value,
            isManualInput: isManualInputParameter(account.parameter),
            lastUpdated: new Date()
          };

          // 計算式の記録
          if (isFormulaParameter(account.parameter)) {
            financialValue.formula = account.parameter.formula;
          }

          this.financialValues.push(financialValue);
          
          // 値をマップに保存（後続の計算で使用）
          const key = `${account.id}:${period.id}`;
          this.valueMap.set(key, value);
          
          generatedCount++;
          
          if (generatedCount % 100 === 0) {
            console.log(`  - ${generatedCount}件生成済み`);
          }
          
        } catch (error) {
          this.logError(`値計算エラー: ${account.id} / ${period.id}`, error);
        }
      }
    }
    
    console.log(`\n✓ 財務値生成完了: ${generatedCount}件\n`);
  }

  private calculateValue(account: Account, period: Period, dependencies: string[]): number {
    const param = account.parameter;

    // 定数値
    if (isConstantParameter(param)) {
      return param.value;
    }

    // 手動入力（デフォルト値を使用）
    if (isManualInputParameter(param)) {
      return param.defaultValue || 0;
    }

    // 売上高比率
    if (isPercentageOfRevenueParameter(param)) {
      const revenueValue = this.getValue('revenue-sales', period.id);
      return (revenueValue * param.value) / 100;
    }

    // 他科目比率
    if (isPercentageParameter(param)) {
      const baseValue = this.getValue(param.baseAccountId, period.id);
      return (baseValue * param.value) / 100;
    }

    // 日数ベース（年間ベースの値を日数で按分）
    if (isDaysParameter(param)) {
      const baseValue = this.getValue(param.baseAccountId, period.id);
      // 月次データの場合は年換算してから日数計算
      const annualizedBase = baseValue * 12;
      return (annualizedBase * param.days) / 365;
    }

    // 計算式
    if (isFormulaParameter(param)) {
      return this.evaluateFormula(param, period, dependencies);
    }

    // デフォルト
    return 0;
  }

  private getValue(accountId: string, periodId: string): number {
    const key = `${accountId}:${periodId}`;
    return this.valueMap.get(key) || 0;
  }

  private evaluateFormula(param: FormulaParameter, period: Period, dependencies: string[]): number {
    let formula = param.formula;

    // 簡易的な式評価（実際のシステムではASTを使用）
    // [accountId] を実際の値に置換
    dependencies.forEach(dep => {
      const value = this.getValue(dep, period.id);
      const pattern = new RegExp(`\\[${dep}\\]`, 'g');
      formula = formula.replace(pattern, value.toString());
    });

    // 前期値の処理 [@previous]
    const previousPeriod = this.getPreviousPeriod(period);
    if (previousPeriod) {
      formula = formula.replace(/\[@previous\]/g, () => {
        // 同じアカウントの前期値を取得
        const prevKey = `${param.dependencies[0]}:${previousPeriod.id}`;
        return this.valueMap.get(prevKey)?.toString() || '0';
      });
    }

    // 安全な式評価
    try {
      // 基本的な算術演算のみを許可
      if (!/^[\d\s\+\-\*\/\(\)\.]+$/.test(formula)) {
        throw new Error(`無効な式: ${formula}`);
      }
      
      // eval の代わりに Function コンストラクタを使用（より安全）
      const result = new Function('return ' + formula)();
      return typeof result === 'number' ? result : 0;
      
    } catch (error) {
      this.logError(`式評価エラー: ${param.formula}`, error);
      return 0;
    }
  }

  private getPreviousPeriod(period: Period): Period | null {
    const currentIndex = this.periods.findIndex(p => p.id === period.id);
    return currentIndex > 0 ? this.periods[currentIndex - 1] : null;
  }

  private async saveData(): Promise<void> {
    console.log('データを保存中...');

    // 期間順、アカウント順にソート
    this.financialValues.sort((a, b) => {
      if (a.periodId !== b.periodId) {
        return a.periodId.localeCompare(b.periodId);
      }
      return a.accountId.localeCompare(b.accountId);
    });

    const jsonData = JSON.stringify(this.financialValues, null, 2);
    fs.writeFileSync(this.outputPath, jsonData);
    
    console.log(`✓ FinancialValue保存: ${this.outputPath}`);
    console.log(`  - 総レコード数: ${this.financialValues.length}`);
    console.log(`  - ファイルサイズ: ${(jsonData.length / 1024).toFixed(2)} KB\n`);
  }

  private logError(message: string, error: any): void {
    console.error(`❌ ${message}:`, error);
    this.errors.push(`${message}: ${error.message || error}`);
  }

  private logWarning(message: string, details: any): void {
    console.warn(`⚠️  ${message}:`, details);
    this.warnings.push(message);
  }

  generateReport(): string {
    const lines: string[] = ['# FinancialValue生成レポート\n'];
    
    lines.push(`生成日時: ${new Date().toISOString()}\n`);

    lines.push('## 生成結果サマリー\n');
    lines.push(`- 生成レコード数: ${this.financialValues.length}件`);
    lines.push(`- アカウント数: ${this.accounts.length}`);
    lines.push(`- 期間数: ${this.periods.length}`);
    lines.push(`- 理論上の最大レコード数: ${this.accounts.length * this.periods.length}`);
    lines.push(`- エラー数: ${this.errors.length}件`);
    lines.push(`- 警告数: ${this.warnings.length}件\n`);

    // パラメータタイプ別の統計
    lines.push('## パラメータタイプ別統計\n');
    const typeStats = new Map<string, number>();
    
    this.accounts.forEach(account => {
      const type = account.parameter.type;
      typeStats.set(type, (typeStats.get(type) || 0) + 1);
    });

    typeStats.forEach((count, type) => {
      lines.push(`- ${type}: ${count}件`);
    });
    lines.push('');

    if (this.errors.length > 0) {
      lines.push('## エラー\n');
      this.errors.forEach((error, index) => {
        lines.push(`${index + 1}. ${error}`);
      });
      lines.push('');
    }

    if (this.warnings.length > 0) {
      lines.push('## 警告\n');
      this.warnings.forEach((warning, index) => {
        lines.push(`${index + 1}. ${warning}`);
      });
    }

    // サンプルデータ
    lines.push('\n## サンプルデータ（最初の5件）\n');
    lines.push('```json');
    lines.push(JSON.stringify(this.financialValues.slice(0, 5), null, 2));
    lines.push('```');

    return lines.join('\n');
  }
}

// メイン実行関数
async function main() {
  try {
    const generator = new FinancialValueGenerator();
    const result = await generator.generate();
    
    // レポートの生成と保存
    const report = generator.generateReport();
    const reportPath = path.join(process.cwd(), 'financial-values-report.md');
    fs.writeFileSync(reportPath, report);
    
    console.log('=== 生成完了 ===');
    console.log(`生成レポートを保存しました: ${reportPath}`);
    
    if (result.success) {
      console.log('\n✅ FinancialValue生成が成功しました！');
      console.log(`  - ${result.valuesCount}件のレコードを生成`);
    } else {
      console.error('\n❌ 生成に失敗しました。エラーを確認してください。');
    }

  } catch (error) {
    console.error('生成中にエラーが発生しました:', error);
    process.exit(1);
  }
}

// スクリプトとして実行
main().catch(console.error);

export { FinancialValueGenerator, GenerationResult };