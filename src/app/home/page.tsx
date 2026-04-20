
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser, useFirestore } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const db = useFirestore();
  const { user, isUserLoading, isPreviewMode } = useUser();

  useEffect(() => {
    console.log("home:init", { isUserLoading, hasUser: !!user });
    if (isUserLoading) return;

    if (!user) {
      router.replace("/");
      return;
    }

    if (isPreviewMode) {
      router.replace("/settings");
      return;
    }

    (async () => {
      try {
        const missionSnap = await getDoc(doc(db, "users", user.uid, "mission", "current"));
        router.replace(missionSnap.exists() ? "/settings" : "/setup");
      } catch (e) {
        console.error("home: mission check error", e);
        router.replace("/settings");
      }
    })();
  }, [router, user, isUserLoading, isPreviewMode, db]);

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-background gap-4">
      <Loader2 className="animate-spin opacity-20 h-8 w-8 text-primary" />
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">ページを読み込んでいます...</p>
    </div>
  );
}
