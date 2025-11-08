import Phaser from "phaser";
import { PlayerController } from "@/components/game/playerSystem";

export default class GameplayScene extends Phaser.Scene {
  private player!: PlayerController;
  private score: number = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private bestText!: Phaser.GameObjects.Text;

  constructor() {
    super("GameplayScene");
  }

  preload() {
    // lightweight assets — these should exist under public/assets if you add them
    this.load.image("wood_board", "/assets/bg/wood_board.png");
    this.load.image("ui_home", "/assets/ui/home.png");
    this.load.image("ui_music", "/assets/ui/music.png");
    this.load.image("ui_pause", "/assets/ui/pause.png");
  }

  create() {
    const { width, height } = this.scale;

    // Telegram WebApp setup (safe guards)
    try {
      const tg = (window as any).Telegram?.WebApp;
      if (tg) {
        try { tg.expand(); } catch {}
        try { tg.ready(); } catch {}
      }
    } catch {}

    // Wooden background
    const bg = this.add.image(width / 2, height / 2, "wood_board");
    bg.setOrigin(0.5, 0.5);
    try { bg.setDisplaySize(width, height); } catch {}
    bg.setDepth(-10);

    // Player init (use existing controller)
    // place player near bottom; y offset tuned for typical portrait layout
    const playerY = Math.round(height - Math.max(96, height * 0.12));
    this.player = new PlayerController(this as any, Math.round(width / 2), playerY as number);
    // PlayerController is not a GameObject subclass; if you have a visual sprite attach it via attachVisual

    // Score display
    this.scoreText = this.add.text(28, 28, "000", {
      fontFamily: "Press Start 2P, monospace",
      fontSize: "20px",
      color: "#FFA500",
      stroke: "#000000",
      strokeThickness: 4,
    }).setOrigin(0, 0.5).setDepth(1000);

    this.bestText = this.add.text(28, 60, "BEST: 000", {
      fontFamily: "Press Start 2P, monospace",
      fontSize: "14px",
      color: "#00FF00",
      stroke: "#000000",
      strokeThickness: 3,
    }).setDepth(1000);

    // Floating UI
    this.createUI(width, height);

    // Responsive scaling tweaks
    this.scale.mode = Phaser.Scale.FIT;
    this.scale.scaleMode = Phaser.Scale.FIT as any;
    this.scale.autoCenter = Phaser.Scale.CENTER_BOTH as any;
  }

  private createUI(width: number, height: number) {
    const btnY = 44;

    const homeBtn = this.add.image(width - 52, btnY, "ui_home")
      .setInteractive({ useHandCursor: true })
      .setScale(1.4)
      .setDepth(1200);

    const musicBtn = this.add.image(width - 104, btnY, "ui_music")
      .setInteractive({ useHandCursor: true })
      .setScale(1.4)
      .setDepth(1200);

    const pauseBtn = this.add.image(width - 156, btnY, "ui_pause")
      .setInteractive({ useHandCursor: true })
      .setScale(1.4)
      .setDepth(1200);

    homeBtn.on("pointerup", () => this.scene.start("MainMenu"));
    musicBtn.on("pointerup", () => this.toggleMusic());
    pauseBtn.on("pointerup", () => this.togglePause());
  }

  private toggleMusic() {
    try { const tg = (window as any).Telegram?.WebApp; tg?.HapticFeedback?.impactOccurred?.("soft"); } catch {}
    // swap/mute audio via your audio manager if available
  }

  private togglePause() {
    try { const tg = (window as any).Telegram?.WebApp; tg?.HapticFeedback?.impactOccurred?.("medium"); } catch {}

    if (this.scene.isPaused()) {
      this.scene.resume();
    } else {
      this.scene.pause();
    }
  }

  update(time: number, delta: number): void {
    // PlayerController update requires (pointerX, time, magnetActive, speedBoost) in your implementation.
    // We'll call with null pointerX to let internal input handling work, and pass placeholder flags.
    try { (this.player as any).update(null, time, false, false); } catch {}

    // Update score display if needed
    if (this.scoreText && this.score !== 0) {
      this.scoreText.setText(this.score.toString().padStart(3, "0"));
    }
  }

  addSplatter(x: number, y: number, color: number) {
    const splat = this.add.circle(x, y, Phaser.Math.Between(18, 36), color).setAlpha(0.6).setDepth(900);
    this.tweens.add({
      targets: splat,
      scale: { from: 0.3, to: 1.2 },
      alpha: { from: 0.9, to: 0.12 },
      duration: 900,
      onComplete: () => splat.destroy(),
    });
  }

  incrementScore(amount: number) {
    this.score += amount;
    if (this.scoreText) this.scoreText.setText(String(this.score).padStart(3, "0"));
  }
}
