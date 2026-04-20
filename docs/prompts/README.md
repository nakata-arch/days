# DAYS-project Claude Code プロンプト集

バイブコーディング運用の資産。Claude Code で実装を進める際の指示書を蓄積する。

## 運用ルール
- 各プロンプトは **「計画を確認して OK を出してから実装」** の流れで進める
- コードは Claude Code、設計相談・エラー相談は Claude Desktop / Web版 Gemini
- 最小構成で動かすことを最優先

## プロンプト一覧

| # | プロンプト | 目的 | 順序 |
|---|---|---|---|
| ① | [01-calendar-stabilization.md](01-calendar-stabilization.md) | Google カレンダー連携（OAuth）の安定化 | 最初に実行。ブロッカー解消 |
| ② | [02-mission-setup.md](02-mission-setup.md) | ミッション登録ページ（/setup）の新規実装 | ①の後 |
| ③ | [03-weekly-ai-feedback.md](03-weekly-ai-feedback.md) | 週報AI励ましフィードバック機能 | ②の後 |
| ④ | [04-smartphone-deploy.md](04-smartphone-deploy.md) | スマートフォン対応・デプロイ・PWA化 | ③の後 |
| — | [system-praise-coach.md](system-praise-coach.md) | 褒めるAIのシステムプロンプト（汎用） | ③で使用 |

## MVP スコープ（現行）

- Google 認証 + カレンダー同期（安定化）
- ミッション登録（役割 / 目標 / 週フォーカス — フランクリンプランナー型）
- 既存の4象限分類（Eisenhower）は維持
- 週報でのポジティブ専用 AI フィードバック（ユーザー主導・ボタン押下で生成）
