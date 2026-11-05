import { cacheLife } from "next/cache";
import { ImageResponse } from "next/og";
import { games, getGameBySlug } from "@/lib/games";
import { siteConfig } from "@/lib/site";

export const alt = "게임 대표 이미지";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return games.map((game) => ({ slug: game.slug }));
}

/**
 * 기본 폰트에는 한글이 없으므로, 이미지에 들어갈 글자만 Google Fonts에서 받아온다.
 * 결과는 캐시해서 같은 글자 조합이면 다시 받지 않는다. 실패하면 기본 폰트로 그린다.
 */
async function loadKoreanFont(text: string): Promise<ArrayBuffer | null> {
  "use cache";
  cacheLife("max");
  try {
    const url = `https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@700&text=${encodeURIComponent(text)}`;
    const css = await (await fetch(url)).text();
    const fontUrl = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    if (!fontUrl) return null;
    const res = await fetch(fontUrl);
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const game = getGameBySlug(slug);
  const title = game?.title ?? siteConfig.name;
  const tagline = "지금 바로 플레이";
  const font = await loadKoreanFont(title + siteConfig.name + tagline);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(135deg, #18181b 0%, #3f3f46 100%)",
          color: "white",
          fontFamily: font ? "Noto Sans KR" : undefined,
        }}
      >
        <div style={{ fontSize: 36, opacity: 0.7 }}>{siteConfig.name}</div>
        <div style={{ fontSize: 96, fontWeight: 700, lineHeight: 1.1 }}>{title}</div>
        <div style={{ fontSize: 32, opacity: 0.7 }}>{tagline}</div>
      </div>
    ),
    {
      ...size,
      fonts: font ? [{ name: "Noto Sans KR", data: font, weight: 700 }] : undefined,
    },
  );
}
