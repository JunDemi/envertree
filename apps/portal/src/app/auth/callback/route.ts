import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/server";

/**
 * Google 로그인 후 Supabase가 이 주소로 돌려보낸다: /auth/callback?code=...&next=/원래/페이지
 * code를 세션으로 교환해 쿠키에 저장하고, 원래 보던 페이지로 이동한다.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Vercel 등 로드밸런서 뒤에서는 원래 호스트가 x-forwarded-host로 들어온다
      const forwardedHost = request.headers.get("x-forwarded-host");
      if (process.env.NODE_ENV !== "development" && forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("[auth/callback] 세션 교환 실패:", error.message);
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
