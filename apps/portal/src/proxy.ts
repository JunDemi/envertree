import { NextResponse, type NextRequest } from "next/server";
import { getGameBySlug } from "@/lib/games";

/**
 * 페이지 렌더링 전에 실행된다.
 *
 * 없는 게임 주소(/games/<없는 slug>)는 여기서 404로 돌려준다.
 * 페이지 안에서 notFound()를 부르면 레이아웃이 먼저 스트리밍되어
 * 상태 코드가 200으로 고정되기 때문이다. (화면은 같은 not-found 페이지)
 *
 * Phase 3에서 Supabase 세션 갱신도 여기에 추가한다.
 */
export function proxy(request: NextRequest) {
  const match = request.nextUrl.pathname.match(/^\/games\/([^/]+)\/?$/);
  if (match && !getGameBySlug(decodeURIComponent(match[1]))) {
    // 어떤 라우트에도 해당하지 않는 경로로 rewrite → not-found 페이지가 404로 응답
    return NextResponse.rewrite(new URL("/_404", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/games/:slug",
};
