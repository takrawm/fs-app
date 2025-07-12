/**
 * ParameterOverridesシステムの設計と実装
 * 特定の期間で異なるパラメータが必要な場合の管理システム
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Account } from '../types/account';
import type { Parameter } from '../types/parameter';
import type { Period } from '../types/newFinancialTypes';
import { PARAMETER_TYPES } from '../types/newFinancialTypes';

// ParameterOverride型定義
export interface ParameterOverride {
  id: string;
  accountId: string;
  periodId: string;
  parameter: Parameter;
  reason: string;
  appliedAt?: Date;
  createdAt: Date;
  createdBy: string;
}

// オーバーライドシナリオの定義
export interface OverrideScenario {
  name: string;
  description: string;
  condition: (account: Account, period: Period) => boolean;
  parameterModifier: (originalParam: Parameter) => Parameter;
  reason: string;
}

class ParameterOverrideManager {
  private accountsPath = path.join(process.cwd(), 'src/seed/accounts.new.json');
  private periodsPath = path.join(process.cwd(), 'src/seed/periods.json');
  private outputPath = path.join(process.cwd(), 'src/seed/parameterOverrides.json');
  
  private accounts: Account[] = [];
  private periods: Period[] = [];
  private overrides: ParameterOverride[] = [];
  
  // 定義済みシナリオ
  private scenarios: OverrideScenario[] = [
    {
      name: 'コスト効率化プログラム',
      description: '2024年以降の売上原価を段階的に改善',
      condition: (account, period) => {
        return account.id === 'expense-cogs' && 
               period.year === 2024 && 
               period.month >= 7;
      },
      parameterModifier: (param) => {
        if (param.type === PARAMETER_TYPES.PERCENTAGE_OF_REVENUE) {
          return {
            ...param,
            value: 58 // 60% → 58%
          };
        }
        return param;
      },
      reason: 'コスト効率化プログラムによる原価率の改善'
    },
    {
      name: 'マーケティング投資拡大',
      description: '成長期における販売費の戦略的増加',
      condition: (account, period) => {
        return account.id === 'expense-sga' && 
               period.year === 2024 && 
               period.month >= 4 && 
               period.month <= 9;
      },
      parameterModifier: (param) => {
        if (param.type === PARAMETER_TYPES.PERCENTAGE_OF_REVENUE) {
          return {
            ...param,
            value: 28 // 25% → 28%
          };
        }
        return param;
      },
      reason: '新製品ローンチに伴うマーケティング投資の増加'
    },
    {
      name: '売掛金回収期間の改善',
      description: '与信管理強化による回収期間短縮',
      condition: (account, period) => {
        return account.id === 'asset-ar' && 
               period.year === 2024 && 
               period.month >= 10;
      },
      parameterModifier: (param) => {
        if (param.type === PARAMETER_TYPES.DAYS) {
          return {
            ...param,
            days: 40 // 45日 → 40日
          };
        }
        return param;
      },
      reason: '与信管理システム導入による回収期間の短縮'
    },
    {
      name: '在庫回転率の向上',
      description: 'JIT導入による在庫日数の削減',
      condition: (account, period) => {
        return account.id === 'asset-inventory' && 
               period.year === 2024 && 
               period.month >= 6;
      },
      parameterModifier: (param) => {
        if (param.type === PARAMETER_TYPES.DAYS) {
          return {
            ...param,
            days: 55 // 60日 → 55日
          };
        }
        return param;
      },
      reason: 'ジャストインタイム生産方式導入による在庫効率化'
    },
    {
      name: '設備投資プログラム',
      description: '生産能力拡大のための設備投資',
      condition: (account, period) => {
        return account.id === 'asset-ppe-gross' && 
               period.year === 2024 && 
               (period.month === 3 || period.month === 9);
      },
      parameterModifier: (param) => {
        if (param.type === PARAMETER_TYPES.CONSTANT) {
          return {
            ...param,
            value: param.value + 1000000 // 設備投資実行
          };
        }
        return param;
      },
      reason: '計画的な生産設備の更新・拡張'
    },
    {
      name: '借入金返済計画',
      description: '財務健全性向上のための借入金削減',
      condition: (account, period) => {
        return account.id === 'liability-loan' && 
               period.year === 2024 && 
               period.month % 3 === 0; // 四半期毎
      },
      parameterModifier: (param) => {
        if (param.type === PARAMETER_TYPES.CONSTANT) {
          return {
            ...param,
            value: Math.max(0, param.value - 500000) // 四半期毎に50万円返済
          };
        }
        return param;
      },
      reason: '計画的な借入金返済による財務体質の改善'
    }
  ];

  constructor() {}

  async generate(): Promise<void> {
    console.log('=== ParameterOverrides生成開始 ===\n');

    // データ読み込み
    await this.loadData();

    // シナリオベースのオーバーライド生成
    this.generateScenarioOverrides();

    // カスタムオーバーライドの追加（例）
    this.addCustomOverrides();

    // 保存
    await this.saveData();

    // レポート生成
    this.generateReport();
  }

  private async loadData(): Promise<void> {
    console.log('データファイルの読み込み中...');
    
    const accountsPath = fs.existsSync(this.accountsPath) 
      ? this.accountsPath 
      : path.join(process.cwd(), 'src/seed/accounts.json');
    
    const accountsData = fs.readFileSync(accountsPath, 'utf-8');
    this.accounts = JSON.parse(accountsData);
    
    const periodsData = fs.readFileSync(this.periodsPath, 'utf-8');
    this.periods = JSON.parse(periodsData);
    
    console.log(`✓ accounts: ${this.accounts.length}件`);
    console.log(`✓ periods: ${this.periods.length}件\n`);
  }

  private generateScenarioOverrides(): void {
    console.log('シナリオベースのオーバーライド生成中...\n');

    let generatedCount = 0;

    this.scenarios.forEach(scenario => {
      console.log(`シナリオ: ${scenario.name}`);
      let scenarioCount = 0;

      this.accounts.forEach(account => {
        this.periods.forEach(period => {
          if (scenario.condition(account, period)) {
            const override: ParameterOverride = {
              id: `override_${account.id}_${period.id}_${Date.now()}`,
              accountId: account.id,
              periodId: period.id,
              parameter: scenario.parameterModifier(account.parameter),
              reason: scenario.reason,
              createdAt: new Date(),
              createdBy: 'system'
            };

            this.overrides.push(override);
            scenarioCount++;
            generatedCount++;
          }
        });
      });

      console.log(`  - ${scenarioCount}件のオーバーライドを生成`);
    });

    console.log(`\n合計 ${generatedCount}件のオーバーライドを生成\n`);
  }

  private addCustomOverrides(): void {
    console.log('カスタムオーバーライドの追加...');

    // 例: 特定月の売上高を手動で設定
    const customOverride: ParameterOverride = {
      id: `override_custom_${Date.now()}`,
      accountId: 'revenue-sales',
      periodId: '2024-12',
      parameter: {
        type: PARAMETER_TYPES.MANUAL_INPUT,
        defaultValue: 1500000 // 年末商戦
      },
      reason: '年末商戦による売上高の季節調整',
      createdAt: new Date(),
      createdBy: 'analyst'
    };

    this.overrides.push(customOverride);
    console.log('✓ カスタムオーバーライドを追加\n');
  }

  private async saveData(): Promise<void> {
    console.log('データを保存中...');

    // 期間順、アカウント順にソート
    this.overrides.sort((a, b) => {
      if (a.periodId !== b.periodId) {
        return a.periodId.localeCompare(b.periodId);
      }
      return a.accountId.localeCompare(b.accountId);
    });

    const jsonData = JSON.stringify(this.overrides, null, 2);
    fs.writeFileSync(this.outputPath, jsonData);
    
    console.log(`✓ ParameterOverrides保存: ${this.outputPath}`);
    console.log(`  - 総オーバーライド数: ${this.overrides.length}\n`);
  }

  private generateReport(): void {
    const reportPath = path.join(process.cwd(), 'parameter-overrides-report.md');
    const lines: string[] = ['# ParameterOverridesレポート\n'];
    
    lines.push(`生成日時: ${new Date().toISOString()}\n`);

    lines.push('## 概要\n');
    lines.push(`- 総オーバーライド数: ${this.overrides.length}件`);
    lines.push(`- 影響を受けるアカウント数: ${new Set(this.overrides.map(o => o.accountId)).size}件`);
    lines.push(`- 影響を受ける期間数: ${new Set(this.overrides.map(o => o.periodId)).size}件\n`);

    lines.push('## シナリオ別統計\n');
    this.scenarios.forEach(scenario => {
      const count = this.overrides.filter(o => o.reason.includes(scenario.reason.slice(0, 20))).length;
      lines.push(`- ${scenario.name}: ${count}件`);
    });

    lines.push('\n## オーバーライドの詳細（最初の10件）\n');
    this.overrides.slice(0, 10).forEach((override, index) => {
      lines.push(`${index + 1}. **${override.accountId}** (${override.periodId})`);
      lines.push(`   - 理由: ${override.reason}`);
      lines.push(`   - パラメータタイプ: ${override.parameter.type}`);
      lines.push(`   - 作成者: ${override.createdBy}\n`);
    });

    fs.writeFileSync(reportPath, lines.join('\n'));
    console.log(`レポートを保存: ${reportPath}`);
  }
}

// オーバーライド適用ユーティリティ
export class OverrideApplicator {
  private overrides: Map<string, ParameterOverride> = new Map();

  constructor(overrides: ParameterOverride[]) {
    // アカウントID + 期間IDをキーとしてマップ化
    overrides.forEach(override => {
      const key = `${override.accountId}:${override.periodId}`;
      this.overrides.set(key, override);
    });
  }

  /**
   * 特定のアカウント・期間のパラメータを取得（オーバーライド適用済み）
   */
  getParameter(account: Account, periodId: string): Parameter {
    const key = `${account.id}:${periodId}`;
    const override = this.overrides.get(key);
    
    if (override) {
      return override.parameter;
    }
    
    return account.parameter;
  }

  /**
   * オーバーライドが適用されているかチェック
   */
  hasOverride(accountId: string, periodId: string): boolean {
    const key = `${accountId}:${periodId}`;
    return this.overrides.has(key);
  }

  /**
   * 特定期間のすべてのオーバーライドを取得
   */
  getOverridesForPeriod(periodId: string): ParameterOverride[] {
    return Array.from(this.overrides.values())
      .filter(override => override.periodId === periodId);
  }

  /**
   * 特定アカウントのすべてのオーバーライドを取得
   */
  getOverridesForAccount(accountId: string): ParameterOverride[] {
    return Array.from(this.overrides.values())
      .filter(override => override.accountId === accountId);
  }
}

// メイン実行関数
async function main() {
  try {
    const manager = new ParameterOverrideManager();
    await manager.generate();
    
    console.log('\n=== ParameterOverrides生成完了 ===');
    console.log('\n✅ 生成が成功しました！');
    console.log('\n使用方法:');
    console.log('1. src/seed/parameterOverrides.json を確認');
    console.log('2. OverrideApplicatorクラスを使用してパラメータを動的に適用');
    console.log('3. 必要に応じてカスタムシナリオを追加');

  } catch (error) {
    console.error('生成中にエラーが発生しました:', error);
    process.exit(1);
  }
}

// スクリプトとして実行
main().catch(console.error);

export { ParameterOverrideManager, ParameterOverride, OverrideScenario };