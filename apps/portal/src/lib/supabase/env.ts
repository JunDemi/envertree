/**
 * Supabase 연결 정보. .env.local 에 설정한다 (.env.example 참고).
 * 값이 없으면 로그인 기능만 꺼지고 사이트는 그대로 동작한다.
 */
export const supabaseUrl = toProjectUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
export const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

/**
 * 프로젝트 URL은 "https://<ref>.supabase.co" 형태여야 한다.
 * 대시보드에서 "https://<ref>.supabase.co/rest/v1/" 같은 API 주소를 복사해 넣는 실수가 잦아서
 * 경로를 떼고 origin만 쓴다. (경로가 붙으면 로그인 요청이 엉뚱한 곳으로 간다)
 */
function toProjectUrl(raw: string | undefined): string {
  if (!raw) return "";
  try {
    return new URL(raw).origin;
  } catch {
    console.error(`[supabase] NEXT_PUBLIC_SUPABASE_URL 형식이 잘못되었습니다: ${raw}`);
    return "";
  }
}
