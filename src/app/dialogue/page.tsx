"use client";

import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import { MessageCircle } from "lucide-react";

export default function DialoguePage() {
  return (
    <div className="flex flex-col min-h-screen bg-paper pb-32">
      <header className="px-6 pt-10 pb-6 border-b border-rule max-w-[720px] mx-auto w-full">
        <div className="font-latin text-[18px] font-medium tracking-[0.35em]">DAYS</div>
      </header>

      <main className="max-w-[720px] w-full mx-auto px-6 pt-10">
        <div className="text-center py-20 space-y-6">
          <div className="w-16 h-16 bg-paper-warm flex items-center justify-center mx-auto border border-rule">
            <MessageCircle className="text-ink-faint h-8 w-8" />
          </div>
          <div className="space-y-3">
            <div className="font-latin italic text-[13px] text-[hsl(var(--accent))] tracking-[0.2em]">
              Coming Soon
            </div>
            <h1 className="text-2xl font-headline font-semibold text-ink">対話</h1>
            <p className="text-[14px] text-ink-soft leading-[2] max-w-md mx-auto">
              記録が積み上がった方から、AIとの対話で<br />
              価値観を言語化していただけるようにする予定です。
            </p>
            <p className="text-[12px] text-ink-faint italic pt-4">
              この機能は現在準備中です。
            </p>
          </div>
          <Link
            href="/today"
            className="inline-block mt-4 font-sans text-[11px] tracking-[0.2em] text-ink-faint hover:text-ink"
          >
            ← 今日に戻る
          </Link>
        </div>
      </main>

      <Navigation />
    </div>
  );
}
