import { defineConfig } from "vite";

export default defineConfig({
  // 포털의 /play/<slug>/ 아래에서 서비스되므로 리소스 경로를 상대 경로로 만든다.
  // (절대 경로 "/assets/..."면 포털 루트에서 찾다가 404가 난다)
  base: "./",
  build: {
    // Phaser 자체가 1MB 넘게 커서 기본 경고(500KB)를 올려둔다
    chunkSizeWarningLimit: 2000,
  },
});
