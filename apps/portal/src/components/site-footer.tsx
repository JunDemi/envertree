import { siteConfig } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-zinc-200 py-6 text-center text-sm text-zinc-500 dark:border-zinc-800">
      © {siteConfig.name}. 모든 게임은 브라우저에서 무료로 플레이할 수 있습니다.
    </footer>
  );
}
