import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import { Button } from "@/components/ui/button";
import { Heart, Shield, Zap } from "lucide-react";
import { toast } from "sonner";
import { computeDynamicPalette, heatFactor, lightenColor } from "./themeSystem";
import { SpawnManager, createFallingObject, applyBehavior, SpawnType } from "./fallingSystem";
import sampleScoreOutcome from "@/lib/scoring";
import { applyPowerup } from "@/lib/powerups";
import { setSlowFactor } from "@/lib/gameFlags";
import { ComboSystem, DifficultyEngine, FeverMode } from "./scoringSystem";
import { useGameSettings } from "@/hooks/useGameSettings";
import { PlayerController } from "./playerSystem";
import { useGameAudio } from "@/hooks/useGameAudio";
import { useAdaptiveViewport } from "@/hooks/useAdaptiveViewport";
import { OrientationPrompt } from "./OrientationPrompt";

interface GameCanvasProps {
  stageId: number;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

export const GameCanvas = ({ stageId, onGameOver, onBack }: GameCanvasProps) => {
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<Phaser.Game | null>(null);
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [combo, setCombo] = useState(0);
  const [activePowerUp, setActivePowerUp] = useState<string | null>(null);
  const [powerUpTimeLeft, setPowerUpTimeLeft] = useState(0);
  const { playSound } = useGameAudio();
  const { settings, toggle, setPopupDensity } = useGameSettings();

  // Keep a live score reference so the game loop can read it without recreating the Phaser game
  const scoreRef = useRef(0);
  // Sync ref whenever React state changes (does not recreate the Phaser game)
  useEffect(() => { scoreRef.current = score; }, [score]);

  const viewport = useAdaptiveViewport();
  // Global boost from lottery (consumed on first use)
  const [globalScoreBoost, setGlobalScoreBoost] = useState<number>(1);

  useEffect(() => {
    if (!gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.WEBGL,
      parent: gameRef.current,
      width: viewport.baseWidth,
      height: viewport.baseHeight,
      physics: {
        default: "arcade",
        arcade: {
          gravity: { x: 0, y: 300 },
          debug: false,
        },
      },
      pixelArt: true,
      roundPixels: true,
      backgroundColor: "#000000",
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        zoom: viewport.zoom,
        width: viewport.baseWidth,
        height: viewport.baseHeight,
      },
      scene: {
        preload,
        create,
        update,
      },
    };

  let resizeObserver: ResizeObserver | null = null;
  const game = new Phaser.Game(config);
    phaserGameRef.current = game;

    // Resize observer: ensure Phaser canvas resizes to match container when iframe/container size changes
    try {
      if (gameRef.current && (window as any).ResizeObserver) {
        resizeObserver = new (window as any).ResizeObserver((entries: any) => {
          for (const entry of entries) {
            const cr = entry.contentRect;
            try {
              const g = phaserGameRef.current as Phaser.Game | null;
              if (g && g.scale) {
                g.scale.resize(Math.round(cr.width), Math.round(cr.height));
                const s = g.scene && (g.scene.scenes && g.scene.scenes[0]);
                try { s?.cameras?.main?.setViewport(0, 0, Math.round(cr.width), Math.round(cr.height)); } catch {}
              }
            } catch {}
          }
        });
        resizeObserver.observe(gameRef.current);
      }
    } catch (e) {}

  let playerController: PlayerController;
  let pointerX: number | null = null;
  let lastTouchClientX: number | null = null;
  let debugText: Phaser.GameObjects.Text | null = null;
  let shieldCircle: Phaser.GameObjects.Arc | null = null;
    let cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  let fallingObjects: Phaser.Physics.Arcade.Group;
  const spawner = new SpawnManager(5);
  let behaviorMap = new Map<Phaser.GameObjects.Container, { behavior: string; type: SpawnType; points: number; isHazard: boolean; isPowerUp: boolean }>();
    let lastSpawnTime = 0;
    let spawnRate = 1000;
    let gameTime = 0;
    let shieldActive = false;
    let magnetActive = false;
    let multiplierActive = false;
  let comboCount = 0; // legacy counter (will mirror comboSys.current)
  // Chain collectible tracking
  let chainIndexExpected = 0;
  const chainLength = 5;
  let comboResetTimer: NodeJS.Timeout;
  let sceneRef: Phaser.Scene;
  // Guard to ensure game-over logic (toasts / callbacks) run only once
  let gameOverHandled = false;

  // Scoring / progression systems
  const comboSys = new ComboSystem();
  const dda = new DifficultyEngine();
  const fever = new FeverMode();
  let catches = 0;
  let misses = 0;
  let sumReaction = 0;
  let lastSpawnedAt = 0;
  // Touch listener reference for cleanup
  let touchPreventHandler: ((e: TouchEvent) => void) | null = null;

  // --- Post-processing pipelines (Bloom + Chromatic Aberration) ---
    class BloomPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
      constructor(game: Phaser.Game) {
        super({ game, name: 'BloomPipeline', fragShader: `
        precision mediump float;
        uniform sampler2D uMainSampler;
        varying vec2 outTexCoord;
        void main() {
          vec4 col = texture2D(uMainSampler, outTexCoord);
          float brightness = max(max(col.r,col.g),col.b);
          vec3 bloom = col.rgb + vec3(brightness*0.4, brightness*0.25, brightness*0.1);
          gl_FragColor = vec4(min(bloom,1.0), col.a);
        }` });
      }
    }
    class ChromaticPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
      constructor(game: Phaser.Game) {
        super({ game, name: 'ChromaticPipeline', fragShader: `
        precision mediump float;
        uniform sampler2D uMainSampler;
        uniform float time;
        varying vec2 outTexCoord;
        void main() {
          // Smaller channel offset to reduce perceived jitter on small screens
          float shift = sin(time*0.002)*0.0006;
          vec2 rCoord = outTexCoord + vec2(shift,0.0);
          vec2 gCoord = outTexCoord;
          vec2 bCoord = outTexCoord - vec2(shift,0.0);
          float speedFactor = abs(sin(time*0.004));
          vec4 r = texture2D(uMainSampler, rCoord);
          vec4 g = texture2D(uMainSampler, gCoord);
          vec4 b = texture2D(uMainSampler, bCoord);
          vec3 rgb = vec3(r.r, g.g, b.b);
          rgb = mix(rgb, rgb*1.1, speedFactor*0.3);
          gl_FragColor = vec4(rgb, 1.0);
        }` });
      }
      onPreRender() {
        this.set1f('time', gameTime);
      }
    }

    // Map a pointer's clientX to game coordinates accounting for canvas CSS scaling
    function mapPointerX(scene: Phaser.Scene, pointer: Phaser.Input.Pointer): number {
      try {
        const canvas = scene.game.canvas;
        const rect = canvas.getBoundingClientRect();
        const clientX = (pointer.event && (pointer.event as any).clientX) ? (pointer.event as any).clientX : pointer.x;
        const ratio = (clientX - rect.left) / rect.width; // 0..1 across visible canvas
        return Phaser.Math.Clamp(ratio * viewport.baseWidth, 0, viewport.baseWidth);
      } catch {
        return pointer.x;
      }
    }

    function preload(this: Phaser.Scene) {
      if (this.game.renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer) {
        const pm = this.game.renderer.pipelines as Phaser.Renderer.WebGL.PipelineManager;
        // Register post FX pipelines once per boot
        try { (pm as any).addPostPipeline(BloomPipeline); } catch {}
        try { (pm as any).addPostPipeline(ChromaticPipeline); } catch {}
      }

      // Prefer loading static sprite sheets from public/assets/sprites/ if the artist provided them.
      // Fall back to runtime procedural textures in create() if the files are not present.
      // The sheets should be 128x32 with 4 frames (idle1,idle2,catch,hurt) across.
      try {
        // Try PNG sheets first (artist-provided). Also accept SVG sheets as a fallback.
        this.load.spritesheet('spoon_sheet', '/assets/sprites/spoon.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('blob_sheet', '/assets/sprites/blob.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('spoon_sheet_svg', '/assets/sprites/spoon.svg', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('blob_sheet_svg', '/assets/sprites/blob.svg', { frameWidth: 32, frameHeight: 32 });
      } catch (e) {
        // non-fatal; loader will handle missing files at runtime and we'll fallback in create().
      }
    }

    function create(this: Phaser.Scene) {
      sceneRef = this;
      const GAME_W = viewport.baseWidth;
      const GAME_H = viewport.baseHeight;
      // Read next-game boost (if any) and consume
      try {
        const raw = localStorage.getItem('lavaLegendsNextGameBoost');
        if (raw) {
          const data = JSON.parse(raw);
          if (data?.kind === 'megaScore' && data?.multiplier) {
            setGlobalScoreBoost(data.multiplier);
            toast.success(`Lottery Bonus: ${data.multiplier}x SCORE active!`, { duration: 1800 });
          }
          localStorage.removeItem('lavaLegendsNextGameBoost');
        }
      } catch {}
      
      // Determine equipped skin
      let equipped: 'spoon' | 'blob' = 'spoon';
      try {
        const sel = localStorage.getItem('lavaLegendsSelectedSkin');
        if (sel === 'blob' || sel === 'spoon') equipped = sel;
      } catch {}
      // If the developer/artist placed sprite sheets under public/assets/sprites,
      // Phaser will have queued them via preload. If they failed to load or are
      // not present, generate the 32x32 frame textures procedurally now as a fallback.
      const needProceduralSpoon = !(this.textures.exists('spoon_sheet'));
      const needProceduralBlob = !(this.textures.exists('blob_sheet'));
      if (needProceduralSpoon || needProceduralBlob) {
        const makeGfx = () => this.add.graphics({ x: 0, y: 0 });
        const genKey = (key: string) => {
          const g = makeGfx();
          g.fillStyle(0x000000, 0);
          g.fillRect(0, 0, 32, 32);
          return g;
        };
        const drawSpoon = (g: Phaser.GameObjects.Graphics, variant: 'idle1'|'idle2'|'catch'|'hurt') => {
          const GOLD = 0xFFD700; const DARK = 0xDAA520; const SHADOW = 0x8B6914;
          const bobY = variant === 'idle2' ? 2 : 0;
          g.fillStyle(GOLD, 1).fillEllipse(16, 12 + bobY, 12, 8);
          g.lineStyle(2, DARK, 1).strokeEllipse(16, 12 + bobY, 12, 8);
          g.fillStyle(DARK, 1).fillRoundedRect(14, 16 + bobY, 4, 12, 2);
          g.lineStyle(1, SHADOW, 1).strokeRoundedRect(14, 16 + bobY, 4, 12, 2);
          if (variant === 'hurt') {
            g.lineStyle(2, 0x000000, 1);
            g.beginPath(); g.moveTo(12, 9 + bobY); g.lineTo(14, 11 + bobY); g.moveTo(12, 11 + bobY); g.lineTo(14, 9 + bobY); g.strokePath();
            g.beginPath(); g.moveTo(18, 9 + bobY); g.lineTo(20, 11 + bobY); g.moveTo(18, 11 + bobY); g.lineTo(20, 9 + bobY); g.strokePath();
          } else {
            g.fillStyle(0x000000, 1);
            if (variant === 'idle2') { g.fillRect(12, 10 + bobY, 3, 1); g.fillRect(17, 10 + bobY, 3, 1); }
            else { g.fillRect(12, 9 + bobY, 2, 2); g.fillRect(18, 9 + bobY, 2, 2); }
            if (variant === 'catch') { g.fillCircle(16, 13 + bobY, 2); }
            else { g.lineStyle(2, 0x000000, 1).beginPath(); g.arc(16, 13 + bobY, 3, Math.PI*0.1, Math.PI- Math.PI*0.1); g.strokePath(); }
          }
          if (variant === 'catch') { g.fillStyle(0xFFFACD, 1); g.fillRect(6, 6 + bobY, 2, 2); g.fillRect(24, 8 + bobY, 2, 2); }
        };
        const drawBlob = (g: Phaser.GameObjects.Graphics, variant: 'idle1'|'idle2'|'catch'|'hurt') => {
          const RED = 0xFF4500; const ORANGE = 0xFF6347; const YELLOW = 0xFFD700;
          let w = 20, h = 16, y = 14;
          if (variant === 'idle2') { w = 22; h = 14; }
          if (variant === 'catch') { h = 20; y = 12; }
          g.fillStyle(ORANGE, 1).fillEllipse(16, y, w, h);
          g.fillStyle(RED, 1).fillEllipse(16, y+2, w-2, h-2);
          g.fillStyle(YELLOW, 1).fillTriangle(16, 2, 14, 6, 18, 6);
          g.fillStyle(0xFFFFFF, 1).fillEllipse(13, y-2, 3, 4).fillEllipse(19, y-2, 3, 4);
          g.fillStyle(0x2C0000, 1).fillCircle(13, y-2, 1).fillCircle(19, y-2, 1);
          if (variant === 'catch') { g.fillStyle(0x000000, 1).fillCircle(16, y+2, 3); }
          else { g.lineStyle(2, 0x2C0000, 1).beginPath(); g.arc(16, y+3, 4, 0, Math.PI); g.strokePath(); }
          if (variant === 'hurt') { g.lineStyle(1, 0x000000, 1).beginPath(); g.moveTo(10, y); g.lineTo(14, y+6); g.moveTo(22, y); g.lineTo(18, y+6); g.strokePath(); }
        };

        if (needProceduralSpoon) {
          (['idle1','idle2','catch','hurt'] as const).forEach(v => {
            const key = `skin_spoon_${v}`;
            const g = genKey(key);
            drawSpoon(g, v);
            g.generateTexture(key, 32, 32); g.destroy();
          });
        }
        if (needProceduralBlob) {
          (['idle1','idle2','catch','hurt'] as const).forEach(v => {
            const key = `skin_blob_${v}`;
            const g = genKey(key);
            drawBlob(g, v);
            g.generateTexture(key, 32, 32); g.destroy();
          });
        }
      }
      // Player controller system + visual sprite
      playerController = new PlayerController(this, GAME_W / 2, GAME_H - 48);
      const hasSpoonPng = this.textures.exists('spoon_sheet');
      const hasBlobPng = this.textures.exists('blob_sheet');
      const hasSpoonSvg = this.textures.exists('spoon_sheet_svg');
      const hasBlobSvg = this.textures.exists('blob_sheet_svg');

      let vis: Phaser.GameObjects.Sprite;
      // Prefer PNG, then SVG, then procedural textures
      if (equipped === 'spoon' && (hasSpoonPng || hasSpoonSvg)) {
        const sheetKey = hasSpoonPng ? 'spoon_sheet' : 'spoon_sheet_svg';
        vis = this.add.sprite(GAME_W / 2, GAME_H - 48, sheetKey, 0).setOrigin(0.5, 0.85);
        this.anims.create({ key: 'player-idle', frames: this.anims.generateFrameNumbers(sheetKey, { frames: [0, 1] }), frameRate: 4, repeat: -1 });
        this.anims.create({ key: 'player-catch', frames: this.anims.generateFrameNumbers(sheetKey, { frames: [2] }), frameRate: 6, repeat: 0 });
        this.anims.create({ key: 'player-hurt', frames: this.anims.generateFrameNumbers(sheetKey, { frames: [3] }), frameRate: 12, repeat: 0 });
      } else if (equipped === 'blob' && (hasBlobPng || hasBlobSvg)) {
        const sheetKey = hasBlobPng ? 'blob_sheet' : 'blob_sheet_svg';
        vis = this.add.sprite(GAME_W / 2, GAME_H - 48, sheetKey, 0).setOrigin(0.5, 0.85);
        this.anims.create({ key: 'player-idle', frames: this.anims.generateFrameNumbers(sheetKey, { frames: [0, 1] }), frameRate: 4, repeat: -1 });
        this.anims.create({ key: 'player-catch', frames: this.anims.generateFrameNumbers(sheetKey, { frames: [2] }), frameRate: 6, repeat: 0 });
        this.anims.create({ key: 'player-hurt', frames: this.anims.generateFrameNumbers(sheetKey, { frames: [3] }), frameRate: 12, repeat: 0 });
      } else {
        const startFrame = equipped === 'spoon' ? 'skin_spoon_idle1' : 'skin_blob_idle1';
        vis = this.add.sprite(GAME_W / 2, GAME_H - 48, startFrame).setOrigin(0.5, 0.85);
        const frames = (name: 'idle1'|'idle2'|'catch'|'hurt') => ({ key: equipped === 'spoon' ? `skin_spoon_${name}` : `skin_blob_${name}` });
        this.anims.create({ key: 'player-idle', frames: [frames('idle1'), frames('idle2')], frameRate: 4, repeat: -1 });
        this.anims.create({ key: 'player-catch', frames: [frames('catch')], frameRate: 6, repeat: 0 });
        this.anims.create({ key: 'player-hurt', frames: [frames('hurt')], frameRate: 12, repeat: 0 });
      }
  vis.setScale(4.0); // increased further per user request to make catcher more visible
      playerController.attachVisual(vis);

      // Enable mouse/touch input
      // Unified pointer handling for touch responsiveness
      const clampX = (x: number) => Phaser.Math.Clamp(x, 30, GAME_W - 30);
      this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        pointerX = clampX(mapPointerX(this, pointer));
      });
      // On some mobile browsers, pointermove may not report isDown consistently.
      // Update the target position on every move to keep it responsive.
      this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
        pointerX = clampX(mapPointerX(this, pointer));
      });
      this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
        // Keep last position (no snap back) but ensure we capture the final location.
        pointerX = clampX(mapPointerX(this, pointer));
      });
      // Handle pointer leaving the canvas while pressed (iOS edge cases)
      this.input.on("pointerupoutside", (pointer: Phaser.Input.Pointer) => {
        pointerX = clampX(mapPointerX(this, pointer));
      });
      // Add extra pointers for multi-touch (two finger interactions future-proof)
      this.input.addPointer(2);
      // Prevent browser from interpreting vertical swipes as scroll while interacting with game
      if (gameRef.current) {
        touchPreventHandler = (e: TouchEvent) => { e.preventDefault(); };
        // Prevent default on touchstart/touchmove to stop the browser stealing gestures on first interaction
        gameRef.current.addEventListener('touchstart', touchPreventHandler, { passive: false });
        gameRef.current.addEventListener('touchmove', touchPreventHandler, { passive: false });
        gameRef.current.addEventListener('gesturestart', touchPreventHandler as any, { passive: false });
      }

      // Also attach touch handlers directly to the Phaser canvas to ensure we capture clientX
      try {
        const canvasEl = this.game.canvas as HTMLCanvasElement;
        if (canvasEl) {
          // Ensure CSS property in case some browsers ignore stylesheet rules
          canvasEl.style.touchAction = 'none';
          const onCanvasTouch = (ev: TouchEvent) => {
            if (!ev) return;
            const t = ev.touches && ev.touches[0] ? ev.touches[0] : ev.changedTouches && ev.changedTouches[0] ? ev.changedTouches[0] : null;
            if (!t) return;
            // store raw clientX as a fallback for the update loop (fixes first-touch race conditions)
            lastTouchClientX = t.clientX;
            const rect = canvasEl.getBoundingClientRect();
            const ratio = (t.clientX - rect.left) / rect.width;
            pointerX = Phaser.Math.Clamp(ratio * viewport.baseWidth, 0, viewport.baseWidth);
            // debug visual marker removed in production
            // prevent the page from scrolling while interacting
            ev.preventDefault();
          };
          const onCanvasEnd = (ev: TouchEvent) => {
            // also capture final position
            const t = ev.changedTouches && ev.changedTouches[0] ? ev.changedTouches[0] : null;
            if (!t) return;
            lastTouchClientX = t.clientX;
            const rect = canvasEl.getBoundingClientRect();
            const ratio = (t.clientX - rect.left) / rect.width;
            pointerX = Phaser.Math.Clamp(ratio * viewport.baseWidth, 0, viewport.baseWidth);
            ev.preventDefault();
          };
          canvasEl.addEventListener('touchstart', onCanvasTouch, { passive: false });
          canvasEl.addEventListener('touchmove', onCanvasTouch, { passive: false });
          canvasEl.addEventListener('touchend', onCanvasEnd, { passive: false });
          canvasEl.addEventListener('touchcancel', onCanvasEnd, { passive: false });

          // Clean up when the scene shuts down
          this.events.on('shutdown', () => {
            try {
              canvasEl.removeEventListener('touchstart', onCanvasTouch as any);
              canvasEl.removeEventListener('touchmove', onCanvasTouch as any);
              canvasEl.removeEventListener('touchend', onCanvasEnd as any);
              canvasEl.removeEventListener('touchcancel', onCanvasEnd as any);
            } catch (e) {}
          });
        }
      } catch (e) {}

      // Debug overlay: show pointerX and player X on-screen. Toggle with 'D' key or set localStorage 'lavaDebug' = '1'
      const debugEnabled = (() => {
        try { return localStorage.getItem('lavaDebug') === '1'; } catch { return false; }
      })();
      try {
        debugText = this.add.text(8, 8, '', { fontFamily: 'monospace', fontSize: '12px', color: '#ffffff', backgroundColor: 'rgba(0,0,0,0.35)', padding: { x: 6, y: 4 } }).setDepth(9999).setScrollFactor(0).setVisible(debugEnabled);
        this.input.keyboard?.on('keydown', (ev: KeyboardEvent) => {
          if (ev.key && (ev.key === 'd' || ev.key === 'D')) {
            debugText!.setVisible(!debugText!.visible);
          }
        });
      } catch (e) {}

      // Cursor keys for keyboard control
      cursors = this.input.keyboard!.createCursorKeys();

  // Group for falling objects
  fallingObjects = this.physics.add.group();

  // Collision detection (use predictive hitbox for slight lead)
  this.physics.add.overlap(playerController.predictiveHitbox, fallingObjects, collectObject, undefined, this);

      playSound("victory");
      toast.success("Game Started! Catch the glowing items!");

      // Camera post FX
      const cam = this.cameras.main;
      if (this.game.renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer) {
        if (settings.postProcessing) {
          // On mobile, keep visuals stable by disabling chromatic aberration
          cam.setPostPipeline(viewport.device === 'mobile' ? [BloomPipeline] : [BloomPipeline, ChromaticPipeline]);
        }
      }

      // Dithering overlay using a tiny generated texture
      const g = this.add.graphics();
      g.fillStyle(0x000000, 0.08);
      g.fillRect(0, 0, 1, 1);
      g.generateTexture('dither-1px', 2, 2);
      g.destroy();
      const overlay = this.add.tileSprite(viewport.baseWidth/2, viewport.baseHeight/2, viewport.baseWidth, viewport.baseHeight, 'dither-1px')
        .setScrollFactor(0)
        .setBlendMode(Phaser.BlendModes.MULTIPLY)
        .setAlpha(0.15);

      // Create a single shield visual circle and keep it hidden until shieldActive
      try {
        shieldCircle = this.add.circle(GAME_W / 2, GAME_H / 2, 50, 0x00ffff, 0.08).setDepth(-1).setVisible(false);
      } catch (e) { shieldCircle = null; }

      // Optional tap zones (invisible) for discrete left/right nudge on quick taps
      if (settings.tapZones) {
        const tapZoneLeft = this.add.zone(0, 0, GAME_W/2, GAME_H).setOrigin(0,0);
        const tapZoneRight = this.add.zone(GAME_W/2, 0, GAME_W/2, GAME_H).setOrigin(0,0);
        tapZoneLeft.setInteractive();
        tapZoneRight.setInteractive();
        tapZoneLeft.on('pointerup', () => {
          pointerX = Phaser.Math.Clamp((playerController.sprite.x - 60), 30, GAME_W - 30);
        });
        tapZoneRight.on('pointerup', () => {
          pointerX = Phaser.Math.Clamp((playerController.sprite.x + 60), 30, GAME_W - 30);
        });
      }
    }

    function update(this: Phaser.Scene, time: number) {
      gameTime = time;
      const GAME_W = viewport.baseWidth;
      const GAME_H = viewport.baseHeight;

      // Keyboard controls
      if (cursors.left.isDown) {
        pointerX = Phaser.Math.Clamp((pointerX ?? playerController.sprite.x) - 8, 30, GAME_W - 30);
      } else if (cursors.right.isDown) {
        pointerX = Phaser.Math.Clamp((pointerX ?? playerController.sprite.x) + 8, 30, GAME_W - 30);
      }

      // On mobile, keep following the finger even if move events are throttled
      if (viewport.device === 'mobile') {
        const ap = this.input.activePointer as Phaser.Input.Pointer | undefined;
        if (ap && (ap.isDown || ap.pointerId)) {
          pointerX = Phaser.Math.Clamp(mapPointerX(this, ap), 30, GAME_W - 30);
        } else if (lastTouchClientX != null) {
          // Fallback when Phaser's activePointer hasn't obtained a position yet (first-touch race)
          try {
            const rect = (this.game.canvas as HTMLCanvasElement).getBoundingClientRect();
            const ratio = (lastTouchClientX - rect.left) / rect.width;
            pointerX = Phaser.Math.Clamp(ratio * GAME_W, 30, GAME_W - 30);
          } catch (e) {
            // last-ditch fallback
            pointerX = Phaser.Math.Clamp((pointerX ?? playerController.sprite.x), 30, GAME_W - 30);
          }
        }
      }

      // Update player physics & visuals
  playerController.update(pointerX, gameTime, magnetActive, multiplierActive);

      // Update debug overlay every frame
      if (debugText && debugText.visible) {
        try {
          const px = pointerX === null ? 'null' : Math.round(pointerX);
          const playerX = playerController ? Math.round(playerController.sprite.x) : 'n/a';
          debugText.setText([`pointerX: ${px}`, `playerX: ${playerX}`]);
        } catch (e) {}
      }

      // Magnet power-up effect
      if (magnetActive) {
        fallingObjects.children.entries.forEach((obj) => {
          const container = obj as Phaser.GameObjects.Container;
          const meta = behaviorMap.get(container);
          if (!(meta?.isHazard) && container.y < 500) {
            const dx = playerController.sprite.x - container.x;
            const dy = playerController.sprite.y - container.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 220) {
              // Curved pull via intermediate midpoint (Bezier-like)
              const midX = container.x + dx * 0.5;
              const midY = container.y - Math.min(60, Math.abs(dy) * 0.3);
              container.x += (midX - container.x) * 0.04 + dx * 0.02;
              container.y += (midY - container.y) * 0.04 + dy * 0.02;
            }
          }
        });
      }

      // Shield visual effect (single reusable circle to avoid accumulation)
      if (shieldCircle) {
        shieldCircle.setPosition(playerController.sprite.x, playerController.sprite.y);
        shieldCircle.setVisible(!!shieldActive);
      }

      // Dynamic palette background update
      const palette = computeDynamicPalette(stageId, gameTime);
      this.cameras.main.setBackgroundColor(palette.ambientHex);

      // Spawn falling objects
      if (time > lastSpawnTime + spawnRate) {
        const decision = spawner.next({
          stageId,
          elapsedMs: time,
          score: scoreRef.current,
          lanes: 5,
          width: GAME_W,
        });
        const laneWidth = GAME_W / 5;
        const laneCenter = laneWidth * decision.lane + laneWidth / 2;
        const created = createFallingObject(this, laneCenter, -20, decision.type, stageId, gameTime);
        lastSpawnedAt = time;
        // Assign chain index if chain type
        if (decision.type === 'chain') {
          (created.container as any).chainIndex = chainIndexExpected;
          chainIndexExpected = (chainIndexExpected + 1) % chainLength;
        }
        fallingObjects.add(created.container);
        behaviorMap.set(created.container, {
          behavior: decision.behavior,
          type: created.type,
          points: created.points,
          isHazard: created.isHazard,
          isPowerUp: created.isPowerUp,
        });
        lastSpawnTime = time;
        const feverFactor = fever.update(time) ? 1.3 : 1.0;
        spawnRate = Math.max(120, 1000 / (decision.ratePerSec * feverFactor));
      }

      // Remove/update objects
      const delta = this.game.loop.delta;
      fallingObjects.children.entries.forEach((obj) => {
        const container = obj as Phaser.GameObjects.Container;
        const meta = behaviorMap.get(container);
        if (meta) {
          applyBehavior({
            container,
            body: container.body as Phaser.Physics.Arcade.Body,
            type: meta.type,
            points: meta.points,
            isHazard: meta.isHazard,
            isPowerUp: meta.isPowerUp,
          } as any, meta.behavior as any, time, delta);
        }
        if (container.y > GAME_H + 60) {
          behaviorMap.delete(container);
          container.destroy();
          if (!meta?.isHazard) {
            resetCombo();
            // Miss tracking for DDA (only collectibles / chain / powerups count as potential catches)
            misses++;
            const avgReaction = catches === 0 ? 0 : sumReaction / catches;
            dda.analyze(catches, misses, avgReaction, lives, 3, (factor) => {
              // factor >1 means increase spawn speed -> divide spawnRate
              spawnRate = Math.max(120, spawnRate / factor);
            });
          }
        }
      });
    }

    // spawnFallingObject removed; now handled by fallingSystem

    function resetCombo() {
      clearTimeout(comboResetTimer);
      comboCount = 0;
      setCombo(0);
    }
    
    function createParticleBurst(x: number, y: number, color: number) {
      if (!sceneRef) return;
      
      for (let i = 0; i < 10; i++) {
        const particle = sceneRef.add.circle(x, y, 3, color, 1);
        const angle = (Math.PI * 2 * i) / 10;
        const speed = 50 + Math.random() * 100;
        
        sceneRef.tweens.add({
          targets: particle,
          x: x + Math.cos(angle) * speed,
          y: y + Math.sin(angle) * speed,
          alpha: 0,
          duration: 600,
          onComplete: () => particle.destroy(),
        });
      }
    }

    function collectObject(
      playerObj: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
      fallingObj: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile
    ) {
      const obj = fallingObj as any;
      
      // Destroy glow if exists
      if (obj.glow) {
        obj.glow.destroy();
      }
      
      // Particle burst effect with heat-based brightening (respect settings)
      if (settings.particles) {
        const palForBurst = computeDynamicPalette(stageId, gameTime);
        const heat = heatFactor(obj.x, obj.y, viewport.baseWidth, viewport.baseHeight);
        const burstColorInit = palForBurst.particleSpawn;
        const burstCol = lightenColor(burstColorInit, heat * 0.35);
        createParticleBurst(obj.x, obj.y, burstCol);
      }
      
  const container = obj as Phaser.GameObjects.Container;
  const meta = (behaviorMap.get(container) as any) || {};
  obj.destroy();
  behaviorMap.delete(container);

      if (meta.type === 'fakeout') {
        // Fake-out penalizes score slightly and counts as miss
        playSound('hazard');
        setScore((prev) => Math.max(0, prev - 10));
        toast.error('Fake-out! -10');
        resetCombo();
        return;
      }

      if (meta.isHazard) {
        // Splitting hazard: spawn 3 small shards
        if (meta.type === 'splitting' && sceneRef) {
          for (let i = 0; i < 3; i++) {
            const dx = [-40, 0, 40][i];
            const created = createFallingObject(sceneRef, container.x + dx, container.y, 'hazard', stageId, gameTime);
            fallingObjects.add(created.container);
            behaviorMap.set(created.container, { behavior: 'zigzag', type: created.type, points: created.points, isHazard: true, isPowerUp: false });
          }
        }
    if (shieldActive) {
          // Shield blocks the hazard
          playSound("powerup");
          toast.success("Shield blocked hazard!");
          createParticleBurst(obj.x, obj.y, 0x00ffff);
          return;
        }
        
  playSound("hazard");
  if (settings.haptics && navigator.vibrate) navigator.vibrate(120);
  if (playerController) playerController.setState("HURT");
        resetCombo();
        
        // Screen shake effect
        if (phaserGameRef.current?.scene.scenes[0]) {
          const camera = phaserGameRef.current.scene.scenes[0].cameras.main;
          camera.shake(200, 0.01);
        }
        
        setLives((prev) => {
          const newLives = prev - 1;
          if (newLives <= 0) {
            // Ensure Game Over is handled only once even if multiple hazards hit simultaneously
            if (!gameOverHandled) {
              gameOverHandled = true;
              playSound("gameover");
              toast.error("Game Over!");
              setTimeout(() => onGameOver(scoreRef.current), 500);
            }
          } else {
            toast.error("Hit by hazard! -1 life");
          }
          return newLives;
        });
      } else {
        // Combo & reaction tracking
  const comboState = comboSys.handleCatch(gameTime);
        comboCount = comboState.current; // mirror
        setCombo(comboState.current);
        clearTimeout(comboResetTimer);
        comboResetTimer = setTimeout(() => {
          const decayed = comboSys.handleMiss();
          comboCount = decayed.current;
          setCombo(decayed.current);
        }, 2000);
        catches++;
  sumReaction += Math.max(0, gameTime - lastSpawnedAt);

        // New scoring: sample outcome probabilities for normal collectibles
        let earnedPoints = 0;
        if (meta.isPowerUp) {
          // Map our configured power-ups to in-game behaviors
          const powerups = ["FireStar", "MagnetSpoon", "IceCrystal", "PhoenixFeather"];
          const selected = powerups[Math.floor(Math.random() * powerups.length)];
          // Construct minimal player state for the helper
          const playerState = { score: scoreRef.current, speed: 1, hp: lives, effects: {}, baselineSpeed: 1 } as any;
          const newState = applyPowerup(playerState, selected);
          const delta = (newState.score || 0) - (playerState.score || 0);
          if (delta !== 0) setScore((prev) => prev + delta);
          // Activation side-effects mapped to existing in-game flags
          if (selected === "MagnetSpoon") {
            magnetActive = true;
            toast.success("Magnet Spoon! Items will be attracted.", { duration: 1500 });
            setTimeout(() => { magnetActive = false; if (playerController) playerController.endPowerUp(); }, 10000);
          } else if (selected === "IceCrystal") {
            // slow falling objects
            setSlowFactor(0.6, 7000);
            toast.success("Ice Crystal! Slowed items.", { duration: 1500 });
          } else if (selected === "PhoenixFeather") {
            setLives((prev) => Math.max(prev, 1));
            toast.success("Phoenix Feather! Revived.", { duration: 1500 });
          } else if (selected === "FireStar") {
            toast.success("Fire Star! Bonus points.", { duration: 1500 });
          }
          if (playerController) playerController.triggerPowerUp();
          playSound("powerup", { pitch: fever.active ? 1.3 : 1.0 });
        } else {
          const outcome = sampleScoreOutcome();
          const basePoints = Math.floor(Number(outcome.points || 0));
          earnedPoints = Math.floor(basePoints * comboSys.multiplier * (fever.active ? 2 : 1) * (globalScoreBoost || 1));
          // Apply legacy multiplier power-up AFTER combo multiplier
          if (multiplierActive) earnedPoints *= 2;
        }

        if (comboState.milestone) {
          // Pitch ramp based on milestone tier
          const pitch = Math.min(1.0 + comboState.current * 0.01, 1.6);
          playSound('combo', { pitch });
          toast.success(`Combo ${comboState.milestone}! x${comboSys.multiplier.toFixed(1)}`);
          if (settings.haptics && navigator.vibrate) {
            navigator.vibrate(40);
          }
        }
        
        // Handle power-ups
        if (meta.type === 'chain') {
          const chainIdx = (container as any).chainIndex ?? -1;
          if (chainIdx === comboCount % chainLength) {
            // Correct order caught -> bonus
            earnedPoints += 10 + chainIdx * 5;
            playSound('combo', { pitch: 1.2 });
            toast.success(`Chain ${chainIdx + 1}/${chainLength}! +${earnedPoints}`);
          } else {
            // Wrong order resets chain progression
            comboCount = 0;
            toast.error('Chain broken!');
          }
        }

        if (meta.isPowerUp) {
          const powerUps = ["shield", "magnet", "time", "multiplier", "fever"];
          const selectedPowerUp = powerUps[Math.floor(Math.random() * powerUps.length)];
          
          activatePowerUp(selectedPowerUp);
          if (playerController) playerController.triggerPowerUp();
          playSound("powerup", { pitch: fever.active ? 1.3 : 1.0 });
          if (settings.haptics && navigator.vibrate) navigator.vibrate(25);
        } else if ((meta.points ?? 0) === 25) {
          playSound("gem", { pitch: Math.min(1.5, 1 + comboSys.multiplier * 0.1) });
        } else {
          playSound("collect", { pitch: Math.min(1.4, 1 + comboSys.multiplier * 0.08) });
        }
        
  setScore((prev) => prev + earnedPoints);
        // Rare-catch blush impulse (visual reward)
        if (settings.particles && earnedPoints >= 50) {
          // small pink ember/burst near player
          createBlushImpulse(playerController.sprite.x, playerController.sprite.y - 16);
        }
  if (settings.haptics && navigator.vibrate) navigator.vibrate(10);
  // Popup density gating
  const shouldPopup = settings.popupDensity === 'full' || fever.active || earnedPoints >= 25 || (comboSys.current % 2 === 1);
  if (shouldPopup) {
    createPointPopup(container.x, container.y, earnedPoints, comboSys.multiplier, fever.active);
  }
        if (playerController) playerController.triggerCatchSequence();
      }
    }

    function createBlushImpulse(x: number, y: number) {
      if (!sceneRef) return;
      const color = 0xFF6B9D; // blush
      for (let i = 0; i < 6; i++) {
        const p = sceneRef.add.circle(x, y, 3, color, 1);
        const angle = (Math.PI * 2 * i) / 6 + (Math.random() - 0.5) * 0.6;
        const dist = 20 + Math.random() * 24;
        sceneRef.tweens.add({
          targets: p,
          x: x + Math.cos(angle) * dist,
          y: y + Math.sin(angle) * dist - 8,
          alpha: 0,
          scale: 0.5,
          duration: 420 + Math.random() * 220,
          ease: 'Cubic.easeOut',
          onComplete: () => p.destroy(),
        });
      }
    }
    // Lightweight floating point popup (no toast) for score increments
    function createPointPopup(x: number, y: number, points: number, comboMult: number, feverActive: boolean) {
      if (!sceneRef) return;
      // Popup styling based on combo tiers
      let color = '#FFD700';
      let outline = '#000000';
      let scale = 0.92;
      if (comboMult >= 5) { color = '#FF2ED1'; outline = '#4A0038'; scale = 1.25; }
      else if (comboMult >= 3) { color = '#FF7B00'; outline = '#4A2100'; scale = 1.15; }
      else if (comboMult >= 2) { color = '#FFDD33'; outline = '#3A2B00'; scale = 1.05; }
      else if (comboMult >= 1.5) { color = '#FFE680'; outline = '#3A3000'; scale = 1.0; }

      if (feverActive) {
        // Fever overrides with pulsing magenta/gold blend
        color = '#FF47FF';
        outline = '#4A004A';
        scale += 0.1;
      }

      const txt = sceneRef
        .add.text(x, y - 30, `+${points}`, {
          fontFamily: 'Press Start 2P',
          fontSize: '14px',
          color,
        })
        .setOrigin(0.5)
        .setDepth(999)
        .setAlpha(0)
        .setScale(scale);

      // Improve readability with subtle stroke and shadow
      // @ts-ignore - phaser typings may not expose these chain methods
      txt.setStroke?.('#000000', 3);
      // @ts-ignore
      txt.setShadow?.(0, 2, 'rgba(0,0,0,0.55)', 2, false, true);

      // Two-stage tween: quick ease-in, then float and fade
      sceneRef.tweens.add({
        targets: txt,
        alpha: 1,
        y: y - 42,
        scale: scale * 1.05,
        duration: 160,
        ease: 'Sine.easeOut',
        onComplete: () => {
          // Fever glow pulsing tween (parallel)
          if (feverActive) {
            sceneRef.tweens.add({
              targets: txt,
              scale: scale * 1.15,
              yoyo: true,
              repeat: 3,
              duration: 140,
              ease: 'Sine.easeInOut'
            });
          }
          sceneRef.tweens.add({
            targets: txt,
            alpha: 0,
            y: y - 78,
            scale: scale * 1.02,
            duration: 420,
            ease: 'Sine.easeIn',
            onComplete: () => txt.destroy(),
          });
        },
      });
    }

    function activatePowerUp(type: string) {
      setActivePowerUp(type);
      setPowerUpTimeLeft(5);
      
      switch (type) {
        case "shield":
          shieldActive = true;
          toast.success("Shield activated! 5 seconds", { duration: 1500 });
          setTimeout(() => {
            shieldActive = false;
            setActivePowerUp(null);
            if (playerController) playerController.endPowerUp();
          }, 5000);
          break;
        case "magnet":
          magnetActive = true;
          toast.success("Magnet activated! 5 seconds", { duration: 1500 });
          setTimeout(() => {
            magnetActive = false;
            setActivePowerUp(null);
            if (playerController) playerController.endPowerUp();
          }, 5000);
          break;
        case "time":
          setTimeLeft((prev) => prev + 10);
          toast.success("+10 seconds!", { duration: 1500 });
          setActivePowerUp(null);
          break;
        case "multiplier":
          multiplierActive = true;
          toast.success("2x Score! 5 seconds", { duration: 1500 });
          setTimeout(() => {
            multiplierActive = false;
            setActivePowerUp(null);
            if (playerController) playerController.endPowerUp();
          }, 5000);
          break;
        case "fever":
          fever.start(gameTime, 10000);
          toast.success("FEVER MODE! 10s", { duration: 1500 });
          setActivePowerUp(null);
          break;
      }
    }

    // Timer countdown
    const timerInterval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerInterval);
          toast.success("Time's up! Well played!");
          setTimeout(() => onGameOver(scoreRef.current), 500);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timerInterval);
      // Clean up touch listeners we attached to the wrapper to avoid duplicates on remount
      if (gameRef.current && touchPreventHandler) {
        gameRef.current.removeEventListener('touchmove', touchPreventHandler as any);
        gameRef.current.removeEventListener('gesturestart', touchPreventHandler as any);
      }
      game.destroy(true);
    };
  }, [stageId, onGameOver, viewport.zoom]);

  // Pause control removed; game controls are intentionally minimal in embed mode

  return (
  <div className="fixed inset-0 z-50 parallax-shell bg-background w-full overflow-hidden">
      {/* Parallax background layers */}
      <div className="bg-layer bg-lava-flow" />
      <div className="bg-layer bg-mid-parallax" />
      <div className="bg-layer bg-embers" />

      {/* Foreground content */}
  <div className="relative z-[5] flex flex-col items-center justify-start p-safe-shell game-shell w-full" style={{ paddingLeft: '0.75rem', paddingRight: '0.75rem' }}>
  {/* HUD */}
  <div className="w-full bg-card border-4 border-primary p-4 mb-4 space-y-2 safe-top-offset" style={{ maxWidth: viewport.baseWidth }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {[...Array(3)].map((_, i) => (
              <Heart
                key={i}
                className={`w-8 h-8 ${
                  i < lives ? "text-destructive fill-destructive" : "text-muted"
                }`}
              />
            ))}
          </div>
          
          <div className="text-2xl font-bold text-primary">
            SCORE: {score}
          </div>
          
          <div className="text-xl font-bold text-foreground">
            ⏱️ {timeLeft}s
          </div>
        </div>

        {/* Combo and Power-up indicators */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            {combo >= 5 && (
              <div className="bg-accent px-3 py-1 border-2 border-foreground animate-pulse-glow">
                🔥 COMBO x{combo}
              </div>
            )}
          </div>
          
          {activePowerUp && (
            <div className="bg-secondary px-3 py-1 border-2 border-foreground flex items-center gap-2">
              {activePowerUp === "shield" && <Shield className="w-4 h-4" />}
              {activePowerUp === "magnet" && <Zap className="w-4 h-4" />}
              {activePowerUp === "multiplier" && "✨"}
              <span className="uppercase">{activePowerUp}</span>
            </div>
          )}
        </div>
      </div>

      {/* Game canvas */}
      <div
        ref={gameRef}
        className="border-4 border-primary shadow-2xl game-canvas-wrapper flex-shrink-0"
        style={{ width: '100%', aspectRatio: `${viewport.baseWidth}/${viewport.baseHeight}`, maxHeight: '100%', touchAction: 'none', WebkitTapHighlightColor: 'transparent' }}
      />

      {/* Controls removed: exit, pause and settings buttons intentionally hidden */}

      <p className="text-sm text-muted-foreground mt-2 mb-0">
        Move with mouse/touch or arrow keys
      </p>
      {/* Show orientation tip only when user is in landscape on mobile. Portrait is our primary mode now. */}
      <OrientationPrompt show={viewport.orientation === 'landscape' && viewport.device === 'mobile'} />

      {/* Settings panel removed from HUD to simplify gameplay chrome */}
      </div>
    </div>
  );
};

interface ToggleRowProps { label: string; value: boolean; onClick: () => void; }
const ToggleRow = ({ label, value, onClick }: ToggleRowProps) => (
  <button
    onClick={onClick}
    className={`flex items-center justify-between w-full text-xs px-2 py-1 border-2 rounded ${value ? 'border-primary bg-card' : 'border-border bg-muted/20'}`}
  >
    <span>{label}</span>
    <span className={`font-bold ${value ? 'text-primary' : 'text-muted-foreground'}`}>{value ? 'ON' : 'OFF'}</span>
  </button>
);
