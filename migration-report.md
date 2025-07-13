# アカウントデータ移行レポート

生成日時: 2025-07-12T01:21:52.517Z

## 移行結果サマリー

- 移行アカウント数: 16件
- エラー数: 0件
- 警告数: 0件

## 移行ログ

- [2025-07-12T01:21:52.509Z] バックアップ作成
  詳細: {"path":"/home/tmiyahara/dev/fs/fs-app/src/seed/accounts.backup.json"}
- [2025-07-12T01:21:52.510Z] アカウント移行
  詳細: {"id":"revenue-sales","name":"売上高","oldSheet":"PL","newSheet":"PL"}
- [2025-07-12T01:21:52.511Z] アカウント移行
  詳細: {"id":"expense-cogs","name":"売上原価","oldSheet":"PL","newSheet":"PL"}
- [2025-07-12T01:21:52.511Z] アカウント移行
  詳細: {"id":"expense-sga","name":"販売費及び一般管理費","oldSheet":"PL","newSheet":"PL"}
- [2025-07-12T01:21:52.511Z] アカウント移行
  詳細: {"id":"asset-cash","name":"現金及び預金","oldSheet":"BS","newSheet":"BS"}
- [2025-07-12T01:21:52.511Z] アカウント移行
  詳細: {"id":"asset-ar","name":"売掛金","oldSheet":"BS","newSheet":"BS"}
- [2025-07-12T01:21:52.511Z] アカウント移行
  詳細: {"id":"asset-inventory","name":"棚卸資産","oldSheet":"BS","newSheet":"BS"}
- [2025-07-12T01:21:52.511Z] アカウント移行
  詳細: {"id":"asset-ppe-gross","name":"有形固定資産（取得原価）","oldSheet":"PPE","newSheet":"PPE"}
- [2025-07-12T01:21:52.512Z] アカウント移行
  詳細: {"id":"asset-ppe-depreciation","name":"減価償却累計額","oldSheet":"PPE","newSheet":"PPE"}
- [2025-07-12T01:21:52.512Z] アカウント移行
  詳細: {"id":"liability-ap","name":"買掛金","oldSheet":"BS","newSheet":"BS"}
- [2025-07-12T01:21:52.512Z] アカウント移行
  詳細: {"id":"liability-loan","name":"借入金","oldSheet":"FINANCING","newSheet":"Financing"}
- [2025-07-12T01:21:52.512Z] アカウント移行
  詳細: {"id":"equity-capital","name":"資本金","oldSheet":"BS","newSheet":"BS"}
- [2025-07-12T01:21:52.512Z] アカウント移行
  詳細: {"id":"equity-retained-earnings","name":"利益剰余金","oldSheet":"BS","newSheet":"BS"}
- [2025-07-12T01:21:52.512Z] アカウント移行
  詳細: {"id":"cf-operating","name":"営業活動によるキャッシュフロー","oldSheet":"CF","newSheet":"CF"}
- [2025-07-12T01:21:52.512Z] アカウント移行
  詳細: {"id":"cf-investing","name":"投資活動によるキャッシュフロー","oldSheet":"CF","newSheet":"CF"}
- [2025-07-12T01:21:52.512Z] アカウント移行
  詳細: {"id":"cf-financing","name":"財務活動によるキャッシュフロー","oldSheet":"CF","newSheet":"CF"}
- [2025-07-12T01:21:52.513Z] 不足アカウント追加
  詳細: {"id":"expense-depreciation","name":"減価償却費"}
- [2025-07-12T01:21:52.517Z] データ保存
  詳細: {"path":"/home/tmiyahara/dev/fs/fs-app/src/seed/accounts.new.json","count":16}