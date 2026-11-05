import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "로그인 실패" };

export default function AuthCodeErrorPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
      <p className="text-5xl">🔒</p>
      <h1 className="text-2xl font-bold">로그인에 실패했습니다</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        로그인 과정이 취소되었거나 시간이 초과되었습니다. 다시 시도해 주세요.
      </p>
      <Link
        href="/"
        className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        홈으로
      </Link>
    </div>
  );
}
