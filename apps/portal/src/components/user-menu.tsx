import Image from "next/image";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { LoginButton, LogoutButton } from "./auth-buttons";

/** 헤더 오른쪽: 로그인 버튼 또는 프로필 + 로그아웃 */
export async function UserMenu() {
  if (!isSupabaseConfigured) {
    return (
      <button
        type="button"
        disabled
        title="Supabase 환경변수가 설정되지 않았습니다 (.env.example 참고)"
        className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm text-zinc-400 dark:border-zinc-700"
      >
        로그인
      </button>
    );
  }

  const user = await getCurrentUser();
  if (!user) return <LoginButton />;

  return (
    <div className="flex items-center gap-3">
      {user.avatarUrl ? (
        <Image
          src={user.avatarUrl}
          alt=""
          width={32}
          height={32}
          className="size-8 rounded-full"
        />
      ) : (
        <span className="flex size-8 items-center justify-center rounded-full bg-zinc-200 text-sm font-semibold dark:bg-zinc-800">
          {user.name.slice(0, 1)}
        </span>
      )}
      <span className="hidden max-w-40 truncate text-sm font-medium sm:inline">{user.name}</span>
      <LogoutButton />
    </div>
  );
}

/** 사용자 정보를 읽는 동안 보여줄 자리 (레이아웃이 흔들리지 않게 비슷한 크기) */
export function UserMenuSkeleton() {
  return <div className="h-8 w-28 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />;
}
