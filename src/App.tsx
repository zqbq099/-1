import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Play, RefreshCw, Trophy, Target, Zap, Volume2, VolumeX, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

const ROWS = 8;
const COLS = 6;
const TILE_SIZE = 75; // Increased for massive pieces

const soundEffects = {
  swap: "/sounds/effects/swap.mp3",
  match: "/sounds/effects/match.mp3",
  pop: "/sounds/effects/pop.mp3",
  levelUp: "/sounds/effects/levelup.mp3",
  select: "/sounds/effects/select.mp3",
  error: "/sounds/effects/error.mp3",
};

const zikirData = [
  { text: "سبحان\nالله", spokenText: "سُبْحَانَ اللهْ", color: "#60a5fa", base: "#1d4ed8" }, 
  { text: "الحمد\nلله", spokenText: "الْحَمْدُ لِلَّهْ", color: "#4ade80", base: "#15803d" }, 
  { text: "لا إله\nإلا الله", spokenText: "لَا إِلَهَ إِلَّا اللهْ", color: "#fbbf24", base: "#b45309" }, 
  { text: "الله\nأكبر", spokenText: "اللهُ أَكْبَر", color: "#f87171", base: "#b91c1c" }, 
  { text: "سبحان الله\nوبحمده", spokenText: "سُبْحَانَ اللهِ وَبِحَمْدِهْ", color: "#c084fc", base: "#7e22ce" }, 
  { text: "سبحان ربي\nالعظيم", spokenText: "سُبْحَانَ رَبِّيَ الْعَظِيمْ", color: "#2dd4bf", base: "#0f766e" }, 
  { text: "أستغفر الله\nوأتوب إليه", spokenText: "أَسْتَغْفِرُ اللهَ وَأَتُوبُ إِلَيْهْ", color: "#f472b6", base: "#be185d" },
  { text: "لا حول ولا\nقوة إلا بالله", spokenText: "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهْ", color: "#94a3b8", base: "#475569" },
  { text: "اللهم صلِ\nعلى محمد", spokenText: "اللَّهُمَّ صَلِّ عَلَى مُحَمَّد", color: "#4ade80", base: "#166534" },
  { text: "يا حي\nيا قيوم", spokenText: "يَا حَيُّ يَا قَيُّوم", color: "#60a5fa", base: "#1e3a8a" },
  { text: "يا لطيف", spokenText: "يَا لَطِيف", color: "#fb7185", base: "#e11d48" },
  { text: "حسبي الله\nونعم الوكيل", spokenText: "حَسْبِيَ اللهُ وَنِعْمَ الْوَكِيل", color: "#34d399", base: "#059669" },
  { text: "سبحان الله\nالعظيم", spokenText: "سُبْحَانَ اللهِ الْعَظِيم", color: "#a78bfa", base: "#6d28d9" },
  { text: "تبارك الله", spokenText: "تَبَارَكَ الله", color: "#fb923c", base: "#ea580c" }
];

const LEVELS = [
  { target: 2000, zikirs: 8 },
  { target: 5000, zikirs: 9 },
  { target: 10000, zikirs: 10 },
  { target: 20000, zikirs: 12 },
  { target: 40000, zikirs: 14 },
  { target: 100000, zikirs: 14 }
];

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [level, setLevel] = useState(1);
  const levelRef = useRef(1);
  levelRef.current = level;
  const currentLevelConfig = LEVELS[Math.min(level - 1, LEVELS.length - 1)];
  const [score, setScore] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const isMutedRef = useRef(false);
  isMutedRef.current = isMuted;
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const difficultyRef = useRef(difficulty);
  difficultyRef.current = difficulty;

  const targetScore = 3000 * Math.pow(2, level - 1);
  const currentZikirData = zikirData.slice(0, currentLevelConfig.zikirs);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [isVictory, setIsVictory] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [bgColor, setBgColor] = useState("#0f172a"); // Default deep blue
  
  const titles = ["ذاكر", "مسبّح", "قانت", "منيب", "مخبت", "صديق"];
  const currentTitle = titles[Math.min(level - 1, titles.length - 1)];

  const [combo, setCombo] = useState(0);
  const [comboMessage, setComboMessage] = useState("");
  const comboRef = useRef(0);

  const [floatingWords, setFloatingWords] = useState<Array<{id: string, text: string, x: number, y: number, drift: number, type?: 'score' | 'combo'}>>([]);
  const [noMoves, setNoMoves] = useState(false);
  const scoreRef = useRef(0);
  const boardRef = useRef<any[][]>([]);
  const particlesRef = useRef<any[]>([]);
  const glowsRef = useRef<any[]>([]);
  const shakeRef = useRef({ x: 0, y: 0, intensity: 0 });
  const firstTileRef = useRef<any>(null);
  const dragStartRef = useRef<{r: number, c: number, x: number, y: number} | null>(null);
  const isAnimatingRef = useRef<boolean>(false);
  const boardVersionRef = useRef<number>(0);
  const audioCacheRef = useRef<Record<string, HTMLAudioElement>>({});
  const speechQueueRef = useRef<any[]>([]);
  const isSpeechPlayingRef = useRef<boolean>(false);
  const cascadeCountRef = useRef(0);
  const idleTimerRef = useRef<any>(null);
  const dragDirectionRef = useRef<'x' | 'y' | null>(null);

  const gameActionsRef = useRef<{ initBoard: () => void, handleDirectionAction?: (dir: 'up' | 'down' | 'left' | 'right') => void } | null>(null);

  const playSound = (name: string) => {
    if (isMutedRef.current) return;
    if (audioCacheRef.current[name]) {
      const audio = audioCacheRef.current[name];
      audio.currentTime = 0;
      audio.play().catch(e => console.log('Audio play blocked:', e));
    }
  };

  const vibrate = (pattern: number | number[]) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  };

    useEffect(() => {
      // Robust board versioning to prevent race conditions
      const currentVersion = boardVersionRef.current;
      
      // Preload audio files
      zikirData.forEach(item => {
      if (item.soundPath) {
        const audio = new Audio(item.soundPath);
        audioCacheRef.current[item.text] = audio;
      }
    });
    
    Object.entries(soundEffects).forEach(([key, path]) => {
        const audio = new Audio(path);
        audioCacheRef.current[key] = audio;
    });

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High DPI Canvas Scaling
    const dpr = window.devicePixelRatio || 1;
    canvas.width = COLS * TILE_SIZE * dpr;
    canvas.height = ROWS * TILE_SIZE * dpr;
    canvas.style.width = `${COLS * TILE_SIZE}px`;
    canvas.style.height = `${ROWS * TILE_SIZE}px`;
    
    ctx.scale(dpr, dpr);

    let animationFrameId: number;

    const getMatchDelay = () => {
      switch(difficultyRef.current) {
        case 'easy': return 150;
        case 'hard': return 50;
        default: return 90;
      }
    };

    const getCurrZikirData = () => {
      const cfg = LEVELS[Math.min(levelRef.current - 1, LEVELS.length - 1)];
      return zikirData.slice(0, cfg.zikirs);
    };

    const triggerShake = (intensity: number) => {
      // Shake removed as per user request
      shakeRef.current.intensity = 0;
    };

    // V2: Audio Context for procedural "Marble Clink" sounds
    const playMatchSound = (isSuper: boolean) => {
      try {
        const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        
        const ctx = new AudioContextClass();
        const now = ctx.currentTime;
        
        // Simulating the "Click" of marble stones
        const playClink = (time: number, freq: number, vol: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          // Marble hits have high-frequency transients and clean tones
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, time);
          // Very fast frequency drop to mimic solid impact
          osc.frequency.exponentialRampToValueAtTime(freq * 0.8, time + 0.05);
          
          gain.gain.setValueAtTime(0, time);
          gain.gain.linearRampToValueAtTime(vol, time + 0.002);
          // Sharp decay for marble hardness
          gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.start(time);
          osc.stop(time + 0.06);
        };

        // Main marble impact (Higher pitch than before) - Volume doubled
        playClink(now, 1200 + Math.random() * 200, 0.16); 
        
        // Second subtle resonance for realism - Volume doubled
        if (isSuper) {
          playClink(now + 0.02, 2400, 0.08);
          playClink(now + 0.04, 1800, 0.06);
        } else {
          playClink(now + 0.015, 1500, 0.04);
        }
        
        setTimeout(() => ctx.close(), 250);
      } catch (e) {
        console.error("Audio error", e);
      }
    };

    const createParticles = (x: number, y: number, color: string, isSuper = false) => {
      // Play stone clink sound
      playMatchSound(isSuper);

      // Balanced density for beauty and performance
      const count = isSuper ? 25 : 12; 
      
      // Precise color detection for variety
      let flowers = ["🌸"]; 
      const lowerColor = color.toLowerCase();
      if (lowerColor.includes("239") || lowerColor.includes("red")) flowers = ["🌹", "🥀", "🍒"]; 
      else if (lowerColor.includes("251") || lowerColor.includes("yellow")) flowers = ["🌼", "🌻", "🍋"]; 
      else if (lowerColor.includes("59") || lowerColor.includes("blue")) flowers = ["🌺", "💠", "💎"]; 
      else if (lowerColor.includes("34") || lowerColor.includes("green")) flowers = ["🌷", "🌿", "🍃"]; 
      else if (lowerColor.includes("255") || lowerColor.includes("white")) flowers = ["💮", "☁️", "🤍"];

      for(let i = 0; i < count; i++) {
        const flower = flowers[Math.floor(Math.random() * flowers.length)];
        const angle = (Math.PI * 2 / count) * i + (Math.random() - 0.5);
        const speed = (2 + Math.random() * 5) * 6; 
        particlesRef.current.push({
          x: x, y: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1.0,
          char: flower,
          size: 14 + Math.random() * 10,
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() > 0.5 ? 1 : -1) * (0.4 + Math.random() * 0.6), // Much faster rotation like a fan
        drift: (Math.random() - 0.5) * 0.1
      });
    }
  };

  const updateAndDrawParticles = () => {
      // Update Shake
      if (shakeRef.current.intensity > 0) {
        shakeRef.current.x = (Math.random() - 0.5) * shakeRef.current.intensity;
        shakeRef.current.y = (Math.random() - 0.5) * shakeRef.current.intensity;
        shakeRef.current.intensity *= 0.85;
        if (shakeRef.current.intensity < 0.1) shakeRef.current.intensity = 0;
      } else {
        shakeRef.current.x = 0;
        shakeRef.current.y = 0;
      }

      // Draw Flower Petals / Flowers
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        let p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx += Math.sin(p.rotation) * p.drift; // Natural sway
        p.vy += 0.2; // Lighter gravity for flowers
        p.life -= 0.012; // Longer life for better visual
        p.rotation += p.rotSpeed * 0.8; // Apply the fast rotation speed
        
        if (p.life <= 0) {
          particlesRef.current.splice(i, 1);
          continue;
        }
        
        ctx.save();
        ctx.globalAlpha = p.life > 0.4 ? 1.0 : p.life / 0.4;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        
        // Draw the flower emoji character
        ctx.font = `${p.size}px Arial`;
        ctx.fillText(p.char, 0, 0);
        
        ctx.restore();
      }
    };

    const drawTile = (ctx: CanvasRenderingContext2D, tile: any, x: number, y: number, isSelected: boolean) => {
        // Draw special glow for special tiles
        if (tile.isSpecial) {
           ctx.save();
           ctx.shadowColor = tile.isSpecial === 'super' ? "rgba(255, 255, 255, 0.9)" : tile.color;
           ctx.shadowBlur = 20 + Math.sin(Date.now() / 200) * 10;
           ctx.beginPath();
           ctx.roundRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4, 25);
           ctx.strokeStyle = "white";
           ctx.lineWidth = 3;
           ctx.stroke();
           ctx.restore();
        }

        // Draw tile body with frosted theme radial gradient
        const rg = ctx.createRadialGradient(
          x + TILE_SIZE * 0.3, y + TILE_SIZE * 0.3, 0,
          x + TILE_SIZE * 0.3, y + TILE_SIZE * 0.3, TILE_SIZE * 0.8
        );
        rg.addColorStop(0, tile.color);
        rg.addColorStop(1, tile.base);
        
        ctx.fillStyle = rg;
        if (!isSelected) {
          ctx.shadowColor = "rgba(0,0,0,0.3)";
          ctx.shadowBlur = 10;
          ctx.shadowOffsetY = 4;
        }

        ctx.beginPath();
        ctx.roundRect(x + 4, y + 4, TILE_SIZE - 8, TILE_SIZE - 8, 22);
        ctx.fill();

        // Glossy Highlight (Candy look)
        ctx.beginPath();
        const highlightGradient = ctx.createLinearGradient(x, y + 8, x, y + TILE_SIZE * 0.4);
        highlightGradient.addColorStop(0, "rgba(255, 255, 255, 0.4)");
        highlightGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.fillStyle = highlightGradient;
        ctx.roundRect(x + 10, y + 8, TILE_SIZE - 20, TILE_SIZE * 0.3, 15);
        ctx.fill();

        // Subtle bottom inner shadow
        ctx.beginPath();
        ctx.strokeStyle = "rgba(0,0,0,0.15)";
        ctx.lineWidth = 2;
        ctx.roundRect(x + 8, y + TILE_SIZE - 12, TILE_SIZE - 16, 2, 2);
        ctx.stroke();

        // Reset shadow for text and other elements
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        // Selection border
        if (isSelected) {
          ctx.strokeStyle = "white";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.roundRect(x + 4, y + 4, TILE_SIZE - 8, TILE_SIZE - 8, 22);
          ctx.stroke();
        }

        // Text
        ctx.fillStyle = "white";
        ctx.font = tile.isSpecial ? "bold 18px 'Reem Kufi', sans-serif" : "bold 16px 'Reem Kufi', sans-serif"; 
        ctx.textAlign = "center";
        
        // Add special icon for special tiles
        if (tile.isSpecial) {
            ctx.font = "bold 24px Arial";
            ctx.fillText(tile.isSpecial === 'super' ? "✨" : (tile.isSpecial === 'row' ? "↔️" : "↕️"), x + TILE_SIZE / 2, y + TILE_SIZE / 2 - 25);
            ctx.font = "bold 16px 'Reem Kufi', sans-serif";
        }

        const lines = tile.text.split('\n');
        lines.forEach((line: string, i: number) => {
          ctx.shadowColor = "rgba(0,0,0,0.4)";
          ctx.shadowBlur = 4;
          ctx.shadowOffsetY = 2;
          ctx.fillText(line, x + TILE_SIZE / 2, y + TILE_SIZE / 2 + (i * 20) - 5);
          ctx.shadowColor = "transparent";
        });
    };

    const render = () => {
      ctx.clearRect(0, 0, COLS * TILE_SIZE, ROWS * TILE_SIZE);
      
      const draggedTiles: any[] = [];
      
      boardRef.current.forEach(row => row.forEach(tile => {
        if (!tile) return;
        
        // If it's a dragged tile or its neighbor, save it for later drawing on top
        if (tile.offsetX !== 0 || tile.offsetY !== 0) {
            draggedTiles.push(tile);
            return;
        }

        ctx.save();
        let x = tile.c * TILE_SIZE + (tile.offsetX || 0);
        let y = tile.r * TILE_SIZE + (tile.offsetY || 0);
        drawTile(ctx, tile, x, y, false);
        ctx.restore();
      }));

      // Render dragged tiles on top
      draggedTiles.forEach(tile => {
        ctx.save();
        let x = tile.c * TILE_SIZE + (tile.offsetX || 0);
        let y = tile.r * TILE_SIZE + (tile.offsetY || 0);
        
        const isSelected = firstTileRef.current && firstTileRef.current.r === tile.r && firstTileRef.current.c === tile.c;
        if (isSelected) {
            // Apply extra scale and shadow for "held" feeling
            const scale = 1.15; 
            ctx.translate(x + TILE_SIZE / 2, y + TILE_SIZE / 2);
            ctx.scale(scale, scale);
            ctx.translate(-(x + TILE_SIZE / 2), -(y + TILE_SIZE / 2));
            
            ctx.shadowColor = "rgba(255, 255, 255, 0.7)";
            ctx.shadowBlur = 20;
            ctx.shadowOffsetY = 10;
        }

        drawTile(ctx, tile, x, y, isSelected);
        ctx.restore();
      });
      
      updateAndDrawParticles();
      
      animationFrameId = requestAnimationFrame(render);
    };

    const processSpeechQueue = () => {
      if (isSpeechPlayingRef.current || speechQueueRef.current.length === 0) return;
      isSpeechPlayingRef.current = true;
      const tile = speechQueueRef.current.shift();

      const finishCurrent = () => {
        isSpeechPlayingRef.current = false;
        if (tile.onComplete) tile.onComplete();
        processSpeechQueue();
      };

      const fallbackSpeech = () => {
        if ('speechSynthesis' in window) {
          const msg = new SpeechSynthesisUtterance();
          msg.text = tile.spokenText || tile.text.replace('\n', ' ');
          msg.lang = 'ar-SA';
          msg.rate = 1.1;
          msg.onend = finishCurrent;
          msg.onerror = finishCurrent;
          window.speechSynthesis.speak(msg);
        } else {
          finishCurrent();
        }
      };

      const audio = audioCacheRef.current[tile.text];
      if (audio) {
        audio.currentTime = 0; // Reset to start
        
        // Define what happens when audio ends
        audio.onended = finishCurrent;

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(e => {
            console.log('Audio play blocked or missing:', e);
            audio.onended = null;
            fallbackSpeech();
          });
        }
      } else {
        fallbackSpeech();
      }
    };

    const speak = (tile: any) => {
      if (isMutedRef.current) {
        if (tile.onComplete) setTimeout(tile.onComplete, 100);
        return;
      }
      speechQueueRef.current.push(tile);
      processSpeechQueue();
    };

    const resetIdleTimer = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        if (!isAnimatingRef.current && !isSpeechPlayingRef.current) {
          speak({ text: "لا حول\nولا قوة\nإلا بالله", spokenText: "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهْ" });
        }
      }, 10000); // 10 seconds empty time triggers this
    };

    resetIdleTimer();

    const animateSwap = (r1: number, c1: number, r2: number, c2: number, callback: () => void) => {
      isAnimatingRef.current = true;
      const tile1 = boardRef.current[r1]?.[c1];
      const tile2 = boardRef.current[r2]?.[c2];
      
      const duration = 60; // 3x faster (was 120)
      const startTime = performance.now();
      const dx = (c2 - c1) * TILE_SIZE;
      const dy = (r2 - r1) * TILE_SIZE;

      playSound('swap');
      vibrate(10);

      const animate = (time: number) => {
        let executionTime = time - startTime;
        let progress = Math.min(executionTime / duration, 1);
        
        // Math_easeOutQuad
        const ease = progress * (2 - progress);

        if (tile1) { tile1.offsetX = dx * ease; tile1.offsetY = dy * ease; }
        if (tile2) { tile2.offsetX = -dx * ease; tile2.offsetY = -dy * ease; }

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          if (tile1) { tile1.offsetX = 0; tile1.offsetY = 0; }
          if (tile2) { tile2.offsetX = 0; tile2.offsetY = 0; }
          
          boardRef.current[r1][c1] = tile2;
          boardRef.current[r2][c2] = tile1;
          
          if (tile1) { tile1.r = r2; tile1.c = c2; }
          if (tile2) { tile2.r = r1; tile2.c = c1; }
          
          callback();
        }
      };
      requestAnimationFrame(animate);
    };

    const applyGravity = () => {
      const currentVersion = boardVersionRef.current;
      let isFalling = false;
      const animations: Promise<void>[] = [];
      const currData = getCurrZikirData();
      const GRAVITY = 24.0; // Extremely fast gravity
      
      for (let c = 0; c < COLS; c++) {
        let emptySpot = ROWS - 1;
        let columnMissingCount = 0;

        // تحريك القطع الموجودة التي تحتها فراغ
        for (let r = ROWS - 1; r >= 0; r--) {
          if (boardRef.current[r][c]) {
            let tile = boardRef.current[r][c];
            if (r !== emptySpot) {
              isFalling = true;
              const startR = r;
              const targetR = emptySpot;
              
              boardRef.current[r][c] = null;
              boardRef.current[targetR][c] = tile;
              tile.r = targetR;

              animations.push(new Promise(resolve => {
                const distance = (targetR - startR) * TILE_SIZE;
                const duration = (80 + (targetR - startR) * 15) / 3; // 3x faster
                let startTime: number | null = null;
                
                const anim = (time: number) => {
                  if (!startTime) startTime = time;
                  const executionTime = time - startTime;
                  const progress = Math.min(executionTime / duration, 1);
                  
                  // Linear movement (no bounce, no easing)
                  const currentY = -distance + (distance * progress);
                  
                  if (progress >= 1) {
                    tile.offsetY = 0;
                    resolve();
                  } else {
                    tile.offsetY = currentY;
                    requestAnimationFrame(anim);
                  }
                };
                requestAnimationFrame(anim);
              }));
            }
            emptySpot--;
          } else {
            columnMissingCount++;
          }
        }

        // تعبئة المربعات الفارغة بقطع جديدة تسقط من الأعلى
        for (let r = emptySpot; r >= 0; r--) {
          isFalling = true;
          const zikir = currData[Math.floor(Math.random() * currData.length)];
          const tile = { ...zikir, r, c, offsetX: 0, offsetY: 0 };
          boardRef.current[r][c] = tile;
          
          animations.push(new Promise(resolve => {
            const distance = (r + columnMissingCount + 3) * TILE_SIZE;
            const duration = (100 + (r + columnMissingCount) * 15) / 3;
            const delay = ((emptySpot - r) * 30) / 3; // 3x faster stagger
            let startTime: number | null = null;
            
            const anim = (time: number) => {
              if (!startTime) startTime = time;
              const executionTime = time - startTime;
              const progress = Math.min(executionTime / duration, 1);
              
              // Linear movement
              const currentY = -distance + (distance * progress);
              
              if (progress >= 1) {
                tile.offsetY = 0;
                resolve();
              } else {
                tile.offsetY = currentY;
                requestAnimationFrame(anim);
              }
            };
            setTimeout(() => requestAnimationFrame(anim), delay);
          }));
        }
      }
      
      if (isFalling) {
        Promise.all(animations).then(() => {
          setTimeout(() => { 
            if (boardVersionRef.current === currentVersion) {
              const matched = checkMatches(true);
              if (!matched) {
                if (!findPossibleMoves()) {
                  setNoMoves(true);
                }
              }
            } 
          }, 50);
        }).catch(() => {
          isAnimatingRef.current = false;
        });
      } else {
        setTimeout(() => { if (boardVersionRef.current === currentVersion) checkMatches(true) }, 50);
      }
    };

    const getMatches = () => {
      let matches = new Set<string>();
      let board = boardRef.current;
      
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (!board[r][c]) continue;
          
          if (c < COLS - 2 && board[r][c+1] && board[r][c+2] && 
             board[r][c].text === board[r][c+1].text && board[r][c].text === board[r][c+2].text) {
             [0, 1, 2].forEach(i => matches.add(`${r},${c+i}`));
          }
          
          if (r < ROWS - 2 && board[r+1][c] && board[r+2][c] && 
             board[r][c].text === board[r+1][c].text && board[r][c].text === board[r+2][c].text) {
             [0, 1, 2].forEach(i => matches.add(`${r+i},${c}`));
          }
        }
      }
      return matches;
    };

    const processMatches = (matches: Set<string>, shouldSpeak = true, onComplete?: () => void) => {
      let iterator = matches.values();
      let firstMatchKey = iterator.next().value.split(',');
      let r0 = parseInt(firstMatchKey[0]);
      let c0 = parseInt(firstMatchKey[1]);
      let matchedTile = boardRef.current[r0][c0];
      let matchColor = matchedTile.color;
      
      // V2: Check for special tile activation
      let specialToTrigger: any[] = [];
      matches.forEach(key => {
          const [r, c] = key.split(',').map(Number);
          if (boardRef.current[r][c]?.isSpecial) {
              specialToTrigger.push(boardRef.current[r][c]);
          }
      });

      if (specialToTrigger.length > 0) {
          specialToTrigger.forEach(s => {
              if (s.isSpecial === 'row') {
                  for(let c=0; c<COLS; c++) matches.add(`${s.r},${c}`);
              } else if (s.isSpecial === 'col') {
                  for(let r=0; r<ROWS; r++) matches.add(`${r},${s.c}`);
              } else if (s.isSpecial === 'super') {
                  boardRef.current.forEach((row, ri) => row.forEach((t, ci) => {
                      if (t && t.text === s.text) matches.add(`${ri},${ci}`);
                  }));
              }
          });
      }

      // V2: Create new special tiles if match is big enough
      let specialPos: {r: number, c: number} | null = null;
      if (matches.size === 4) {
          // Find if it was horizontal or vertical
          const keys = Array.from(matches).map(k => k.split(',').map(Number));
          const isHorizontal = keys.every(k => k[0] === keys[0][0]);
          specialPos = { r: keys[0][0], c: keys[0][1] };
          var type: 'row'|'col' = isHorizontal ? 'row' : 'col';
      } else if (matches.size >= 5) {
          const keys = Array.from(matches).map(k => k.split(',').map(Number));
          specialPos = { r: keys[0][0], c: keys[0][1] };
          var typeSuper: 'super' = 'super';
      }

      cascadeCountRef.current += 1;

      let speechCalled = false;
      if (shouldSpeak) {
         playSound('match');
         vibrate(20);
         // triggerShake removed 
         
         let spoken = matchedTile.spokenText;

         if (cascadeCountRef.current === 3) {
            speak({ text: matchedTile.text, spokenText: spoken });
            speak({ text: "مجموعة 3", spokenText: "اللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدْ وَعَلَىٰ آلِ مُحَمَّدْ", onComplete });
         } else if (cascadeCountRef.current >= 4) {
            speak({ text: matchedTile.text, spokenText: spoken });
            speak({ text: "مجموعة 4+", spokenText: "اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَىٰ نَبِيِّنَا مُحَمَّدْ", onComplete });
         } else {
            speak({ text: matchedTile.text, spokenText: spoken, onComplete });
         }
         speechCalled = true;
      }
      
      matches.forEach(key => {
        let [rStr, cStr] = key.split(',');
        let r = parseInt(rStr);
        let c = parseInt(cStr);
        if (shouldSpeak) {
          // V2: More particles for bigger matches or special tiles
          const isBigExplosion = matches.size > 5 || specialToTrigger.length > 0;
          createParticles(c * TILE_SIZE + TILE_SIZE/2, r * TILE_SIZE + TILE_SIZE/2, matchColor, isBigExplosion);
          
          if (boardRef.current[r][c] && canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            // Calculate screen coordinates
            const scaleX = rect.width / (COLS * TILE_SIZE);
            const scaleY = rect.height / (ROWS * TILE_SIZE);
            
            const screenX = rect.left + (c * TILE_SIZE + TILE_SIZE/2) * scaleX;
            const screenY = rect.top + (r * TILE_SIZE + TILE_SIZE/2) * scaleY;

            const id = Date.now().toString() + Math.random().toString();
            const text = boardRef.current[r][c].text;
            
            const drift = (Math.random() - 0.5) * 600; // Increased spread for tree effect
            setFloatingWords(prev => [...prev, { id, text, x: screenX, y: screenY, drift }]);
            setTimeout(() => {
              setFloatingWords(prev => prev.filter(w => w.id !== id));
            }, 8500); // Sink with 8.5s duration (matching animation)
          }
        }
        boardRef.current[r][c] = null;
      });

      // V2: Place the special tile after clearing
      if (specialPos && matchedTile) {
          const {r, c} = specialPos;
          boardRef.current[r][c] = { 
            ...matchedTile, 
            r, c, 
            isSpecial: type || typeSuper,
            offsetX: 0, offsetY: 0 
          };
      }
      
      if (shouldSpeak) {
        // V2: Update Background Color based on match
        setBgColor(matchColor + "44"); // Add transparency
        setTimeout(() => setBgColor("#0f172a"), 800);

        // Update Combo
        comboRef.current += 1;
        setCombo(comboRef.current);
        
        const multiplier = Math.max(1, comboRef.current);
        const points = matches.size * 10 * multiplier;
        const oldScore = scoreRef.current;
        scoreRef.current += points;
        setScore(scoreRef.current);

        if (comboRef.current > 1) {
          const messages = ["مَا شَاءَ اللَّه", "تَبَارَكَ اللَّه", "أَحْسَنْت", "تَسْبِيحٌ مُبَارَك"];
          const msg = messages[Math.floor(Math.random() * messages.length)];
          setComboMessage(msg);
          
          // Add floating combo message
          const id = "combo-" + Date.now().toString();
          const drift = (Math.random() - 0.5) * 300;
          setFloatingWords(prev => [...prev, { id, text: msg, x: window.innerWidth / 2, y: window.innerHeight / 2 - 100, drift, type: 'combo' }]);
          setTimeout(() => {
            setFloatingWords(prev => prev.filter(w => w.id !== id));
          }, 12500);
        }

        const currentTargetScore = 3000 * Math.pow(2, levelRef.current - 1);
        if (oldScore < currentTargetScore && scoreRef.current >= currentTargetScore) {
             isAnimatingRef.current = true;
             
             if (levelRef.current === LEVELS.length) {
               setIsVictory(true);
               playSound('levelUp');
               vibrate([100, 50, 100, 50, 200]);
               return; 
             }

             speak({ text: "مرحلة جديدة", spokenText: "مَا شَاءَ اللَّهُ لَا قُوَّةَ إِلَّا بِاللَّهْ" });
             setShowLevelUp(true);
             playSound('levelUp');
             vibrate([100, 50, 100, 50, 200]);
         }
      }
      if (!speechCalled && onComplete) {
         onComplete();
      }
    };

    const hasMatchesOnBoard = () => {
      return getMatches().size > 0;
    };

    const findPossibleMoves = () => {
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          // Try horizontal swap
          if (c < COLS - 1) {
            const temp = boardRef.current[r][c];
            boardRef.current[r][c] = boardRef.current[r][c + 1];
            boardRef.current[r][c + 1] = temp;
            
            const hasMatch = hasMatchesOnBoard();
            
            boardRef.current[r][c + 1] = boardRef.current[r][c];
            boardRef.current[r][c] = temp;
            
            if (hasMatch) return true;
          }
          // Try vertical swap
          if (r < ROWS - 1) {
            const temp = boardRef.current[r][c];
            boardRef.current[r][c] = boardRef.current[r + 1][c];
            boardRef.current[r + 1][c] = temp;
            
            const hasMatch = hasMatchesOnBoard();
            
            boardRef.current[r + 1][c] = boardRef.current[r][c];
            boardRef.current[r][c] = temp;
            
            if (hasMatch) return true;
          }
        }
      }
      return false;
    };

    const shuffleBoard = () => {
      isAnimatingRef.current = true;
      setNoMoves(false);
      
      vibrate(50);
      
      const currData = getCurrZikirData();
      const shuffleContent = () => {
        const flat = boardRef.current.flat();
        for (let i = flat.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [flat[i], flat[j]] = [flat[j], flat[i]];
        }
        
        let idx = 0;
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            boardRef.current[r][c] = { ...flat[idx++], r, c, offsetX: 0, offsetY: 0 };
          }
        }
      };

      let safe = 0;
      shuffleContent();
      while ((hasMatchesOnBoard() || !findPossibleMoves()) && safe < 20) {
        shuffleContent();
        safe++;
      }
      
      boardVersionRef.current++;
      isAnimatingRef.current = false;
    };

    const checkMatches = (shouldSpeak = true): boolean => {
      const currentVersion = boardVersionRef.current;
      const matches = getMatches();
      if (matches.size > 0) {
        processMatches(matches, shouldSpeak, () => {
          if (boardVersionRef.current === currentVersion) applyGravity();
        });
        return true;
      } else {
        if (shouldSpeak) {
          comboRef.current = 0;
          setCombo(0);
          setComboMessage("");
        }
        isAnimatingRef.current = false;
        return false;
      }
    };

    const trySwap = (r1: number, c1: number, r2: number, c2: number) => {
      const currentVersion = boardVersionRef.current;
      animateSwap(r1, c1, r2, c2, () => {
        if (boardVersionRef.current !== currentVersion) return;
        const matches = getMatches();
        if (matches.size > 0) {
          processMatches(matches, true, () => {
            if (boardVersionRef.current === currentVersion) applyGravity();
          });
        } else {
          // Invalid swap, revert
          playSound('error');
          vibrate([50, 50, 50]);
          animateSwap(r1, c1, r2, c2, () => {
             isAnimatingRef.current = false;
          });
        }
      });
    };

    const initBoard = () => {
      boardVersionRef.current++;
      boardRef.current = [];
      const currData = getCurrZikirData();
      for (let r = 0; r < ROWS; r++) {
        boardRef.current[r] = [];
        for (let c = 0; c < COLS; c++) {
          boardRef.current[r][c] = { ...currData[Math.floor(Math.random() * currData.length)], r, c, offsetX: 0, offsetY: 0 };
        }
      }
      
      let hasMatches = true;
      while (hasMatches) {
        hasMatches = false;
        const board = boardRef.current;
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            if (!board[r][c]) continue;
            if (c < COLS - 2 && board[r][c+1] && board[r][c+2] && 
                board[r][c].text === board[r][c+1].text && board[r][c].text === board[r][c+2].text) {
                board[r][c] = { ...currData[Math.floor(Math.random() * currData.length)], r, c, offsetX: 0, offsetY: 0 };
                hasMatches = true;
            }
            if (r < ROWS - 2 && board[r+1][c] && board[r+2][c] && 
                board[r][c].text === board[r+1][c].text && board[r][c].text === board[r+2][c].text) {
                board[r][c] = { ...currData[Math.floor(Math.random() * currData.length)], r, c, offsetX: 0, offsetY: 0 };
                hasMatches = true;
            }
          }
        }
      }
    };
    gameActionsRef.current = { initBoard };

    const getScaledCoords = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const isTouch = 'touches' in e;
      
      let clientX, clientY;
      if (isTouch) {
        const touchEvent = e as TouchEvent;
        // Search in touches, then changedTouches for touchend events
        const touch = touchEvent.touches[0] || touchEvent.changedTouches[0];
        clientX = touch.clientX;
        clientY = touch.clientY;
      } else {
        const mouseEvent = e as MouseEvent;
        clientX = mouseEvent.clientX;
        clientY = mouseEvent.clientY;
      }

      const scaleX = canvas.width / (dpr * rect.width);
      const scaleY = canvas.height / (dpr * rect.height);
      const x = (clientX - rect.left) * scaleX;
      const y = (clientY - rect.top) * scaleY;
      return { x, y };
    };

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      // Prevent scrolling while playing
      if (e.cancelable) e.preventDefault();
      if (isAnimatingRef.current) return;
      
      resetIdleTimer();
      cascadeCountRef.current = 0; 
      dragDirectionRef.current = null;
      
      const { x, y } = getScaledCoords(e);
      const c = Math.floor(x / TILE_SIZE);
      const r = Math.floor(y / TILE_SIZE);
      
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;

      vibrate(12); // Slightly firmer haptic for better tactile feedback
      dragStartRef.current = { r, c, x, y };
      
      if (firstTileRef.current) {
        if (firstTileRef.current.r === r && firstTileRef.current.c === c) {
           firstTileRef.current = null;
           dragStartRef.current = null;
           return;
        }
        
        const dist = Math.abs(r - firstTileRef.current.r) + Math.abs(c - firstTileRef.current.c);
        if (dist === 1) {
          trySwap(firstTileRef.current.r, firstTileRef.current.c, r, c);
          firstTileRef.current = null;
          dragStartRef.current = null;
          return;
        }
      }
      
      firstTileRef.current = { r, c };
      playSound('select');
      vibrate(10);
    };

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (e.cancelable) e.preventDefault();
      if (isAnimatingRef.current || !dragStartRef.current || !firstTileRef.current) return;
      
      const { x, y } = getScaledCoords(e);
      const dx = x - dragStartRef.current.x;
      const dy = y - dragStartRef.current.y;
      
      const { r, c } = firstTileRef.current;
      const tile = boardRef.current[r]?.[c];

      if (!tile) {
        dragStartRef.current = null;
        return;
      }

      // Responsive dragging - visual feedback
      tile.offsetX = dx * 0.8; // Added slight dampening for natural feel
      tile.offsetY = dy * 0.8;

      const moveDist = Math.max(Math.abs(dx), Math.abs(dy));
      const SWIPE_THRESHOLD = TILE_SIZE * 0.4; // Slightly lower threshold for faster response

      if (moveDist > SWIPE_THRESHOLD) {
        const isX = Math.abs(dx) > Math.abs(dy);
        const tr = r + (isX ? 0 : (dy > 0 ? 1 : -1));
        const tc = c + (isX ? (dx > 0 ? 1 : -1) : 0);

        if (tr >= 0 && tr < ROWS && tc >= 0 && tc < COLS) {
           tile.offsetX = 0;
           tile.offsetY = 0;
           boardRef.current.forEach(row => row.forEach(t => { if (t) { t.offsetX = 0; t.offsetY = 0; } }));
           dragStartRef.current = null;
           firstTileRef.current = null;
           vibrate(20); // Tactical haptic
           trySwap(r, c, tr, tc);
           return;
        }
      } else {
        // Feedback for neighbor
        let sideR = r, sideC = c;
        if (Math.abs(dx) > Math.abs(dy)) sideC += (dx > 0 ? 1 : -1);
        else sideR += (dy > 0 ? 1 : -1);
        
        if (sideR >= 0 && sideR < ROWS && sideC >= 0 && sideC < COLS) {
            const neighbor = boardRef.current[sideR][sideC];
            if (neighbor) {
                boardRef.current.forEach(row => row.forEach(t => { if (t && t !== tile && t !== neighbor) { t.offsetX = 0; t.offsetY = 0; } }));
                neighbor.offsetX = Math.abs(dx) > Math.abs(dy) ? -dx : 0;
                neighbor.offsetY = Math.abs(dx) > Math.abs(dy) ? 0 : -dy;
            }
        }
      }
    };

    const handlePointerUp = (e: MouseEvent | TouchEvent) => {
      // Ensure visual reset even on missed state
      if (!dragStartRef.current) {
        boardRef.current.forEach(row => row?.forEach(t => { if (t) { t.offsetX = 0; t.offsetY = 0; } }));
        return;
      }

      if (firstTileRef.current) {
         const { r, c } = firstTileRef.current;
         const tile = boardRef.current[r]?.[c];
         
         if (tile && (tile.offsetX !== 0 || tile.offsetY !== 0)) {
             // RUBBER BAND EFFECT: Animate back to zero
             const duration = 120; // 20% faster return
             const startTime = performance.now();
             const startX = tile.offsetX;
             const startY = tile.offsetY;
             
             const returnAnim = (time: number) => {
                 const elapsed = time - startTime;
                 const progress = Math.min(1, elapsed / duration);
                 const ease = progress * (2 - progress); // easeOutQuad
                 
                 if (progress < 1) {
                     tile.offsetX = startX * (1 - ease);
                     tile.offsetY = startY * (1 - ease);
                     requestAnimationFrame(returnAnim);
                 } else {
                     tile.offsetX = 0;
                     tile.offsetY = 0;
                     boardRef.current.forEach(row => row?.forEach(t => { if (t) { t.offsetX = 0; t.offsetY = 0; } }));
                 }
             };
             requestAnimationFrame(returnAnim);
         }
      }
      dragStartRef.current = null;
    };

    const handleDirectionAction = (dir: 'up' | 'down' | 'left' | 'right') => {
      if (isAnimatingRef.current || !firstTileRef.current) return;
      const { r, c } = firstTileRef.current;
      let r2 = r, c2 = c;

      if (dir === 'up') r2 -= 1;
      else if (dir === 'down') r2 += 1;
      else if (dir === 'left') c2 -= 1;
      else if (dir === 'right') c2 += 1;

      if (r2 >= 0 && r2 < ROWS && c2 >= 0 && c2 < COLS) {
        trySwap(r, c, r2, c2);
        firstTileRef.current = null;
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAnimatingRef.current || !firstTileRef.current) return;
      const { r, c } = firstTileRef.current;
      let r2 = r, c2 = c;

      if (e.key === 'ArrowUp' || e.key === 'w') r2 -= 1;
      else if (e.key === 'ArrowDown' || e.key === 's') r2 += 1;
      else if (e.key === 'ArrowLeft' || e.key === 'a') c2 -= 1;
      else if (e.key === 'ArrowRight' || e.key === 'd') c2 += 1;
      else return;

      e.preventDefault();
      
      if (r2 >= 0 && r2 < ROWS && c2 >= 0 && c2 < COLS) {
        trySwap(r, c, r2, c2);
        firstTileRef.current = null;
      }
    };

    // Expose control actions to UI
    gameActionsRef.current = {
      initBoard,
      handleDirectionAction
    };

    // Expose shuffle to button via window (quickest way for this architecture)
    (window as any).triggerShuffle = shuffleBoard;

    initBoard();
    render();

    canvas.addEventListener('mousedown', handlePointerDown as EventListener, { passive: false });
    canvas.addEventListener('mousemove', handlePointerMove as EventListener, { passive: false });
    window.addEventListener('mouseup', handlePointerUp as EventListener, { passive: false });
    
    canvas.addEventListener('touchstart', handlePointerDown as EventListener, { passive: false });
    canvas.addEventListener('touchmove', handlePointerMove as EventListener, { passive: false });
    window.addEventListener('touchend', handlePointerUp as EventListener, { passive: false });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
        cancelAnimationFrame(animationFrameId);
        canvas.removeEventListener('mousedown', handlePointerDown as EventListener);
        canvas.removeEventListener('mousemove', handlePointerMove as EventListener);
        window.removeEventListener('mouseup', handlePointerUp as EventListener);
        canvas.removeEventListener('touchstart', handlePointerDown as EventListener);
        canvas.removeEventListener('touchmove', handlePointerMove as EventListener);
        window.removeEventListener('touchend', handlePointerUp as EventListener);
        window.removeEventListener('keydown', handleKeyDown);
        window.speechSynthesis?.cancel();
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      };
    }, []); // Keep empty to run once, initBoard handles complexity

  const progressPercentage = Math.min((score / targetScore) * 100, 100);

  return (
    <div className="flex flex-col items-center min-h-screen relative font-sans overflow-hidden select-none touch-none"
         style={{ 
           background: `radial-gradient(circle at center, ${bgColor} 0%, #020617 100%)`,
           transition: 'background 0.8s ease'
         }}>
      
      {/* V2: Animated Spiritual Background Glow */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-blue-500/10 blur-[120px] animate-pulse"></div>
        {combo > 2 && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-white/5 blur-[80px] animate-ping"></div>
        )}
      </div>

      {/* Fixed Top Bar - Updated for V2 */}
      <div className="fixed top-0 left-0 right-0 z-[500] bg-slate-900/40 backdrop-blur-xl px-4 py-3 flex justify-between items-center shadow-2xl border-b border-white/5 pointer-events-auto">
        <div className="flex flex-col">
          <span className="text-blue-300 text-[9px] font-black tracking-widest uppercase mb-0.5">المقام الإيماني</span>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white drop-shadow-lg">{currentTitle}</h1>
            <span className="px-1.5 py-0.5 bg-blue-500/30 rounded text-[8px] text-blue-100 font-bold uppercase">V2</span>
          </div>
        </div>

        <div className="flex gap-2">
          {(['easy', 'medium', 'hard'] as const).map(d => (
            <motion.button
              whileTap={{ scale: 0.9 }}
              key={d}
              onClick={() => {
                playSound('select');
                setDifficulty(d);
                difficultyRef.current = d;
                setScore(0);
                scoreRef.current = 0;
                setLevel(1);
                levelRef.current = 1;
                isAnimatingRef.current = false;
                gameActionsRef.current?.initBoard();
              }}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                difficulty === d 
                  ? 'bg-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.5)] scale-105' 
                  : 'bg-white/5 text-white/40 hover:bg-white/10'
              }`}
            >
              {d === 'easy' ? 'سهل' : d === 'hard' ? 'صعب' : 'متوسط'}
            </motion.button>
          ))}
        </div>
        
        <div className="flex gap-2 relative z-[300]">
          <motion.button 
            whileTap={{ scale: 0.85 }}
            onClick={() => {
              playSound('select');
              const newMuted = !isMuted;
              setIsMuted(newMuted);
              isMutedRef.current = newMuted;
              if (newMuted) window.speechSynthesis?.cancel();
            }}
            className={`w-10 h-10 glass rounded-xl flex items-center justify-center transition-all relative z-[300] ${
              isMuted ? 'text-red-400 bg-red-400/10' : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </motion.button>
          <motion.button 
            whileTap={{ scale: 0.85 }}
            onClick={() => {
              playSound('select');
              setShowInfo(true);
            }}
            className="w-10 h-10 glass rounded-xl flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all hover:text-amber-400 relative z-[300]"
          >
            <Target size={18} />
          </motion.button>
          <motion.button 
            whileTap={{ scale: 0.85, rotate: 180 }}
            onClick={() => {
              playSound('select');
              isAnimatingRef.current = false;
              gameActionsRef.current?.initBoard();
            }}
            className="w-10 h-10 glass rounded-xl flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all group relative z-[300]"
          >
            <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-500" />
          </motion.button>
        </div>
      </div>
      
      <AnimatePresence>
        {floatingWords.map(w => (
          <motion.div 
            key={w.id} 
            initial={{ opacity: 0, y: 10, scale: 1, x: "-50%" }}
            animate={{ 
              opacity: [0, 1, 1, 0.8, 0],
              y: -window.innerHeight - 100,
              x: `calc(-50% + ${w.drift}px)`
            }}
            transition={{ 
              y: { duration: 8, ease: "linear" }, // Slightly faster floating
              x: { duration: 8, ease: "easeOut" },
              opacity: { duration: 8, times: [0, 0.1, 0.7, 0.9, 1] },
              scale: { duration: 0 }
            }}
            className={`fixed pointer-events-none font-black text-center z-[200] ${w.type === 'combo' ? 'text-amber-400 drop-shadow-[0_4px_15px_rgba(251,191,36,0.8)]' : 'text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.9)]'}`}
            style={{ left: w.x, top: w.y }}
          >
            {w.text.split('\n').map((line, i) => (
              <div key={i} className={w.type === 'combo' ? 'text-4xl' : 'text-2xl tracking-tighter'}>{line}</div>
            ))}
          </motion.div>
        ))}
      </AnimatePresence>
      
      {/* Game HUD */}
      <div className="z-50 relative w-full flex flex-col items-center gap-4 px-4 pt-20 max-w-lg mx-auto">

        {/* Main Stats Card - Compact Version */}
        <div className="glass w-full px-6 py-3 rounded-2xl flex items-center gap-4 pointer-events-auto relative shadow-xl border border-white/10 overflow-hidden">
          {/* Level Badge */}
          <div className="bg-gradient-to-r from-amber-600 to-amber-400 text-white text-[10px] px-3 py-0.5 rounded-full shadow-md font-black uppercase tracking-widest border border-white/20 whitespace-nowrap">
            Lvl {level}
          </div>
          
          <div className="flex-1 flex flex-col gap-1.5">
            <div className="flex justify-between items-end px-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-white leading-none">{score}</span>
                <span className="text-[10px] text-slate-500 font-bold">/ {targetScore}</span>
              </div>
              
              {/* Combo Display - Compact */}
              <AnimatePresence mode="wait">
                {combo > 1 && (
                  <motion.div 
                    key="combo"
                    initial={{ x: 10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -10, opacity: 0 }}
                    className="flex items-center gap-1 text-amber-500 font-black text-xs"
                  >
                    <Zap size={10} fill="currentColor" />
                    <span>x{combo}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden p-[1px] border border-white/5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                className={`h-full rounded-full transition-all duration-300 ${score >= targetScore ? 'bg-gradient-to-r from-amber-500 to-yellow-300' : 'bg-gradient-to-r from-green-500 to-emerald-400'}`}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full max-w-2xl mx-auto flex flex-col items-center justify-center py-4 px-2">
        {/* Board Container - Enlarged */}
        <div className="relative group w-full flex justify-center">
          <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/10 to-purple-500/10 blur-2xl opacity-50 group-hover:opacity-100 transition-opacity duration-500 rounded-[60px] pointer-events-none" />
          
          <div className="glass rounded-[56px] p-5 flex justify-center items-center shadow-[0_40px_80px_-15px_rgba(0,0,0,0.6)] border border-white/10 relative w-fit">
            <canvas 
              ref={canvasRef} 
              onContextMenu={(e) => e.preventDefault()}
              className="rounded-[36px] cursor-pointer relative z-10 touch-none select-none"
              style={{ maxWidth: '100%', maxHeight: '75vh', width: 'auto', height: 'auto', objectFit: 'contain' }}
            />
            
            {/* Help Button (No Moves Only) */}
            <AnimatePresence>
              {noMoves && (
                <motion.button
                  id="help-button"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => (window as any).triggerShuffle?.()}
                  className="absolute z-50 bg-amber-500 text-white font-bold px-8 py-4 rounded-full shadow-2xl border-4 border-white/30 flex flex-col items-center gap-1 active:bg-amber-600 transition-colors"
                >
                  <span className="text-xl">مساعدة</span>
                  <span className="text-xs opacity-90">لا توجد حركات ممكنة</span>
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Game Controls (D-Pad) */}
        <div className="mt-6 glass p-2 rounded-[32px] flex flex-col justify-center items-center shadow-lg w-max relative z-50 pointer-events-auto">
          <p className="text-[10px] text-white/50 mb-2 font-bold uppercase tracking-widest px-4">عناصر التحكم</p>
          <div className="grid grid-cols-3 grid-rows-3 gap-1">
            <div />
            <button className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 active:bg-amber-500 active:text-white transition-all transform active:scale-90" onClick={() => { playSound('select'); navigator.vibrate?.(10); gameActionsRef.current?.handleDirectionAction?.('up'); }}>
              <ArrowUp size={24} />
            </button>
            <div />
            <button className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 active:bg-amber-500 active:text-white transition-all transform active:scale-90" onClick={() => { playSound('select'); navigator.vibrate?.(10); gameActionsRef.current?.handleDirectionAction?.('left'); }}>
              <ArrowLeft size={24} />
            </button>
            <div className="w-12 h-12 flex items-center justify-center pointer-events-none">
               <div className="w-3 h-3 rounded-full bg-white/10" />
            </div>
            <button className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 active:bg-amber-500 active:text-white transition-all transform active:scale-90" onClick={() => { playSound('select'); navigator.vibrate?.(10); gameActionsRef.current?.handleDirectionAction?.('right'); }}>
              <ArrowRight size={24} />
            </button>
            <div />
            <button className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 active:bg-amber-500 active:text-white transition-all transform active:scale-90" onClick={() => { playSound('select'); navigator.vibrate?.(10); gameActionsRef.current?.handleDirectionAction?.('down'); }}>
              <ArrowDown size={24} />
            </button>
            <div />
          </div>
        </div>
        
        {/* Footer Hint */}
        <div className="mt-4 flex flex-col items-center gap-2">
          <div className="glass px-6 py-3 rounded-full text-center text-slate-400 text-xs pointer-events-auto cursor-pointer hover:bg-white/5 transition-all flex items-center gap-2 relative z-50" onClick={() => {
              isAnimatingRef.current = false;
              gameActionsRef.current?.initBoard();
          }}>
            <Target size={14} className="text-amber-500" />
            <span>طابق 3 تسبيحات أو أكثر لجمع الحسنات والترقي</span>
          </div>
          <p className="text-[10px] text-slate-500 font-medium">انقر لإعادة الترتيب إذا علقت</p>
        </div>
      </div>
      
      <AnimatePresence>
        {showLevelUp && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md px-6"
          >
            <motion.div 
              initial={{ scale: 0.8, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 1.1, y: -20, opacity: 0 }}
              className="glass p-10 rounded-[48px] flex flex-col items-center shadow-2xl border border-white/10 text-center max-w-sm w-full"
            >
              <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(245,158,11,0.3)]">
                <Trophy className="text-amber-500" size={40} />
              </div>
              
              <motion.h2 
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-4xl font-black text-white mb-2 leading-tight"
              >
                مَا شَاءَ اللَّهُ
              </motion.h2>
              
              <motion.p 
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-lg text-slate-400 font-medium"
              >
                لَا قُوَّةَ إِلَّا بِاللَّهْ
              </motion.p>
              
              <div className="w-full h-px bg-white/10 my-8" />
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex flex-col items-center"
              >
                <span className="text-[10px] text-amber-500 font-black uppercase tracking-[0.3em] mb-2">المرحلة القادمة</span>
                <span className="text-3xl font-black text-white">المستوى {Math.min(level + 1, LEVELS.length)}</span>
              </motion.div>

              <div className="mt-8 w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 0.5 }}
                  className="h-full bg-amber-500"
                />
              </div>

              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                onClick={() => {
                  const nextLevel = Math.min(levelRef.current + 1, LEVELS.length);
                  setLevel(nextLevel);
                  levelRef.current = nextLevel;
                  setShowLevelUp(false);
                  scoreRef.current = 0;
                  setScore(0);
                  gameActionsRef.current?.initBoard();
                  isAnimatingRef.current = false;
                  playSound('select');
                }}
                className="mt-8 w-full bg-amber-500 hover:bg-amber-400 text-white font-black py-4 rounded-xl transition-all active:scale-95 shadow-lg shadow-amber-500/20"
              >
                متابعة
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showInfo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/90 backdrop-blur-xl px-4"
          >
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="glass p-8 rounded-[40px] max-w-lg w-full max-h-[85vh] overflow-y-auto relative shadow-2xl border border-white/10"
            >
              <button 
                onClick={() => setShowInfo(false)}
                className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:text-white transition-colors"
              >
                ✕
              </button>

              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center">
                  <Play className="text-amber-500" size={24} fill="currentColor" />
                </div>
                <h2 className="text-3xl font-black text-white">كيفية اللعب</h2>
              </div>

              <div className="space-y-6 text-slate-300">
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 text-white font-bold">١</div>
                  <p className="leading-relaxed">قم بتبديل أماكن التسبيحات لتكوين صف أو عمود من ٣ قطع متماثلة أو أكثر.</p>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 text-white font-bold">٢</div>
                  <p className="leading-relaxed">كل مطابقة تمنحك نقاطاً وتسمعك صوت التسبيح، مما يزيد من رصيدك الإيماني والنقطي.</p>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 text-white font-bold">٣</div>
                  <p className="leading-relaxed">المطابقات المتتالية (Combos) تضاعف نقاطك وتظهر رسائل تشجيعية مباركة.</p>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 text-white font-bold">٤</div>
                  <p className="leading-relaxed">حاول الوصول للهدف المحدد في كل مرحلة للترقي لمرتبة أعلى وفتح أذكار جديدة.</p>
                </div>

                <div className="mt-10 p-6 rounded-3xl bg-amber-500/10 border border-amber-500/20">
                  <h3 className="text-amber-500 font-black mb-3">عن اللعبة</h3>
                  <p className="text-sm italic leading-relaxed">هذه اللعبة صممت لتجمع بين الترفيه والذكر، لتعينك على استحضار عظمة الله في كل حركة. نسأل الله أن يجعلها في ميزان حسناتكم.</p>
                </div>
              </div>

              <button 
                onClick={() => setShowInfo(false)}
                className="w-full mt-10 bg-white/10 hover:bg-white/20 text-white font-black py-4 rounded-3xl transition-all"
              >
                فهمت، لنبدأ!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isVictory && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/90 backdrop-blur-xl px-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="glass p-12 rounded-[60px] flex flex-col items-center text-center shadow-[0_0_50px_rgba(251,191,36,0.2)] border border-amber-500/20 max-w-md w-full relative overflow-hidden"
            >
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
              
              <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-full flex items-center justify-center mb-8 shadow-2xl">
                <Trophy className="text-white" size={48} />
              </div>

              <h2 className="text-5xl font-black text-white mb-4">تبارك الله!</h2>
              <p className="text-xl text-slate-300 mb-8 leading-relaxed">
                لقد أتممت جميع المراحل بنجاح وجمعت الكثير من الحسنات.
              </p>

              <div className="grid grid-cols-2 gap-4 w-full mb-10">
                <div className="glass p-4 rounded-3xl flex flex-col items-center">
                  <span className="text-[10px] text-slate-500 font-black uppercase mb-1">المجموع النهائي</span>
                  <span className="text-2xl font-black text-white">{score}</span>
                </div>
                <div className="glass p-4 rounded-3xl flex flex-col items-center">
                  <span className="text-[10px] text-slate-500 font-black uppercase mb-1">المستوى</span>
                  <span className="text-2xl font-black text-white">{level}</span>
                </div>
              </div>

              <button 
                onClick={() => {
                  setScore(0);
                  scoreRef.current = 0;
                  setLevel(1);
                  levelRef.current = 1;
                  setIsVictory(false);
                  gameActionsRef.current?.initBoard();
                  isAnimatingRef.current = false;
                }}
                className="w-full bg-amber-500 hover:bg-amber-400 text-white font-black py-5 rounded-3xl transition-all shadow-xl shadow-amber-500/20 active:scale-95"
              >
                العب مرة أخرى
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
