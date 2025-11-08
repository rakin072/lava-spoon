import Phaser from "phaser";

export type PlayerState =
  | "IDLE"
  | "ANTICIPATE"
  | "CATCH"
  | "CELEBRATE"
  | "HURT"
  | "POWERUP_ACTIVE";

interface PlayerPhysicsConfig {
  drag: number;
  elasticity: number;
  wobbleAmp: number;
  wobbleFreq: number;
}

export class PlayerController {
  sprite: Phaser.GameObjects.Rectangle; // physics body (invisible visual scaling not required)
  renderSprite?: Phaser.GameObjects.Sprite; // visual skin sprite
  scene: Phaser.Scene;
  state: PlayerState = "IDLE";
  velocity = 0;
  targetX = 0;
  currentX = 0;
  smoothedPointerX: number | null = null;  // 👈 NEW
  frameCounter = 0;
  invincibleUntil = 0;
  physics: PlayerPhysicsConfig;
  predictiveHitbox: Phaser.GameObjects.Rectangle;
  trailGroup: Phaser.GameObjects.Group;

  // Match falling object nominal size from fallingSystem.createFallingObject
  // (width/height base = 40). Kept here to avoid cross-file coupling.
  // Increased from 40 to 56 for leniency (matches ~1.4x max falling object size)
  static readonly CATCHER_W = 56;
  static readonly CATCHER_H = 56;

  constructor(scene: Phaser.Scene, x: number, y: number, physics?: Partial<PlayerPhysicsConfig>) {
    this.scene = scene;
  this.sprite = scene.add.rectangle(x, y, PlayerController.CATCHER_W, PlayerController.CATCHER_H, 0xffd700).setVisible(false);
    scene.physics.add.existing(this.sprite);
    (this.sprite.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true).setImmovable(true);
    this.currentX = x;
    this.targetX = x;
    this.physics = {
      // ⚙️ Tweaked defaults for slower, more touch-friendly feel
      // Lower elasticity = gentler acceleration toward target
      elasticity: physics?.elasticity ?? 0.06,
      // Lower drag value (multiply velocity) increases damping for a slower settle
      drag: physics?.drag ?? 0.82,
      // Smaller wobble on narrow/portrait layouts to avoid visible "shake"
      wobbleAmp: physics?.wobbleAmp ?? (scene.scale.width <= 544 ? 0.6 : 2),
      wobbleFreq: physics?.wobbleFreq ?? 0.1,
    };
    // Predictive hitbox slightly ahead of movement direction
  this.predictiveHitbox = scene.add.rectangle(x, y, PlayerController.CATCHER_W, PlayerController.CATCHER_H).setVisible(false);
    scene.physics.add.existing(this.predictiveHitbox);
    (this.predictiveHitbox.body as Phaser.Physics.Arcade.Body).allowGravity = false;

    this.trailGroup = scene.add.group();

    // 🧠 NEW — enable continuous polling (for smooth touch move)
    try { scene.input.setPollAlways(); } catch {}

    // 🧩 Smooth pointer tracking (more responsive for touch)
    scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown) return;
      if (this.smoothedPointerX == null) this.smoothedPointerX = pointer.x;
      // higher lerp factor for touch responsiveness
      this.smoothedPointerX += (pointer.x - this.smoothedPointerX) * 0.6; // interpolation
    });

    // Clear smoothed pointer on release to avoid lingering targets
    scene.input.on('pointerup', () => { this.smoothedPointerX = null; });

    // 👆 Optional: drag directly on player
    try {
      this.sprite.setInteractive();
      scene.input.setDraggable(this.sprite);
      scene.input.on('drag', (_pointer, _gameObject, dragX: number) => {
        this.smoothedPointerX = dragX;
      });
    } catch {}
  }

  attachVisual(sprite: Phaser.GameObjects.Sprite) {
    this.renderSprite = sprite;
    // start idle if an animation exists
    try { this.renderSprite.play('player-idle'); } catch {}
  }

  setState(next: PlayerState) {
    if (this.state === next) return;
    this.state = next;
    // Simple timing transitions via delayed calls
    if (next === "ANTICIPATE") {
      this.scene.time.delayedCall(100, () => this.setState("CATCH"));
    } else if (next === "CATCH") {
      this.scene.time.delayedCall(150, () => this.setState("CELEBRATE"));
      // Visual: quick pop
      if (this.renderSprite) {
        this.scene.tweens.add({ targets: this.renderSprite, scale: 1.1, duration: 80, yoyo: true });
        try { this.renderSprite.play('player-catch'); } catch {}
      }
    } else if (next === "CELEBRATE") {
      this.scene.time.delayedCall(200, () => this.setState("IDLE"));
      if (this.renderSprite) { try { this.renderSprite.play('player-idle'); } catch {} }
    } else if (next === "HURT") {
      this.invincibleUntil = this.scene.time.now + 300;
      this.scene.time.delayedCall(300, () => this.setState("IDLE"));
      if (this.renderSprite) {
        // Flash and hurt frame
        try { this.renderSprite.play('player-hurt'); } catch {}
        this.scene.tweens.add({ targets: this.renderSprite, alpha: 0.2, yoyo: true, repeat: 5, duration: 60 });
        this.renderSprite.setTint(0xFF0000);
        this.scene.time.delayedCall(350, () => { this.renderSprite?.clearTint(); try { this.renderSprite?.play('player-idle'); } catch {} });
        // Additional dramatic hurt: camera shake and blob fragments
        try {
          const cam = (this.scene.cameras && (this.scene.cameras.main)) as Phaser.Cameras.Scene2D.Camera;
          cam?.shake(300, 0.02);
        } catch {}
        // If blob skin, spawn fragments that scatter then re-form
        try {
          const texKey = this.renderSprite.texture.key || '';
          if (texKey.includes('blob')) {
            const baseX = this.renderSprite.x; const baseY = this.renderSprite.y;
            const pieces: Phaser.GameObjects.Arc[] = [];
            const count = 6;
            for (let i = 0; i < count; i++) {
              const frag = this.scene.add.circle(baseX, baseY, 3 + Math.random() * 3, 0xFF6B3A, 1) as Phaser.GameObjects.Arc;
              pieces.push(frag);
              const ang = -Math.PI/2 + (i - (count-1)/2) * (Math.PI / (count*1.5)) + (Math.random()-0.5)*0.4;
              const distOut = 40 + Math.random() * 36;
              // scatter out
              this.scene.tweens.add({
                targets: frag,
                x: baseX + Math.cos(ang) * distOut,
                y: baseY + Math.sin(ang) * distOut - 6,
                angle: (Math.random() > 0.5 ? 1 : -1) * 360,
                duration: 260 + Math.random() * 220,
                ease: 'Cubic.easeOut',
              });
            }

            // After a short delay, pull pieces back to center to 'reform' the blob
            this.scene.time.delayedCall(320, () => {
              let completed = 0;
              pieces.forEach((frag, idx) => {
                const delay = idx * 30;
                this.scene.time.delayedCall(delay, () => {
                  this.scene.tweens.add({
                    targets: frag,
                    x: baseX,
                    y: baseY,
                    alpha: 1,
                    scale: 0.4,
                    duration: 360 + Math.random() * 160,
                    ease: 'Cubic.easeIn',
                    onComplete: () => {
                      frag.destroy();
                      completed++;
                      if (completed === pieces.length) {
                        // reformation pulse
                        try {
                          if (this.renderSprite) {
                            const origScaleX = this.renderSprite.scaleX || 1;
                            const origScaleY = this.renderSprite.scaleY || 1;
                            this.scene.tweens.add({ targets: this.renderSprite, scaleX: origScaleX * 1.18, scaleY: origScaleY * 1.18, duration: 140, yoyo: true, ease: 'Sine.easeInOut' });
                          }
                          const pulse = this.scene.add.circle(baseX, baseY, 4, 0xFF9A6B, 0.9);
                          this.scene.tweens.add({ targets: pulse, radius: 36, alpha: 0, duration: 320, ease: 'Cubic.easeOut', onComplete: () => pulse.destroy() });
                        } catch (e) {}
                      }
                    }
                  });
                });
              });
            });
          }
        } catch (e) {}
      }
    }
  }

  triggerCatchSequence() {
    if (this.state === "IDLE") this.setState("ANTICIPATE");
  }

  triggerPowerUp() {
    this.setState("POWERUP_ACTIVE");
  }

  endPowerUp() {
    if (this.state === "POWERUP_ACTIVE") this.setState("IDLE");
  }

  update(pointerX: number | null, time: number, magnetActive: boolean, speedBoost: boolean) {
  this.frameCounter++;
  // 👇 Use smoothed pointer if available
  const activePointer = this.smoothedPointerX ?? pointerX;
  // Respect current game width for clamping (portrait-safe)
  const clampMax = this.scene.scale.width - 30;
  if (activePointer !== null) this.targetX = Phaser.Math.Clamp(activePointer, 30, clampMax);
  const { drag, elasticity, wobbleAmp, wobbleFreq } = this.physics;
  const force = (this.targetX - this.currentX) * elasticity;
  this.velocity += force;
  // clamp small velocities to zero to reduce jitter
  if (Math.abs(this.velocity) < 0.01) this.velocity = 0;
  this.velocity *= drag;
  // limit max velocity so catcher never teleports
  this.velocity = Phaser.Math.Clamp(this.velocity, -22, 22);
    this.currentX += this.velocity;
    // Only apply wobble when actually moving and snap to integer pixels to prevent jitter
    const wobble = Math.abs(this.velocity) > 0.6 ? Math.sin(time * wobbleFreq) * wobbleAmp : 0;
  const newX = Math.round(this.currentX + wobble);
  this.sprite.setPosition(newX, this.sprite.y);
  if (this.renderSprite) this.renderSprite.setPosition(newX, this.sprite.y);

    // Squash & stretch based on velocity magnitude
    const vMag = Math.min(1, Math.abs(this.velocity) / 25);
    const stretch = 1 + vMag * 0.2; // width increase
    const squash = 1 - vMag * 0.2; // height decrease
  if (this.renderSprite) this.renderSprite.setScale(stretch, squash);

    // Predictive hitbox lead
  const lead = Math.sign(this.velocity) * 5;
  this.predictiveHitbox.setPosition(Math.round(this.sprite.x + lead), this.sprite.y);

    // Trail effect when speed boost or powerup active
    if (speedBoost && this.frameCounter % 3 === 0) {
      const ghost = this.scene.add.rectangle(this.sprite.x, this.sprite.y, PlayerController.CATCHER_W, PlayerController.CATCHER_H, 0xffd700, 0.5);
      ghost.setScale(stretch, squash);
      this.trailGroup.add(ghost);
      this.scene.tweens.add({
        targets: ghost,
        alpha: 0,
        duration: 300,
        onComplete: () => ghost.destroy(),
      });
    }

    // Simple aura for POWERUP state
    if (this.state === "POWERUP_ACTIVE") {
      if (this.frameCounter % 10 === 0) {
        const aura = this.scene.add.circle(this.sprite.x, this.sprite.y, 50, 0xffd700, 0.2);
        this.scene.tweens.add({
          targets: aura,
          alpha: 0,
          scale: 1.5,
          duration: 400,
          onComplete: () => aura.destroy(),
        });
      }
    }

    // Magnet curved attraction handled externally; we expose predictive hitbox for use
  }
}
