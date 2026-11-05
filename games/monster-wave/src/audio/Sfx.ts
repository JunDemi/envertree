import Phaser from "phaser";
import type { WeaponId } from "../config";
import { storage } from "../storage";

/**
 * 효과음. 외부 파일 없이 Web Audio로 그때그때 합성한다.
 * Phaser 사운드 매니저의 오디오 컨텍스트와 출력 노드를 쓰므로
 * - 브라우저 자동재생 제한 해제(첫 클릭/키 입력)는 Phaser가 처리하고
 * - 음소거는 Phaser의 sound.mute, 창이 포커스를 잃으면 Phaser가 소리를 멈춘다.
 *
 * 같은 소리가 한 프레임에 수십 번 겹치지 않도록 소리마다 최소 간격(throttle)을 둔다.
 */
export type SfxName =
  | WeaponId
  | "explosion"
  | "hit"
  | "kill"
  | "hurt"
  | "unlock"
  | "pickup"
  | "place"
  | "fireball"
  | "waveStart"
  | "waveClear"
  | "empty";

const MIN_INTERVAL_MS: Partial<Record<SfxName, number>> = {
  hit: 35,
  kill: 40,
  explosion: 60,
  smg: 60,
  fireball: 80,
};

class SfxPlayer {
  private ctx: AudioContext | null = null;
  private out: AudioNode | null = null;
  private noise: AudioBuffer | null = null;
  private manager: Phaser.Sound.BaseSoundManager | null = null;
  /**
   * 음소거 상태는 여기서 직접 들고 있는다. Phaser의 sound.mute는 Web Audio gain 값을 읽어 오는데,
   * 설정 직후에는 오디오 스레드에 반영되기 전이라 이전 값이 읽힌다.
   */
  private mutedState = false;
  private readonly lastPlayed = new Map<SfxName, number>();

  /** 게임 시작 시 한 번. Web Audio를 쓸 수 없으면 조용히 아무 소리도 내지 않는다 */
  init(game: Phaser.Game) {
    this.manager = game.sound;
    if (game.sound instanceof Phaser.Sound.WebAudioSoundManager) {
      this.ctx = game.sound.context;
      const master = this.ctx.createGain();
      master.gain.value = 0.35;
      master.connect(game.sound.destination);
      this.out = master;
      // 1초짜리 흰 소음 버퍼 (총소리, 폭발에 재사용)
      const len = this.ctx.sampleRate;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    this.mutedState = storage.getMuted();
    game.sound.mute = this.mutedState;
    // 오디오가 아직 잠겨(suspended) 있으면 설정이 반영되지 않을 수 있어, 첫 입력으로 풀릴 때 다시 적용
    game.sound.once(Phaser.Sound.Events.UNLOCKED, () => {
      game.sound.mute = this.mutedState;
    });
  }

  get muted() {
    return this.mutedState;
  }

  toggleMute(): boolean {
    this.mutedState = !this.mutedState;
    if (this.manager) this.manager.mute = this.mutedState;
    storage.setMuted(this.mutedState);
    return this.mutedState;
  }

  play(name: SfxName) {
    const ctx = this.ctx;
    if (!ctx || !this.out || ctx.state !== "running") return;
    const now = performance.now();
    const min = MIN_INTERVAL_MS[name] ?? 0;
    if (min > 0 && now - (this.lastPlayed.get(name) ?? 0) < min) return;
    this.lastPlayed.set(name, now);

    const t = ctx.currentTime;
    switch (name) {
      case "pistol":
        this.noiseBurst(t, 0.07, "bandpass", 1800, 0.5);
        this.tone(t, "sine", 180, 60, 0.08, 0.5);
        break;
      case "smg":
        this.noiseBurst(t, 0.045, "bandpass", 2200, 0.32);
        this.tone(t, "sine", 160, 70, 0.05, 0.3);
        break;
      case "shotgun":
        this.noiseBurst(t, 0.2, "lowpass", 1400, 0.8);
        this.tone(t, "sine", 120, 40, 0.18, 0.8);
        break;
      case "rocket":
        this.noiseBurst(t, 0.35, "bandpass", 900, 0.4, 300);
        this.tone(t, "sawtooth", 220, 90, 0.3, 0.15);
        break;
      case "grenade":
        this.noiseBurst(t, 0.15, "highpass", 2500, 0.15);
        break;
      case "barricade":
      case "barrel":
      case "place":
        this.tone(t, "sine", 140, 55, 0.12, 0.6);
        this.noiseBurst(t, 0.05, "lowpass", 800, 0.3);
        break;
      case "explosion":
        this.noiseBurst(t, 0.7, "lowpass", 700, 1, 90);
        this.tone(t, "sine", 90, 28, 0.5, 1);
        break;
      case "hit":
        this.tone(t, "square", 520, 380, 0.03, 0.12);
        break;
      case "kill":
        this.tone(t, "square", 300, 70, 0.12, 0.18);
        break;
      case "hurt":
        this.tone(t, "sawtooth", 220, 90, 0.22, 0.35);
        this.noiseBurst(t, 0.08, "lowpass", 1200, 0.25);
        break;
      case "fireball":
        this.noiseBurst(t, 0.25, "bandpass", 500, 0.25, 200);
        this.tone(t, "sawtooth", 160, 260, 0.2, 0.08);
        break;
      case "pickup":
        this.tone(t, "triangle", 660, 660, 0.07, 0.3);
        this.tone(t + 0.07, "triangle", 990, 990, 0.09, 0.3);
        break;
      case "unlock":
        [523, 659, 784, 1047].forEach((f, i) => this.tone(t + i * 0.08, "triangle", f, f, 0.12, 0.35));
        break;
      case "waveStart":
        this.tone(t, "square", 220, 220, 0.16, 0.18);
        this.tone(t + 0.18, "square", 330, 330, 0.28, 0.18);
        break;
      case "waveClear":
        [392, 523, 659].forEach((f, i) => this.tone(t + i * 0.1, "triangle", f, f, 0.16, 0.3));
        break;
      case "empty":
        this.tone(t, "square", 120, 120, 0.04, 0.1);
        break;
    }
  }

  /** 주파수가 from → to로 미끄러지는 단음 (지수 감쇠) */
  private tone(t: number, type: OscillatorType, from: number, to: number, dur: number, vol: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(this.out!);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  /** 걸러낸 소음 한 번 (필터 주파수를 filterTo까지 내릴 수 있음) */
  private noiseBurst(t: number, dur: number, type: BiquadFilterType, freq: number, vol: number, filterTo?: number) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, t);
    if (filterTo) filter.frequency.exponentialRampToValueAtTime(filterTo, t + dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter).connect(gain).connect(this.out!);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }
}

/** 게임 전체에서 하나만 쓰는 효과음 재생기 */
export const sfx = new SfxPlayer();
