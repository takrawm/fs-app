// @ts-nocheck
// TODO: accountTypes.tsの型定義に合わせて修正が必要
/**
 * periods.json修正スクリプト
 * isHistoricalフィールドを追加し、型定義に準拠させる
 */

import * as fs from "fs";
import * as path from "path";

const periodsPath = path.join(process.cwd(), "src/seed/periods.json");
const backupPath = path.join(process.cwd(), "src/seed/periods.backup.json");

console.log("=== periods.json修正開始 ===\n");

// バックアップ作成
fs.copyFileSync(periodsPath, backupPath);
console.log(`✓ バックアップ作成: ${backupPath}`);

// データ読み込み
const periodsData = fs.readFileSync(periodsPath, "utf-8");
const periods = JSON.parse(periodsData);

// 修正
const fixedPeriods = periods.map((period: any) => ({
  ...period,
  isHistorical: !period.isForecast, // 予測でないものは実績
}));

// 保存
fs.writeFileSync(periodsPath, JSON.stringify(fixedPeriods, null, 2));
console.log(`✓ 修正完了: ${fixedPeriods.length}件の期間データ`);
console.log("\n=== 完了 ===");
