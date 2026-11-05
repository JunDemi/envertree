"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const buttonClass =
  "rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium transition hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800";

export function LoginButton() {
  const pathname = usePathname();
  const [pending, setPending] = useState(false);

  async function login() {
    setPending(true);
    // 로그인 후 지금 보던 페이지로 돌아오도록 next에 현재 경로를 담는다
    const next = pathname + window.location.search;
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    // 성공하면 Google 로그인 페이지로 이동하므로 여기까지 오지 않는다
    if (error) {
      console.error("[login]", error.message);
      alert("로그인을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      setPending(false);
    }
  }

  return (
    <button type="button" onClick={login} disabled={pending} className={buttonClass}>
      {pending ? "이동 중…" : "Google 로그인"}
    </button>
  );
}

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    await createClient().auth.signOut();
    // 서버에서 그린 헤더를 다시 그리도록 새로고침
    router.refresh();
    setPending(false);
  }

  return (
    <button type="button" onClick={logout} disabled={pending} className={buttonClass}>
      로그아웃
    </button>
  );
}
