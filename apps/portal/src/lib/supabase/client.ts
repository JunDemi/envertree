import { createBrowserClient } from "@supabase/ssr";
import { supabasePublishableKey, supabaseUrl } from "./env";

/** 클라이언트 컴포넌트용. 여러 번 불러도 같은 인스턴스를 돌려준다. */
export function createClient() {
  return createBrowserClient(supabaseUrl, supabasePublishableKey);
}
