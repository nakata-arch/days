
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Sun, Settings, ClipboardCheck, ListTodo } from "lucide-react";
import { cn } from "@/lib/utils";

export function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { href: "/today", label: "今日", icon: Sun },
    { href: "/report", label: "報告", icon: ClipboardCheck },
    { href: "/classify", label: "分類", icon: ListTodo },
    { href: "/review", label: "レビュー", icon: BarChart3 },
    { href: "/settings", label: "設定", icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 glass z-50 safe-area-bottom">
      <div className="flex justify-around items-center h-[68px] max-w-xl mx-auto px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full transition-colors px-1",
                isActive ? "text-[hsl(var(--accent))]" : "text-ink-faint hover:text-ink-soft"
              )}
            >
              <Icon className={cn("h-[18px] w-[18px]", isActive && "stroke-[2px]")} />
              <span className="text-[9px] font-sans tracking-[0.05em] mt-1 whitespace-nowrap">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
