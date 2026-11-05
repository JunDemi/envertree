import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, supabasePublishableKey, supabaseUrl } from "./env";

/**
 * 만료가 가까운 로그인 토큰을 갱신해서 쿠키에 다시 써준다.
 * 서버 컴포넌트는 쿠키를 쓸 수 없기 때문에 proxy에서 해야 한다.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!isSupabaseConfigured) return response;

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        // 서버 컴포넌트가 갱신된 토큰을 읽도록 요청 쿠키에도 반영
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        // 로그인 쿠키가 담긴 응답이 CDN에 캐시되어 다른 사람에게 가지 않도록
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // createServerClient와 getClaims() 사이에 다른 코드를 넣지 말 것.
  // 이 호출이 토큰을 검증하고 필요하면 갱신한다.
  await supabase.auth.getClaims();

  // setAll이 마지막으로 만든 response를 그대로 반환해야 쿠키가 유지된다.
  return response;
}
