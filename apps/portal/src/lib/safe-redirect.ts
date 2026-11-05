/**
 * 로그인 후 돌아갈 경로. 외부 사이트로 튕겨 보내는 공격(open redirect)을 막기 위해
 * 같은 사이트 안의 경로("/..."로 시작, "//" 금지)만 허용한다.
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return "/";
  }
  return next;
}
