import { NextResponse, type NextRequest } from "next/server";
import { getGameBySlug } from "@/lib/games";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * 페이지 렌더링 전에 실행된다.
 *
 * 1. 없는 게임 주소(/games/<없는 slug>)는 여기서 404로 돌려준다.
 *    페이지 안에서 notFound()를 부르면 레이아웃이 먼저 스트리밍되어
 *    상태 코드가 200으로 고정되기 때문이다. (화면은 같은 not-found 페이지)
 * 2. 그 외에는 Supabase 로그인 세션을 갱신한다.
 */
export async function proxy(request: NextRequest) {
  const match = request.nextUrl.pathname.match(/^\/games\/([^/]+)\/?$/);
  if (match && !getGameBySlug(decodeURIComponent(match[1]))) {
    // 어떤 라우트에도 해당하지 않는 경로로 rewrite → not-found 페이지가 404로 응답
    return NextResponse.rewrite(new URL("/_404", request.url));
  }
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * 아래를 제외한 모든 경로에서 실행:
     * - _next/static, _next/image: Next.js 빌드 파일과 이미지 최적화
     * - play/: 빌드된 게임 파일 (게임은 로그인 세션이 필요 없다)
     * - thumbnails/, favicon.ico, 이미지 확장자: 정적 파일
     */
    "/((?!_next/static|_next/image|play/|thumbnails/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
