"use client";

import { useEffect, useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { useFirestore, useUser } from "@/firebase";
import "./landing.css";

export default function LandingPage() {
  const { user, isUserLoading, isPreviewMode } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);

  const resolvePostLoginRoute = useCallback(
    async (uid: string): Promise<"/setup" | "/settings"> => {
      if (isPreviewMode) return "/settings";
      try {
        const missionSnap = await getDoc(doc(db, "users", uid, "mission", "current"));
        return missionSnap.exists() ? "/settings" : "/setup";
      } catch {
        return "/settings";
      }
    },
    [db, isPreviewMode]
  );

  // ログイン済みならアプリへ飛ばす
  useEffect(() => {
    if (isUserLoading || !user) return;
    setRedirecting(true);
    resolvePostLoginRoute(user.uid).then((path) => router.replace(path));
  }, [user, isUserLoading, resolvePostLoginRoute, router]);

  // スクロール時のフェードイン
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("lp-visible");
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -50px 0px" }
    );
    document.querySelectorAll(".lp-reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  if (redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="lp-root">
      <nav className="lp-nav">
        <div className="lp-nav-logo">DAYS</div>
        <Link href="/login" className="lp-nav-cta">試す</Link>
      </nav>

      {/* HERO */}
      <section className="lp-hero">
        <div className="lp-container">
          <div className="lp-hero-kicker lp-latin">A New Axis for Human Evaluation</div>
          <h1>
            人は、稼いだ額ではなく、<br />
            <span className="lp-emph">時間の使い方</span>でも<br />
            評価されるべきだ。
          </h1>
          <div className="lp-hero-lead">
            <p>お金は、社会を発展させてきた。これからも重要な軸であり続ける。</p>
            <p>しかし、お金だけでは測れない積み上げがある。時間だけが、全人類に平等に与えられた、唯一の絶対基準だ。</p>
            <p>DAYSは、お金と時間の2軸で人が評価される社会の、時間側の基盤となる。</p>
          </div>
          <div className="lp-hero-meta">
            <div><span className="lp-num">168</span><span className="lp-sans">HOURS / WEEK</span></div>
            <div><span className="lp-num">∞</span><span className="lp-sans">CURRENCY</span></div>
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="lp-problem">
        <div className="lp-container">
          <div className="lp-section-label lp-reveal"><span className="lp-num lp-latin">I.</span>PROBLEM</div>
          <h2 className="lp-reveal">頑張っているのに、<br />評価されない違和感。</h2>
          <p className="lp-reveal">売上や生産性は、能力ではなく環境の結果である。同じ能力でも、どの国で働くか、どの市場にいるかで、数値は大きく変わる。外部要因に左右される相対評価には、絶対的な基準が存在しない。</p>
          <p className="lp-reveal">その結果、本来評価されるべき努力や積み上げが見えなくなってしまう。</p>

          <div className="lp-pull-quote lp-reveal">
            問題は人ではない。構造である。<br />
            そして構造は、設計できる。
          </div>

          <p className="lp-reveal">古くから、人生を整えるための時間管理の思想や手帳は存在してきた。しかしその多くは、継続できた人が限られている。思想が崇高すぎ、運用が重すぎたからだ。</p>
          <p className="lp-reveal">DAYSは、それらを習慣化できなかったすべての人のためにある。</p>
        </div>
      </section>

      {/* TWO AXES */}
      <section>
        <div className="lp-container">
          <div className="lp-section-label lp-reveal"><span className="lp-num lp-latin">II.</span>TWO AXES</div>
          <h2 className="lp-reveal">資本主義を、否定しない。<br />もうひとつの軸を、足す。</h2>
          <p className="lp-reveal">お金は、市場の成熟度や環境によって増減する相対的な価値であり、社会を発展させてきた。これは今後も重要な軸であり続ける。一方で、お金では測れない勤勉さ——継続性、積み上げ、再現性——を評価するために、もうひとつの軸が必要だ。</p>

          <div className="lp-axes lp-reveal">
            <div className="lp-axis">
              <div className="lp-axis-label lp-latin">Axis I.</div>
              <h3>お金<br /><span className="lp-latin" style={{ fontSize: "18px", color: "var(--lp-ink-faint)", fontStyle: "italic" }}>Money</span></h3>
              <p className="lp-axis-desc">市場と環境に応じて増減する、相対的な価値。社会を動かすエンジン。これからも必要だ。</p>
            </div>
            <div className="lp-axis">
              <div className="lp-axis-label lp-latin">Axis II.</div>
              <h3>時間<br /><span className="lp-latin" style={{ fontSize: "18px", color: "var(--lp-ink-faint)", fontStyle: "italic" }}>Time</span></h3>
              <p className="lp-axis-desc">全人類に平等に与えられた、有限で絶対の基準。積み上げと勤勉さを、ここでだけ正しく測れる。</p>
            </div>
          </div>

          <div className="lp-ornament">✦ ✦ ✦</div>
        </div>
      </section>

      {/* PRINCIPLES */}
      <section className="lp-manifesto">
        <div className="lp-container">
          <div className="lp-section-label lp-reveal"><span className="lp-num lp-latin">III.</span>PRINCIPLES</div>
          <h2 className="lp-reveal">DAYSの、5つの設計原則。</h2>

          <ol className="lp-principles">
            <li className="lp-reveal">
              <div>
                <h3>仕事と人生を分けない</h3>
                <p>ワークライフバランスという発想を採らない。すべての時間は、一つの人生である。</p>
              </div>
            </li>
            <li className="lp-reveal">
              <div>
                <h3>設計と実行に分解する</h3>
                <p>何に時間を使うと決めたか（設計）と、実際にできたか（実行）を、別々に記録する。両方が、別の能力だ。</p>
              </div>
            </li>
            <li className="lp-reveal">
              <div>
                <h3>勤勉さを最上位に置く</h3>
                <p>短期の成果ではなく、長期の継続・積み上げ・再現性を評価する。それは長期でしか測れない。</p>
              </div>
            </li>
            <li className="lp-reveal">
              <div>
                <h3>ミッションは、書かせない</h3>
                <p>白紙から価値観を絞り出させない。記録された時間から、価値観を浮かび上がらせる。</p>
              </div>
            </li>
            <li className="lp-reveal">
              <div>
                <h3>すべての人の時間を扱う</h3>
                <p>経営者も、町の食堂の店主も、学生も、定年後の人も、同じ絶対基準の上に立つ。</p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      {/* HOW */}
      <section className="lp-how">
        <div className="lp-container">
          <div className="lp-section-label lp-reveal"><span className="lp-num lp-latin">IV.</span>HOW IT WORKS</div>
          <h2 className="lp-reveal">フリック3秒の時間日記が、<br />やがて価値観を映し出す。</h2>

          <div className="lp-steps">
            <div className="lp-step lp-reveal">
              <div className="lp-step-num lp-latin">i.</div>
              <div>
                <h3>予定を、カレンダーに書く</h3>
                <p className="lp-step-desc">Googleカレンダーをそのまま使う。独自の予定表は作らない。すでに書いている予定が、そのまま素材になる。</p>
              </div>
            </div>
            <div className="lp-step lp-reveal">
              <div className="lp-step-num lp-latin">ii.</div>
              <div>
                <h3>終わった予定を、フリックで評価する</h3>
                <p className="lp-step-desc">左にスワイプで「できた」。右で「できなかった」。上で「保留」。3秒で終わる儀式。毎日の朝と夜、2回だけ通知が届く。</p>
              </div>
            </div>
            <div className="lp-step lp-reveal">
              <div className="lp-step-num lp-latin">iii.</div>
              <div>
                <h3>AIが、あなたのデータから傾向を示す</h3>
                <p className="lp-step-desc">何に時間を使っているか、何が続いていて何が続いていないか。AIは評価しない。事実だけを、静かに示す。</p>
              </div>
            </div>
            <div className="lp-step lp-reveal">
              <div className="lp-step-num lp-latin">iv.</div>
              <div>
                <h3>記録が積み上がると、価値観が見えてくる</h3>
                <p className="lp-step-desc">数週間の記録の上で、AIと対話しながら価値観を言語化する。白紙から絞り出すのではない。蓄積が、答えを連れてくる。</p>
              </div>
            </div>
            <div className="lp-step lp-reveal">
              <div className="lp-step-num lp-latin">v.</div>
              <div>
                <h3>やがて、自分のミッションに辿り着く</h3>
                <p className="lp-step-desc">価値観が見えた人にだけ、ミッションを書く機能が開く。急がない。先に走らない。勤勉さの先にしか、それは現れない。</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="lp-features">
        <div className="lp-container">
          <div className="lp-section-label lp-reveal"><span className="lp-num lp-latin">V.</span>FEATURES</div>
          <h2 className="lp-reveal">今、使える機能。</h2>
          <p className="lp-reveal">思想だけでは続かない。毎日の運用を支える、具体的な道具として作られている。</p>

          <div className="lp-features-grid">
            <div className="lp-feature lp-reveal">
              <div className="lp-feature-label lp-latin">01 · Calendar</div>
              <h3>Googleカレンダーとの双方向連携</h3>
              <p>既存の予定をそのまま読み込む。分類の結果はカレンダーの色として書き戻し、報告は説明欄に静かに残る。カレンダーは、一つで済む。</p>
            </div>
            <div className="lp-feature lp-reveal">
              <div className="lp-feature-label lp-latin">02 · Swipe</div>
              <h3>3秒のフリック報告</h3>
              <p>左へスワイプで「できた」、右で「できなかった」、上で「保留」。メモは必要なときだけ。毎日の小さな儀式として成立する軽さ。</p>
            </div>
            <div className="lp-feature lp-reveal">
              <div className="lp-feature-label lp-latin">03 · Matrix</div>
              <h3>四象限で時間の質を見る</h3>
              <p>重要×緊急、重要×非緊急、緊急×非重要、低優先。各予定を斜めスワイプで振り分ける。時間の使い方が、色と形で立ち上がってくる。</p>
            </div>
            <div className="lp-feature lp-reveal">
              <div className="lp-feature-label lp-latin">04 · Focus</div>
              <h3>重要な時間への集中度</h3>
              <p>緊急ではないが重要——長期の成果につながる時間を、どれだけ積み上げられたか。単一の割合として、静かに俯瞰する。</p>
            </div>
            <div className="lp-feature lp-reveal">
              <div className="lp-feature-label lp-latin">05 · Report</div>
              <h3>週・月・年のレポート</h3>
              <p>AIが事実だけをまとめる。評価も提案もしない。気づきは、ユーザー自身の中から生まれる。押し付けずに、素材だけを置く。</p>
            </div>
            <div className="lp-feature lp-reveal">
              <div className="lp-feature-label lp-latin">06 · Voice</div>
              <h3>音声入力の日記</h3>
              <p>書くのが面倒な日は、話しかければいい。ブラウザ内蔵の音声認識で、考えたことをそのまま言葉として残せる。</p>
            </div>
            <div className="lp-feature lp-reveal">
              <div className="lp-feature-label lp-latin">07 · Mobile</div>
              <h3>スマートフォンで、アプリのように</h3>
              <p>ホーム画面に追加すれば、ブラウザを感じさせない起動。通勤の隙間でも、寝る前の数分でも、手を伸ばせる距離にある。</p>
            </div>
            <div className="lp-feature lp-reveal">
              <div className="lp-feature-label lp-latin">08 · Privacy</div>
              <h3>あなたのデータは、あなたのもの</h3>
              <p>すべての記録は、あなたのFirebase領域にだけ存在する。他者に共有しない。運営側から閲覧することもない。</p>
            </div>
          </div>
        </div>
      </section>

      {/* WHO */}
      <section>
        <div className="lp-container">
          <div className="lp-section-label lp-reveal"><span className="lp-num lp-latin">VI.</span>FOR WHOM</div>
          <h2 className="lp-reveal">忙しい人のための道具ではない。<br />すべての人のための基盤だ。</h2>

          <ul className="lp-who-list lp-reveal">
            <li>仕事の時間を、整えたい経営者</li>
            <li>家族との時間を、取り戻したい親</li>
            <li>町で毎日、店を開ける人</li>
            <li>自分を見つめ直したい、学生</li>
            <li>定年後の時間を、生き直す人</li>
            <li>何度も手帳を挫折した、あなた</li>
          </ul>

          <p className="lp-who-closing lp-reveal">
            大きな利益を出している企業と、毎日営業している町の食堂。売上だけで見れば前者が優れているかもしれない。しかし、時間の使い方と継続性で見れば、評価はまったく異なる。DAYSは、その両方を尊重する社会のための道具である。
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="lp-faq">
        <div className="lp-container">
          <div className="lp-section-label lp-reveal"><span className="lp-num lp-latin">VII.</span>QUESTIONS</div>
          <h2 className="lp-reveal">よくある問いかけ。</h2>

          <div className="lp-faq-list">
            <div className="lp-faq-item lp-reveal">
              <div className="lp-faq-q">使い始めるのに、何が必要ですか。</div>
              <p className="lp-faq-a">Googleアカウントだけです。既にお使いのGoogleカレンダーの予定が、そのまま素材になります。新しく何かを書き始める必要はありません。</p>
            </div>
            <div className="lp-faq-item lp-reveal">
              <div className="lp-faq-q">料金はかかりますか。</div>
              <p className="lp-faq-a">現在はベータ版として無料で公開しています。世界の人の行動が変わることを最も重要視しているためです。今後の料金体系は、運用の中で考えていきます。</p>
            </div>
            <div className="lp-faq-item lp-reveal">
              <div className="lp-faq-q">記録したデータは、どこに保存されますか。</div>
              <p className="lp-faq-a">Googleの提供するFirestore上の、あなた専用の領域に保存されます。他のユーザーからも、運営側からも、原則アクセスされません。</p>
            </div>
            <div className="lp-faq-item lp-reveal">
              <div className="lp-faq-q">「時間の使い方で評価される」とは、どういう意味ですか。</div>
              <p className="lp-faq-a">他者が勝手に評価するのではなく、自分自身の積み上げを、自分自身で正しく認識できる、という意味です。長期の継続や勤勉さは、短期の売上や成果では見えません。時間という絶対基準だけが、それを映します。</p>
            </div>
            <div className="lp-faq-item lp-reveal">
              <div className="lp-faq-q">毎日どのくらいの時間が必要ですか。</div>
              <p className="lp-faq-a">合計で数分です。終わった予定に対し、左右と上のフリックで「できた」「できなかった」「保留」を返すだけ。重ければ続きません。軽さこそが設計の核です。</p>
            </div>
            <div className="lp-faq-item lp-reveal">
              <div className="lp-faq-q">スマートフォンでも使えますか。</div>
              <p className="lp-faq-a">はい。iPhone / Android いずれのブラウザからも動作します。ホーム画面に追加すれば、アプリのように起動できます。</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="lp-cta-section">
        <div className="lp-container">
          <h2 className="lp-reveal">緊急ではない、<br />しかし、重要なことを。</h2>
          <p className="lp-cta-lead lp-reveal">DAYSは現在、ベータ版として無料で公開されています。世界の人の行動が変わることが、私たちにとって最も重要なことだからです。</p>
          <Link href="/login" className="lp-cta-button lp-reveal">DAYSを開く</Link>
          <div className="lp-cta-note lp-reveal">BETA — FREE TO USE</div>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-logo">DAYS</div>
        <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
          <Link href="/privacy" style={{ color: "inherit", textDecoration: "none" }}>プライバシーポリシー</Link>
          <span>© 合同会社中田キカク</span>
        </div>
      </footer>
    </div>
  );
}
