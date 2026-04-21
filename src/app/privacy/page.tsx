import type { Metadata } from "next";
import Link from "next/link";
import "./privacy.css";

export const metadata: Metadata = {
  title: "プライバシーポリシー — DAYS",
  description: "DAYSのプライバシーポリシー。個人情報の取り扱いについて。",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="pp-root">
      <nav className="pp-nav">
        <Link href="/" className="pp-nav-logo">DAYS</Link>
        <Link href="/" className="pp-nav-back">← トップへ戻る</Link>
      </nav>

      <div className="pp-container">
        <header className="pp-page-header">
          <div className="pp-page-kicker">PRIVACY POLICY</div>
          <h1>プライバシーポリシー</h1>
          <p className="pp-page-lead">
            合同会社中田キカク（以下「当社」といいます）は、当社が提供する時間管理サービス「DAYS」（以下「本サービス」といいます）における、ユーザーの個人情報の取り扱いについて、以下のとおりプライバシーポリシー（以下「本ポリシー」といいます）を定めます。
          </p>
        </header>

        <main>
          <div className="pp-toc">
            <div className="pp-toc-title">目次 — Contents</div>
            <ol>
              <li><a href="#article-1">事業者情報</a></li>
              <li><a href="#article-2">取得する情報</a></li>
              <li><a href="#article-3">利用目的</a></li>
              <li><a href="#article-4">第三者提供とAI処理の送信先</a></li>
              <li><a href="#article-5">AI学習利用の有無</a></li>
              <li><a href="#article-6">保存期間と削除方針</a></li>
              <li><a href="#article-7">ユーザーの権利</a></li>
              <li><a href="#article-8">EU居住者に対する特則（GDPR対応）</a></li>
              <li><a href="#article-9">Cookieと解析ツール</a></li>
              <li><a href="#article-10">国外データ移転</a></li>
              <li><a href="#article-11">セキュリティ措置</a></li>
              <li><a href="#article-12">未成年者の利用</a></li>
              <li><a href="#article-13">本ポリシーの改定</a></li>
              <li><a href="#article-14">お問い合わせ窓口</a></li>
            </ol>
          </div>

          <section id="article-1">
            <h2><span className="pp-article-num">Art. I.</span>事業者情報</h2>
            <table>
              <tbody>
                <tr><td>事業者名</td><td>合同会社中田キカク</td></tr>
                <tr><td>代表者</td><td>代表社員 中田雄斗</td></tr>
                <tr><td>所在地</td><td>東京都板橋区板橋1-45-2-702</td></tr>
                <tr><td>個人情報保護責任者</td><td>代表社員 中田雄斗</td></tr>
                <tr><td>お問い合わせ</td><td>yuto@nakata.work</td></tr>
              </tbody>
            </table>
          </section>

          <section id="article-2">
            <h2><span className="pp-article-num">Art. II.</span>取得する情報</h2>
            <p>当社は、本サービスの提供にあたり、以下の情報を取得します。</p>

            <h3>2-1. ユーザーから直接提供される情報</h3>
            <ol>
              <li>Googleアカウントの認証情報（OAuthを通じて取得する、メールアドレス、氏名、プロフィール画像）</li>
              <li>Googleカレンダーの予定情報（予定のタイトル、開始・終了時刻、説明、場所）</li>
              <li>本サービス内でユーザーが入力する情報（予定への評価、メモ、価値観に関する対話内容、役割、目標、ミッション文書）</li>
            </ol>

            <h3>2-2. サービス利用に伴い自動的に取得される情報</h3>
            <ol>
              <li>アクセスログ（IPアドレス、アクセス日時、リファラ、ユーザーエージェント）</li>
              <li>本サービス内での操作履歴（画面遷移、機能利用状況）</li>
              <li>Cookie および類似技術により取得される情報</li>
            </ol>

            <h3>2-3. 取得しない情報</h3>
            <p>当社は、以下の情報を取得しません。</p>
            <ul>
              <li>クレジットカード情報、銀行口座情報等の決済情報（本サービスは無料で提供されるため）</li>
              <li>マイナンバー、パスポート番号等の公的識別情報</li>
              <li>病歴、信条、人種等の要配慮個人情報（ユーザーが対話中に自発的に記述した場合を除く）</li>
            </ul>
          </section>

          <section id="article-3">
            <h2><span className="pp-article-num">Art. III.</span>利用目的</h2>
            <p>当社は、取得した情報を以下の目的のために利用します。</p>
            <ol>
              <li>本サービスの提供および運営</li>
              <li>ユーザーのGoogleカレンダー予定の表示、および評価・内省機能の提供</li>
              <li>AI（Anthropic社のClaude）を利用した、ユーザーの時間の使い方の分析、価値観の言語化支援、ミッション文書作成支援</li>
              <li>本サービスの改善および新機能の開発</li>
              <li>ユーザーからのお問い合わせへの対応</li>
              <li>利用規約違反への対応、不正利用の防止</li>
              <li>統計データの作成（個人を識別できない形式に加工したもの）</li>
            </ol>
            <p>当社は、上記の目的以外のために個人情報を利用しません。</p>
          </section>

          <section id="article-4">
            <h2><span className="pp-article-num">Art. IV.</span>第三者提供とAI処理の送信先</h2>

            <h3>4-1. AI処理のための外部送信</h3>
            <p>本サービスは、ユーザーの内省支援のため、取得した情報の一部を以下の外部AI事業者に送信します。</p>
            <table>
              <tbody>
                <tr><td>送信先事業者</td><td>Anthropic, PBC（アメリカ合衆国）</td></tr>
                <tr><td>サービス名</td><td>Claude API</td></tr>
                <tr><td>送信する情報</td><td>ユーザーがAI対話機能を利用した際の、予定情報、評価履歴、ユーザーの入力テキスト</td></tr>
                <tr><td>送信の目的</td><td>AIによる応答の生成、価値観の言語化支援、ミッション文書作成支援</td></tr>
                <tr><td>事業者の方針</td><td>Anthropic社は、API経由で送信されたデータを、AIモデルの学習に利用しません（※）</td></tr>
              </tbody>
            </table>
            <p style={{ fontSize: "13px", color: "var(--pp-ink-faint)" }}>
              ※ Anthropic社の公式方針については、
              <a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noopener noreferrer">同社のプライバシーポリシー</a>
              をご参照ください。
            </p>

            <h3>4-2. カレンダー連携のための外部送信</h3>
            <p>本サービスは、Googleカレンダーと連携するため、Google LLC（アメリカ合衆国）のAPIを通じてユーザーのカレンダーデータを取得します。取得範囲は、ユーザーがOAuth認証時に許諾した範囲に限定されます。</p>

            <h3>4-3. その他の第三者提供</h3>
            <p>当社は、上記のほか、以下の場合を除き、ユーザーの同意なく個人情報を第三者に提供しません。</p>
            <ol>
              <li>法令に基づく場合</li>
              <li>人の生命、身体または財産の保護のために必要で、ユーザーの同意を得ることが困難な場合</li>
              <li>公衆衛生の向上または児童の健全な育成の推進のために特に必要な場合で、ユーザーの同意を得ることが困難な場合</li>
              <li>国の機関または地方公共団体の法令の定める事務を遂行することに対して協力する必要がある場合</li>
            </ol>
          </section>

          <section id="article-5">
            <h2><span className="pp-article-num">Art. V.</span>AI学習利用の有無</h2>
            <p>当社は、ユーザーの個人情報および対話内容を、当社独自のAIモデルの学習に利用しません。</p>
            <p>また、第4条に記載のとおり、Anthropic社は、API経由で送信されたデータを同社のAIモデルの学習に利用しない方針を公表しています。</p>
          </section>

          <section id="article-6">
            <h2><span className="pp-article-num">Art. VI.</span>保存期間と削除方針</h2>

            <h3>6-1. 通常の保存期間</h3>
            <p>当社は、ユーザーが本サービスを利用している間、取得した個人情報を保存します。</p>

            <h3>6-2. 退会時の削除</h3>
            <p>ユーザーが本サービスを退会した場合、当社は以下の方針で個人情報を削除します。</p>
            <ol>
              <li><strong>退会時、当社の本番環境データベースから、ユーザーの個人情報を即時削除します</strong></li>
              <li><strong>バックアップデータに残存する個人情報は、退会から90日以内に物理的に削除します</strong></li>
            </ol>

            <h3>6-3. 削除されない情報</h3>
            <p>以下の情報は、個人を識別できない形式に加工した上で、統計データとして保持される場合があります。</p>
            <ul>
              <li>サービス全体の利用傾向に関する統計情報</li>
              <li>法令に基づき保存が義務付けられている情報</li>
            </ul>

            <h3>6-4. アクセスログの保存期間</h3>
            <p>アクセスログは、不正利用防止および障害対応のため、取得から最長1年間保存し、期間経過後に自動削除します。</p>
          </section>

          <section id="article-7">
            <h2><span className="pp-article-num">Art. VII.</span>ユーザーの権利</h2>
            <p>ユーザーは、自己の個人情報について、以下の権利を有します。</p>
            <ol>
              <li><strong>開示請求権</strong> — 当社が保有するご自身の個人情報の開示を請求できます</li>
              <li><strong>訂正請求権</strong> — 個人情報に誤りがある場合、訂正を請求できます</li>
              <li><strong>削除請求権</strong> — 個人情報の削除を請求できます</li>
              <li><strong>利用停止請求権</strong> — 個人情報の利用停止を請求できます</li>
              <li><strong>データポータビリティ権</strong> — ご自身の個人情報を、構造化された一般的な形式で取得し、他のサービスに移行できます</li>
            </ol>
            <p>これらの権利を行使される場合は、第14条のお問い合わせ窓口までご連絡ください。ご本人確認のうえ、合理的な期間内に対応します。</p>
          </section>

          <section id="article-8">
            <h2><span className="pp-article-num">Art. VIII.</span>EU居住者に対する特則 — GDPR対応</h2>

            <h3>8-1. 管理者</h3>
            <p>本サービスにおける個人データの管理者は、合同会社中田キカクです。</p>

            <h3>8-2. 処理の法的根拠</h3>
            <p>当社は、以下の法的根拠に基づき、EU居住者の個人データを処理します。</p>
            <ol>
              <li>ユーザーとの契約の履行（GDPR第6条1項(b)）</li>
              <li>ユーザーの同意（GDPR第6条1項(a)）</li>
              <li>当社の正当な利益の追求（GDPR第6条1項(f)）</li>
            </ol>

            <h3>8-3. EU居住者の追加の権利</h3>
            <p>EU居住のユーザーは、第7条に定める権利に加え、GDPRに基づく以下の権利を有します。</p>
            <ol>
              <li>処理制限権（第18条）</li>
              <li>異議申立権（第21条）</li>
              <li>監督機関への不服申立権（第77条）</li>
            </ol>

            <h3>8-4. 国外への移転</h3>
            <p>EU域内から取得した個人データは、第10条に定めるとおり米国（Anthropic社、Google社）に移転されます。当社は、適切な保護措置（標準契約条項等）を講じた上で移転を行います。</p>
          </section>

          <section id="article-9">
            <h2><span className="pp-article-num">Art. IX.</span>Cookieと解析ツール</h2>
            <p>本サービスは、利便性向上および利用状況の分析のため、Cookieおよび類似技術を利用することがあります。</p>
            <p>ユーザーは、ブラウザの設定によりCookieの受け入れを拒否できます。ただし、Cookieを拒否した場合、本サービスの一部機能が利用できなくなる可能性があります。</p>
          </section>

          <section id="article-10">
            <h2><span className="pp-article-num">Art. X.</span>国外データ移転</h2>
            <p>本サービスは、以下の国外事業者のサービスを利用するため、ユーザーの個人情報が日本国外に移転されます。</p>
            <table>
              <thead>
                <tr><th>移転先国</th><th>事業者</th><th>移転される情報</th></tr>
              </thead>
              <tbody>
                <tr><td>アメリカ合衆国</td><td>Anthropic, PBC</td><td>AI対話機能利用時の入力情報</td></tr>
                <tr><td>アメリカ合衆国</td><td>Google LLC</td><td>Googleカレンダー連携時のカレンダーデータ、認証情報</td></tr>
              </tbody>
            </table>
            <p style={{ fontSize: "13px", color: "var(--pp-ink-faint)" }}>
              移転先の個人情報保護制度については、
              <a href="https://www.ppc.go.jp/personalinfo/legal/kaiseihou/" target="_blank" rel="noopener noreferrer">個人情報保護委員会の公表する資料</a>
              をご参照ください。
            </p>
          </section>

          <section id="article-11">
            <h2><span className="pp-article-num">Art. XI.</span>セキュリティ措置</h2>
            <p>当社は、個人情報の漏えい、滅失または毀損を防止するため、以下のセキュリティ措置を講じます。</p>
            <ol>
              <li>通信経路の暗号化（HTTPS/TLS）</li>
              <li>データベースおよびバックアップの暗号化</li>
              <li>アクセス権限の最小化と定期的な見直し</li>
              <li>アクセスログの取得および監査</li>
              <li>従業者への教育および機密保持義務の遵守</li>
            </ol>
          </section>

          <section id="article-12">
            <h2><span className="pp-article-num">Art. XII.</span>未成年者の利用</h2>
            <p>本サービスは、<strong>13歳未満の方のご利用を想定していません</strong>。13歳以上18歳未満の方は、保護者の同意を得たうえでご利用ください。</p>
            <p>当社が13歳未満の方の個人情報を取得していることが判明した場合、当社は速やかに当該情報を削除します。</p>
          </section>

          <section id="article-13">
            <h2><span className="pp-article-num">Art. XIII.</span>本ポリシーの改定</h2>
            <p>当社は、法令の改正、本サービスの変更、その他の事由により、本ポリシーを改定することがあります。</p>
            <p>重要な改定を行う場合は、本サービス内での通知、または登録されたメールアドレスへの通知により、ユーザーに事前にお知らせします。</p>
            <p>改定後のポリシーは、本サービス上に掲載された時点から効力を生じます。</p>
          </section>

          <section id="article-14">
            <h2><span className="pp-article-num">Art. XIV.</span>お問い合わせ窓口</h2>
            <p>本ポリシーに関するお問い合わせ、および第7条・第8条に定める権利行使のご請求は、以下までご連絡ください。</p>
            <table>
              <tbody>
                <tr><td>窓口名</td><td>合同会社中田キカク 個人情報保護相談窓口</td></tr>
                <tr><td>担当者</td><td>代表社員 中田雄斗（個人情報保護責任者）</td></tr>
                <tr><td>メールアドレス</td><td><a href="mailto:yuto@nakata.work">yuto@nakata.work</a></td></tr>
                <tr><td>所在地</td><td>東京都板橋区板橋1-45-2-702</td></tr>
              </tbody>
            </table>
          </section>

          <div className="pp-footer-meta">
            <div><strong>制定日</strong>：2026年4月21日</div>
            <div><strong>最終改定日</strong>：2026年4月21日</div>
            <div>合同会社中田キカク</div>
          </div>
        </main>
      </div>

      <footer className="pp-footer">
        <span className="pp-logo">DAYS</span>
        © 合同会社中田キカク
      </footer>
    </div>
  );
}
