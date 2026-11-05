import type Phaser from "phaser";
import { textStyle } from "../ui/text";

interface Entry {
  text: Phaser.GameObjects.Text;
  target: object | null;
  amount: number;
  bornAt: number;
  x: number;
  y: number;
  active: boolean;
}

const LIFE_MS = 650;
/** 같은 대상이 이 시간 안에 또 맞으면 숫자를 합친다 (샷건 7발이 숫자 7개로 겹치지 않게) */
const MERGE_MS = 120;

/** 피해 숫자. 글자 객체를 풀에서 재사용한다 (기관단총처럼 빠른 연사에도 가볍게) */
export class DamageNumbers {
  private readonly scene: Phaser.Scene;
  private readonly entries: Entry[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  show(target: object, x: number, y: number, amount: number, color = "#ffffff") {
    const now = this.scene.time.now;
    const value = Math.round(amount);
    if (value <= 0) return;
    let e = this.entries.find((it) => it.active && it.target === target && now - it.bornAt < MERGE_MS);
    if (e) {
      e.amount += value;
    } else {
      e = this.entries.find((it) => !it.active);
      if (!e) {
        e = {
          text: this.scene.add.text(0, 0, "", textStyle(14, "#ffffff", true)).setOrigin(0.5, 1).setDepth(1e6 + 4),
          target: null, amount: 0, bornAt: 0, x: 0, y: 0, active: false,
        };
        this.entries.push(e);
      }
      e.active = true;
      e.target = target;
      e.amount = value;
      e.x = x + (Math.random() - 0.5) * 12;
      e.y = y;
      e.text.setVisible(true);
    }
    e.bornAt = now;
    e.text.setText(String(e.amount)).setColor(color).setScale(e.amount >= 50 ? 1.35 : 1);
  }

  update() {
    const now = this.scene.time.now;
    for (const e of this.entries) {
      if (!e.active) continue;
      const age = (now - e.bornAt) / LIFE_MS;
      if (age >= 1) {
        e.active = false;
        e.target = null;
        e.text.setVisible(false);
        continue;
      }
      e.text.setPosition(e.x, e.y - age * 26).setAlpha(age < 0.6 ? 1 : 1 - (age - 0.6) / 0.4);
    }
  }
}
