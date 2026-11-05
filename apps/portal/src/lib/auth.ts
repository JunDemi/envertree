import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export interface CurrentUser {
  id: string;
  email?: string;
  name: string;
  avatarUrl?: string;
}

/**
 * 현재 로그인한 사용자. 로그인하지 않았으면 null.
 * 서버에서만 사용한다. (나중에 점수 저장 등에서도 이 함수를 쓰면 된다)
 *
 * getClaims()는 토큰 서명을 검증하므로 권한 확인에 써도 안전하다.
 * (getSession()의 사용자 정보는 검증되지 않으니 권한 확인에 쓰지 말 것)
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (!isSupabaseConfigured) return null;

  // Supabase는 세션 만료 확인에 Date.now()를 쓴다. partialPrefetching이 켜져 있으면
  // Next.js가 쿠키를 가진 채 미리 렌더링을 시도하는데, 그 단계에서는 현재 시각을
  // 읽을 수 없어 오류가 난다. connection()으로 "실제 요청 때만 실행"을 명시한다.
  await connection();

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return null;

  // Google 로그인 시 user_metadata에 이름과 프로필 사진이 들어 있다
  const meta = (claims.user_metadata ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);

  return {
    id: claims.sub,
    email: claims.email,
    name: str(meta.full_name) ?? str(meta.name) ?? claims.email ?? "사용자",
    avatarUrl: str(meta.avatar_url) ?? str(meta.picture),
  };
}
