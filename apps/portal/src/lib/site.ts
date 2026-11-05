// 사이트 전체에서 쓰는 기본 정보. 이름을 바꾸려면 여기만 고치면 된다.
export const siteConfig = {
  name: "Envertree Games",
  description: "설치 없이 브라우저에서 바로 즐기는 웹 게임 모음",
  /** OG 이미지 같은 절대 URL을 만들 때 쓰는 사이트 주소 */
  url: getSiteUrl(),
} as const;

function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  // Vercel이 빌드 시 자동으로 넣어주는 프로덕션 도메인 (https:// 없이 들어옴)
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return "http://localhost:3000";
}
