/**
 * 現在のシードデータ分析スクリプト
 * 既存のデータ構造の問題点を詳細に分析し、移行計画を立てる
 */

import * as fs from 'fs';
import * as path from 'path';
import { SeedDataValidator } from '../utils/seedDataValidator';
import type { Account } from '../types/account';
import type { Period } from '../types/newFinancialTypes';

interface AnalysisResult {
  accountsAnalysis: {
    totalCount: number;
    bySheet: Record<string, number>;
    missingFields: string[];
    invalidTypes: Record<string, any[]>;
    duplicateIds: string[];
    parentChildIssues: string[];
  };
  parametersAnalysis: {
    totalCount: number;
    duplicatedInAccounts: number;
    uniqueInParameters: number;
    typeDistribution: Record<string, number>;
    inconsistencies: Array<{
      accountId: string;
      issue: string;
      accountParam?: any;
      parameterParam?: any;
    }>;
  };
  periodsAnalysis: {
    totalCount: number;
    historicalCount: number;
    forecastCount: number;
    gaps: string[];
    dateRange: {
      start: string;
      end: string;
    };
  };
  financialValuesAnalysis: {
    exists: boolean;
    message: string;
  };
  recommendations: string[];
}

class CurrentDataAnalyzer {
  private accountsPath = path.join(process.cwd(), 'src/seed/accounts.json');
  private parametersPath = path.join(process.cwd(), 'src/seed/parameters.json');
  private periodsPath = path.join(process.cwd(), 'src/seed/periods.json');
  private financialValuesPath = path.join(process.cwd(), 'src/seed/financialValues.json');
  
  private accounts: any[] = [];
  private parameters: any[] = [];
  private periods: any[] = [];
  private result: AnalysisResult = {
    accountsAnalysis: {
      totalCount: 0,
      bySheet: {},
      missingFields: [],
      invalidTypes: {},
      duplicateIds: [],
      parentChildIssues: []
    },
    parametersAnalysis: {
      totalCount: 0,
      duplicatedInAccounts: 0,
      uniqueInParameters: 0,
      typeDistribution: {},
      inconsistencies: []
    },
    periodsAnalysis: {
      totalCount: 0,
      historicalCount: 0,
      forecastCount: 0,
      gaps: [],
      dateRange: {
        start: '',
        end: ''
      }
    },
    financialValuesAnalysis: {
      exists: false,
      message: ''
    },
    recommendations: []
  };

  constructor() {}

  async analyze(): Promise<AnalysisResult> {
    console.log('=== 現在のシードデータ分析開始 ===\n');

    // データの読み込み
    await this.loadData();

    // 各種分析の実行
    this.analyzeAccounts();
    this.analyzeParameters();
    this.analyzePeriods();
    this.analyzeFinancialValues();
    this.analyzeDataIntegrity();
    this.generateRecommendations();

    // 検証ツールを使用した詳細検証
    this.runValidator();

    return this.result;
  }

  private async loadData(): Promise<void> {
    try {
      console.log('データファイルの読み込み中...');
      
      // accounts.json
      if (fs.existsSync(this.accountsPath)) {
        const accountsData = fs.readFileSync(this.accountsPath, 'utf-8');
        this.accounts = JSON.parse(accountsData);
        console.log(`✓ accounts.json: ${this.accounts.length}件`);
      } else {
        console.error('✗ accounts.json が見つかりません');
      }

      // parameters.json
      if (fs.existsSync(this.parametersPath)) {
        const parametersData = fs.readFileSync(this.parametersPath, 'utf-8');
        this.parameters = JSON.parse(parametersData);
        console.log(`✓ parameters.json: ${this.parameters.length}件`);
      } else {
        console.error('✗ parameters.json が見つかりません');
      }

      // periods.json
      if (fs.existsSync(this.periodsPath)) {
        const periodsData = fs.readFileSync(this.periodsPath, 'utf-8');
        this.periods = JSON.parse(periodsData);
        console.log(`✓ periods.json: ${this.periods.length}件`);
      } else {
        console.error('✗ periods.json が見つかりません');
      }

      console.log('');
    } catch (error) {
      console.error('データ読み込みエラー:', error);
      throw error;
    }
  }

  private analyzeAccounts(): void {
    console.log('=== アカウントデータ分析 ===');
    
    const analysis = this.result.accountsAnalysis;
    analysis.totalCount = this.accounts.length;

    // IDの重複チェック
    const idSet = new Set<string>();
    const duplicates: string[] = [];
    
    this.accounts.forEach(account => {
      // シート別集計
      const sheet = account.sheet || 'unknown';
      analysis.bySheet[sheet] = (analysis.bySheet[sheet] || 0) + 1;

      // ID重複チェック
      if (idSet.has(account.id)) {
        duplicates.push(account.id);
      }
      idSet.add(account.id);

      // 必須フィールドチェック
      const requiredFields = ['id', 'accountName', 'sheet', 'displayOrder', 'parameter', 'cfImpact'];
      requiredFields.forEach(field => {
        if (!account[field] && !analysis.missingFields.includes(field)) {
          analysis.missingFields.push(field);
        }
      });

      // 型の妥当性チェック
      if (account.isCredit !== null && typeof account.isCredit !== 'boolean') {
        if (!analysis.invalidTypes['isCredit']) {
          analysis.invalidTypes['isCredit'] = [];
        }
        analysis.invalidTypes['isCredit'].push({
          id: account.id,
          value: account.isCredit,
          type: typeof account.isCredit
        });
      }

      // displayOrderの構造チェック
      if (account.displayOrder) {
        const do_ = account.displayOrder;
        if (typeof do_.sheetOrder !== 'number' || 
            typeof do_.sectionOrder !== 'number' || 
            typeof do_.itemOrder !== 'number') {
          if (!analysis.invalidTypes['displayOrder']) {
            analysis.invalidTypes['displayOrder'] = [];
          }
          analysis.invalidTypes['displayOrder'].push({
            id: account.id,
            value: do_
          });
        }
      }
    });

    analysis.duplicateIds = duplicates;

    // 親子関係の整合性チェック
    this.accounts.forEach(account => {
      if (account.parentId && !idSet.has(account.parentId)) {
        analysis.parentChildIssues.push(
          `${account.id} の親ID ${account.parentId} が存在しません`
        );
      }
    });

    console.log(`- 総アカウント数: ${analysis.totalCount}`);
    console.log(`- シート別内訳:`, analysis.bySheet);
    console.log(`- 不足フィールド: ${analysis.missingFields.join(', ') || 'なし'}`);
    console.log(`- 重複ID: ${analysis.duplicateIds.length}件`);
    console.log(`- 親子関係の問題: ${analysis.parentChildIssues.length}件`);
    console.log('');
  }

  private analyzeParameters(): void {
    console.log('=== パラメータデータ分析 ===');
    
    const analysis = this.result.parametersAnalysis;
    analysis.totalCount = this.parameters.length;

    // アカウントのパラメータと parameters.json の比較
    const accountParamMap = new Map<string, any>();
    this.accounts.forEach(account => {
      if (account.parameter) {
        accountParamMap.set(account.id, account.parameter);
      }
    });

    // parameters.json の解析
    this.parameters.forEach(paramEntry => {
      const accountId = paramEntry.accountId;
      const accountParam = accountParamMap.get(accountId);

      // パラメータタイプの集計
      if (paramEntry.parameters) {
        Object.values(paramEntry.parameters).forEach((param: any) => {
          const type = param.type || 'unknown';
          analysis.typeDistribution[type] = (analysis.typeDistribution[type] || 0) + 1;
        });
      }

      // 重複・不整合チェック
      if (accountParam) {
        analysis.duplicatedInAccounts++;
        
        // 型や値の不整合をチェック
        if (paramEntry.parameters?.default) {
          const defaultParam = paramEntry.parameters.default;
          if (accountParam.type !== defaultParam.type || 
              accountParam.value !== defaultParam.value) {
            analysis.inconsistencies.push({
              accountId,
              issue: 'パラメータの不整合',
              accountParam,
              parameterParam: defaultParam
            });
          }
        }
      } else {
        analysis.uniqueInParameters++;
      }
    });

    console.log(`- 総パラメータエントリ数: ${analysis.totalCount}`);
    console.log(`- アカウントに重複: ${analysis.duplicatedInAccounts}件`);
    console.log(`- parameters.json のみ: ${analysis.uniqueInParameters}件`);
    console.log(`- パラメータタイプ分布:`, analysis.typeDistribution);
    console.log(`- 不整合: ${analysis.inconsistencies.length}件`);
    
    if (analysis.inconsistencies.length > 0) {
      console.log('\n不整合の詳細:');
      analysis.inconsistencies.slice(0, 3).forEach(inc => {
        console.log(`  - ${inc.accountId}: ${inc.issue}`);
      });
      if (analysis.inconsistencies.length > 3) {
        console.log(`  ... 他 ${analysis.inconsistencies.length - 3}件`);
      }
    }
    console.log('');
  }

  private analyzePeriods(): void {
    console.log('=== 期間データ分析 ===');
    
    const analysis = this.result.periodsAnalysis;
    analysis.totalCount = this.periods.length;

    if (this.periods.length === 0) {
      console.log('期間データが見つかりません');
      return;
    }

    // 期間の分類
    this.periods.forEach(period => {
      if (period.isHistorical) analysis.historicalCount++;
      if (period.isForecast) analysis.forecastCount++;
    });

    // 期間の連続性チェック
    const sortedPeriods = [...this.periods].sort((a, b) => {
      const dateA = a.year * 12 + a.month;
      const dateB = b.year * 12 + b.month;
      return dateA - dateB;
    });

    // 日付範囲
    if (sortedPeriods.length > 0) {
      const first = sortedPeriods[0];
      const last = sortedPeriods[sortedPeriods.length - 1];
      analysis.dateRange.start = `${first.year}年${first.month}月`;
      analysis.dateRange.end = `${last.year}年${last.month}月`;
    }

    // ギャップの検出
    for (let i = 1; i < sortedPeriods.length; i++) {
      const prev = sortedPeriods[i - 1];
      const curr = sortedPeriods[i];
      const prevMonths = prev.year * 12 + prev.month;
      const currMonths = curr.year * 12 + curr.month;
      
      if (currMonths - prevMonths > 1) {
        const gap = currMonths - prevMonths - 1;
        analysis.gaps.push(
          `${prev.year}年${prev.month}月 と ${curr.year}年${curr.month}月 の間に${gap}ヶ月のギャップ`
        );
      }
    }

    console.log(`- 総期間数: ${analysis.totalCount}`);
    console.log(`- 実績期間: ${analysis.historicalCount}件`);
    console.log(`- 予測期間: ${analysis.forecastCount}件`);
    console.log(`- 期間範囲: ${analysis.dateRange.start} ～ ${analysis.dateRange.end}`);
    console.log(`- ギャップ: ${analysis.gaps.length}件`);
    console.log('');
  }

  private analyzeFinancialValues(): void {
    console.log('=== 財務値データ分析 ===');
    
    const analysis = this.result.financialValuesAnalysis;
    
    if (fs.existsSync(this.financialValuesPath)) {
      analysis.exists = true;
      try {
        const data = fs.readFileSync(this.financialValuesPath, 'utf-8');
        const values = JSON.parse(data);
        analysis.message = `財務値データが存在します (${values.length}件)`;
      } catch (error) {
        analysis.message = '財務値ファイルは存在しますが、読み込めません';
      }
    } else {
      analysis.exists = false;
      analysis.message = '財務値データファイルが存在しません - 生成が必要です';
    }

    console.log(`- ${analysis.message}`);
    console.log('');
  }

  private analyzeDataIntegrity(): void {
    console.log('=== データ整合性の総合分析 ===');

    // Single Source of Truth 違反の検出
    const violations: string[] = [];
    
    if (this.result.parametersAnalysis.duplicatedInAccounts > 0) {
      violations.push(
        `パラメータ情報が accounts.json と parameters.json の両方に存在 (${this.result.parametersAnalysis.duplicatedInAccounts}件)`
      );
    }

    // 参照整合性の問題
    if (this.result.accountsAnalysis.parentChildIssues.length > 0) {
      violations.push(
        `親子関係の参照整合性エラー (${this.result.accountsAnalysis.parentChildIssues.length}件)`
      );
    }

    // データ構造の問題
    if (this.result.accountsAnalysis.missingFields.length > 0) {
      violations.push(
        `必須フィールドの欠落: ${this.result.accountsAnalysis.missingFields.join(', ')}`
      );
    }

    console.log('Single Source of Truth 違反:');
    violations.forEach(v => console.log(`  - ${v}`));
    console.log('');
  }

  private generateRecommendations(): void {
    const recommendations = this.result.recommendations;

    // 優先度1: データ重複の解消
    if (this.result.parametersAnalysis.duplicatedInAccounts > 0) {
      recommendations.push(
        '【優先度: 高】parameters.json のデータを accounts.json に統合し、Single Source of Truth を実現'
      );
    }

    // 優先度2: 財務値データの生成
    if (!this.result.financialValuesAnalysis.exists) {
      recommendations.push(
        '【優先度: 高】FinancialValue データの生成が必要'
      );
    }

    // 優先度3: 型の修正
    if (Object.keys(this.result.accountsAnalysis.invalidTypes).length > 0) {
      recommendations.push(
        '【優先度: 中】無効な型を持つフィールドの修正'
      );
    }

    // 優先度4: 参照整合性
    if (this.result.accountsAnalysis.parentChildIssues.length > 0) {
      recommendations.push(
        '【優先度: 中】親子関係の参照整合性の修復'
      );
    }

    // 優先度5: 期間の連続性
    if (this.result.periodsAnalysis.gaps.length > 0) {
      recommendations.push(
        '【優先度: 低】期間データのギャップを埋める'
      );
    }
  }

  private runValidator(): void {
    console.log('=== SeedDataValidator による詳細検証 ===\n');

    const validator = new SeedDataValidator()
      .setAccounts(this.accounts)
      .setPeriods(this.periods)
      .setFinancialValues([]); // 現時点では空

    const result = validator.validate();
    const report = validator.getDetailedReport();

    // レポートをファイルに保存
    const reportPath = path.join(process.cwd(), 'analysis-report.md');
    fs.writeFileSync(reportPath, report);
    console.log(`詳細レポートを保存: ${reportPath}\n`);
  }

  generateReport(): string {
    const lines: string[] = ['# 現在のシードデータ分析レポート\n'];
    
    lines.push(`生成日時: ${new Date().toISOString()}\n`);

    // エグゼクティブサマリー
    lines.push('## エグゼクティブサマリー\n');
    lines.push('現在のシードデータには以下の主要な問題があります：\n');
    lines.push('1. **データの重複**: パラメータ情報が複数のファイルに分散');
    lines.push('2. **型の不整合**: 一部のフィールドで型定義に準拠していない値');
    lines.push('3. **財務値の不在**: FinancialValueデータが未生成\n');

    // 詳細分析結果
    lines.push('## 詳細分析結果\n');
    
    // アカウント分析
    lines.push('### アカウントデータ');
    lines.push(`- 総数: ${this.result.accountsAnalysis.totalCount}件`);
    lines.push(`- シート別:`, JSON.stringify(this.result.accountsAnalysis.bySheet, null, 2));
    if (this.result.accountsAnalysis.duplicateIds.length > 0) {
      lines.push(`- 重複ID: ${this.result.accountsAnalysis.duplicateIds.join(', ')}`);
    }
    lines.push('');

    // パラメータ分析
    lines.push('### パラメータデータ');
    lines.push(`- parameters.json エントリ数: ${this.result.parametersAnalysis.totalCount}件`);
    lines.push(`- 重複データ: ${this.result.parametersAnalysis.duplicatedInAccounts}件`);
    lines.push(`- 不整合: ${this.result.parametersAnalysis.inconsistencies.length}件`);
    lines.push('');

    // 期間分析
    lines.push('### 期間データ');
    lines.push(`- 総期間数: ${this.result.periodsAnalysis.totalCount}件`);
    lines.push(`- 範囲: ${this.result.periodsAnalysis.dateRange.start} ～ ${this.result.periodsAnalysis.dateRange.end}`);
    lines.push('');

    // 推奨アクション
    lines.push('## 推奨アクション\n');
    this.result.recommendations.forEach((rec, index) => {
      lines.push(`${index + 1}. ${rec}`);
    });

    return lines.join('\n');
  }
}

// メイン実行関数
async function main() {
  try {
    const analyzer = new CurrentDataAnalyzer();
    const result = await analyzer.analyze();
    
    // 分析レポートの生成と保存
    const report = analyzer.generateReport();
    const reportPath = path.join(process.cwd(), 'current-data-analysis.md');
    fs.writeFileSync(reportPath, report);
    
    console.log('\n=== 分析完了 ===');
    console.log(`分析レポートを保存しました: ${reportPath}`);
    console.log('\n推奨アクション:');
    result.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });

  } catch (error) {
    console.error('分析中にエラーが発生しました:', error);
    process.exit(1);
  }
}

// スクリプトとして実行された場合
main().catch(console.error);

export { CurrentDataAnalyzer, AnalysisResult };