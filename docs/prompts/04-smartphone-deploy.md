# ④ スマートフォン利用対応（デプロイ + PWA化）

```
DAYS-projectをスマートフォンで利用できるようにしてください。

【プロジェクト構成】
- Next.js + TypeScript（App Router）
- Firebase App Hosting + Firestore
- Firebase プロジェクト: days-e3e72
- Node.js / Firebase CLI 利用可能

【やってほしいこと】

1. Firebase設定ファイルの整備
   - .firebaserc を現行プロジェクト (days-e3e72) に向ける
   - firebase.json を作成し、firestore ルールの参照を追加

2. PWA対応（ホーム画面追加 + standalone起動）
   - public/manifest.json 作成
   - public/icon.svg 作成（シンプルな「DAYS」文字ロゴ）
   - src/app/layout.tsx に manifest, viewport, icons, themeColor, apple-touch-icon を追加

3. デプロイ準備
   - Firebase App Hosting へのデプロイ手順を明文化
   - 認証ドメイン・Calendar API などの前提条件の確認項目をリスト化

【デザイン方針】
- アイコン: 青地 (#3362CC) に白抜き「DAYS」
- theme_color: #3362CC
- background_color: #EEF0F6
- display: standalone（ホーム画面起動でフルスクリーン）

【進め方のルール】
- 既存の認証・Firestoreアクセスは破壊しない
- モバイルでの実機確認時の注意点（Chrome/Safari差異、ポップアップ挙動）も添える
- デプロイコマンドはユーザー実行分と自動分を区別
```
