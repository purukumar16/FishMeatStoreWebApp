import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCw, MoveHorizontal, MousePointerClick } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export interface Fish360ViewerProps {
  /**
   * Optional array of 36 sequential image URLs (frame 1 to frame 36).
   * When omitted, all 11 real fish cutouts are rendered in a silky-smooth
   * continuous 60fps slow-pace vertically hanging 360-degree carousel.
   */
  frames?: string[];
  /** Auto-spin speed in virtual frames per second (default: 1.25 fps = 50% slower, ~28.8s/rev) */
  autoSpinFps?: number;
  className?: string;
}

const TOTAL_FRAMES = 36;
const FRAME_WIDTH = 960;
const FRAME_HEIGHT = 540;

interface RealFishSpec {
  id: string;
  productId: string;
  name: string;
  src: string;
  /** Which horizontal edge the fish head faces in its source photo */
  facing: 'left' | 'right';
  phaseOffsetDeg: number;
  baseHeightPx: number;
  pendulumPhase: number;
}

const RAW_FISH_LIST: Omit<RealFishSpec, 'phaseOffsetDeg' | 'pendulumPhase'>[] = [
  {
    id: 'salmon',
    productId: 'fish-seawater-salmon',
    name: 'Atlantic Salmon',
    src: '/assets/aistudio/640x427-Salmon-Atlantic-NOAAFisheries_7724daba.png',
    facing: 'left',
    baseHeightPx: 174,
  },
  {
    id: 'indian-salmon',
    productId: 'fish-seawater-indian-salmon-whole',
    name: 'Indian Salmon',
    src: '/assets/aistudio/indian-salmon-fish_093f7869.jpeg',
    facing: 'right',
    baseHeightPx: 176,
  },
  {
    id: 'silver-pomfret',
    productId: 'fish-seawater-pomfret',
    name: 'Silver Pomfret',
    src: '/assets/aistudio/SilverPompfret_1348ba23.jpeg',
    facing: 'left',
    baseHeightPx: 152,
  },
  {
    id: 'black-pomfret',
    productId: 'fish-seawater-black-pomfret-whole',
    name: 'Black Pomfret',
    src: '/assets/aistudio/black-pomfret-fish_bf36d414.jpg',
    facing: 'left',
    baseHeightPx: 156,
  },
  {
    id: 'surmai',
    productId: 'fish-seawater-kingfish',
    name: 'Surmai (Seer)',
    src: '/assets/aistudio/surmai-seer-fish_5dd1565f.jpg',
    facing: 'left',
    baseHeightPx: 186,
  },
  {
    id: 'hilsa',
    productId: 'fish-seawater-hilsa',
    name: 'Hilsa',
    src: '/assets/aistudio/HIlsa_958615d1.jpeg',
    facing: 'right',
    baseHeightPx: 174,
  },
  {
    id: 'yellowfin-tuna',
    productId: 'fish-seawater-yellowfin-tuna',
    name: 'Yellowfin Tuna',
    src: '/assets/aistudio/YellowTuna_5c01d162.jpeg',
    facing: 'left',
    baseHeightPx: 172,
  },
  {
    id: 'catla',
    productId: 'fish-freshwater-catla',
    name: 'Catla',
    src: '/assets/aistudio/catla_eb8dcb54.jpeg',
    facing: 'right',
    baseHeightPx: 170,
  },
  {
    id: 'bhetki',
    productId: 'fish-seawater-bhetki-whole',
    name: 'Bhetki',
    src: '/assets/aistudio/bhetki_68e96255.jpg',
    facing: 'left',
    baseHeightPx: 172,
  },
  {
    id: 'indian-baasa',
    productId: 'fish-freshwater-basa-whole',
    name: 'Indian Baasa',
    src: '/assets/aistudio/IndianBaasa_4c7b3c24.jpeg',
    facing: 'left',
    baseHeightPx: 174,
  },
  {
    id: 'indian-mackerel',
    productId: 'fish-seawater-mackerel-whole',
    name: 'Indian Mackerel',
    src: '/assets/aistudio/Indian_mackerel_8b06ef78.jpg',
    facing: 'left',
    baseHeightPx: 164,
  },
];

const ROTATING_REAL_FISH: RealFishSpec[] = RAW_FISH_LIST.map((fish, idx) => ({
  ...fish,
  phaseOffsetDeg: (idx / RAW_FISH_LIST.length) * 360,
  pendulumPhase: (idx / RAW_FISH_LIST.length) * Math.PI * 2,
}));

interface FishHitBox {
  spec: RealFishSpec;
  depth: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

interface DrawTransform {
  offsetX: number;
  offsetY: number;
  drawW: number;
  drawH: number;
  srcW: number;
  srcH: number;
}

interface ExtractedSprite {
  spec: RealFishSpec;
  canvas: HTMLCanvasElement;
}

/**
 * Loads an image from URL/path cleanly.
 */
function loadImageAsset(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith('data:') && !src.startsWith('/')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

/**
 * Extracts a crisp, tight transparent sprite canvas from a fish cutout image:
 * - Preserves up to 640px resolution for sharp scale and fin detail.
 * - Samples corner luminance to distinguish pure-white backdrops from studio-gray sweeps.
 * - Uses edge-seeded BFS flood fill so bright silver bellies stay completely intact.
 * - Strips small detached peripheral text/artifacts via 8-neighbor CC filtering.
 */
function extractFishSprite(img: HTMLImageElement): HTMLCanvasElement {
  const maxDim = 640;
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));

  const workCanvas = document.createElement('canvas');
  workCanvas.width = w;
  workCanvas.height = h;
  const ctx = workCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return workCanvas;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, h);

  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const totalPixels = w * h;

  const lumArr = new Float32Array(totalPixels);
  for (let i = 0; i < totalPixels; i++) {
    const off = i * 4;
    lumArr[i] = 0.299 * data[off] + 0.587 * data[off + 1] + 0.114 * data[off + 2];
  }

  // Local 4-neighbor luminance step to distinguish smooth studio sweep shadows from textured scales/fins
  const texArr = new Float32Array(totalPixels);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const l = lumArr[i];
      texArr[i] = Math.max(
        Math.abs(l - lumArr[i - 1]),
        Math.abs(l - lumArr[i + 1]),
        Math.abs(l - lumArr[i - w]),
        Math.abs(l - lumArr[i + w])
      );
    }
  }

  const cornerCoords = [
    0,
    w - 1,
    (h - 1) * w,
    (h - 1) * w + (w - 1),
    Math.floor(w / 2),
    (h - 1) * w + Math.floor(w / 2),
  ];
  let cornerMinLum = 255;
  let hasTransparentBorder = false;
  let avgCornerR = 0;
  let avgCornerB = 0;
  let opaqueCornerCount = 0;

  for (const idx of cornerCoords) {
    const off = idx * 4;
    if (data[off + 3] < 25) {
      hasTransparentBorder = true;
      continue;
    }
    const lum = lumArr[idx];
    if (lum < cornerMinLum) cornerMinLum = lum;
    avgCornerR += data[off];
    avgCornerB += data[off + 2];
    opaqueCornerCount += 1;
  }

  const isPureWhiteBackdrop = hasTransparentBorder || cornerMinLum >= 245;
  const coolTint = opaqueCornerCount > 0 ? (avgCornerB - avgCornerR) / opaqueCornerCount : 0;
  const isCoolStudioSweep = !isPureWhiteBackdrop && coolTint >= 3;
  const isNeutralStudioSweep = !isPureWhiteBackdrop && !isCoolStudioSweep && cornerMinLum < 238;
  const lumThreshold = isPureWhiteBackdrop ? 236 : Math.max(194, cornerMinLum - 14);
  const chromaThreshold = isPureWhiteBackdrop ? 15 : 22;

  const isBgPixel = (pixelIdx: number): boolean => {
    const off = pixelIdx * 4;
    const a = data[off + 3];
    if (a < 25) return true;
    const r = data[off];
    const g = data[off + 1];
    const b = data[off + 2];
    const maxC = r > g ? (r > b ? r : b) : g > b ? g : b;
    const minC = r < g ? (r < b ? r : b) : g < b ? g : b;
    const lum = lumArr[pixelIdx];
    const chroma = maxC - minC;

    if (isCoolStudioSweep) {
      // Smooth cool blue-gray studio sweep & cast shadow: preserves warm/neutral silver bellies & scales
      return lum >= 165 && chroma <= 34 && b - r >= 2 && texArr[pixelIdx] <= 13;
    }

    if (isNeutralStudioSweep) {
      // Studio sweep backdrop + smooth achromatic cast shadows below belly & fins
      return (
        (lum >= lumThreshold && chroma <= chromaThreshold) ||
        (lum >= 135 && chroma <= 9 && texArr[pixelIdx] <= 11)
      );
    }

    return lum >= lumThreshold && chroma <= chromaThreshold;
  };

  const bgMask = new Uint8Array(totalPixels);
  const queue = new Int32Array(totalPixels);
  let head = 0;
  let tail = 0;

  const seed = (idx: number) => {
    if (bgMask[idx] === 0 && isBgPixel(idx)) {
      bgMask[idx] = 1;
      queue[tail++] = idx;
    }
  };

  for (let x = 0; x < w; x++) {
    seed(x);
    seed((h - 1) * w + x);
  }
  for (let y = 1; y < h - 1; y++) {
    seed(y * w);
    seed(y * w + (w - 1));
  }

  while (head < tail) {
    const idx = queue[head++];
    const x = idx % w;
    const y = (idx - x) / w;

    if (x > 0) seed(idx - 1);
    if (x < w - 1) seed(idx + 1);
    if (y > 0) seed(idx - w);
    if (y < h - 1) seed(idx + w);
  }

  for (let i = 0; i < totalPixels; i++) {
    if (bgMask[i] === 1) {
      data[i * 4 + 3] = 0;
    }
  }

  const compId = new Int32Array(totalPixels);
  const compAreas: number[] = [0];
  let currentComp = 0;

  for (let i = 0; i < totalPixels; i++) {
    if (data[i * 4 + 3] >= 25 && compId[i] === 0) {
      currentComp += 1;
      let area = 0;
      head = 0;
      tail = 0;
      compId[i] = currentComp;
      queue[tail++] = i;

      while (head < tail) {
        const cur = queue[head++];
        area += 1;
        const cx = cur % w;
        const cy = (cur - cx) / w;

        for (let dy = -1; dy <= 1; dy++) {
          const ny = cy + dy;
          if (ny < 0 || ny >= h) continue;
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = cx + dx;
            if (nx < 0 || nx >= w) continue;
            const nIdx = ny * w + nx;
            if (compId[nIdx] === 0 && data[nIdx * 4 + 3] >= 25) {
              compId[nIdx] = currentComp;
              queue[tail++] = nIdx;
            }
          }
        }
      }

      compAreas.push(area);
    }
  }

  let maxArea = 0;
  for (let c = 1; c < compAreas.length; c++) {
    if (compAreas[c] > maxArea) maxArea = compAreas[c];
  }

  const minKeepArea = Math.max(80, maxArea * 0.025);
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;

  for (let i = 0; i < totalPixels; i++) {
    const cid = compId[i];
    if (cid === 0 || compAreas[cid] < minKeepArea) {
      data[i * 4 + 3] = 0;
      bgMask[i] = 1;
      continue;
    }

    const x = i % w;
    const y = (i - x) / w;

    const touchesBg =
      (x > 0 && bgMask[i - 1] === 1) ||
      (x < w - 1 && bgMask[i + 1] === 1) ||
      (y > 0 && bgMask[i - w] === 1) ||
      (y < h - 1 && bgMask[i + w] === 1);

    if (touchesBg) {
      const off = i * 4;
      const r = data[off];
      const g = data[off + 1];
      const b = data[off + 2];
      const lum = lumArr[i];
      const chroma = Math.max(r, g, b) - Math.min(r, g, b);
      if (lum > 190 || (isNeutralStudioSweep && lum > 145 && chroma <= 12)) {
        data[off + 3] = Math.round(data[off + 3] * 0.45);
      }
    }

    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  ctx.putImageData(imageData, 0, 0);

  if (maxX < minX || maxY < minY) {
    return workCanvas;
  }

  const pad = 2;
  const sx = Math.max(0, minX - pad);
  const sy = Math.max(0, minY - pad);
  const sw = Math.min(w - sx, maxX - minX + 1 + pad * 2);
  const sh = Math.min(h - sy, maxY - minY + 1 + pad * 2);

  const cropped = document.createElement('canvas');
  cropped.width = sw;
  cropped.height = sh;
  const croppedCtx = cropped.getContext('2d');
  if (croppedCtx) {
    croppedCtx.drawImage(workCanvas, sx, sy, sw, sh, 0, 0, sw, sh);
  }
  return cropped;
}

/**
 * Helper to draw a crisp rounded nameplate box.
 */
function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Pre-bakes the static deep-ocean showcase backdrop and rear overhead stainless rail.
 */
function createStaticBackdropCanvas(): HTMLCanvasElement {
  const bgCanvas = document.createElement('canvas');
  bgCanvas.width = FRAME_WIDTH;
  bgCanvas.height = FRAME_HEIGHT;
  const ctx = bgCanvas.getContext('2d');
  if (!ctx) return bgCanvas;

  const railCx = FRAME_WIDTH * 0.5;
  const railCy = 88;
  const rx = 340;
  const ry = 46;

  // Deep ocean chilled showcase gradient
  const bgGrad = ctx.createRadialGradient(
    railCx,
    FRAME_HEIGHT * 0.48,
    30,
    railCx,
    FRAME_HEIGHT * 0.52,
    FRAME_WIDTH * 0.68
  );
  bgGrad.addColorStop(0, '#0f608f');
  bgGrad.addColorStop(0.55, '#073859');
  bgGrad.addColorStop(1, '#03192c');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, FRAME_WIDTH, FRAME_HEIGHT);

  // Subtle chilled ice floor sheen beneath hanging fishes
  const floorGrad = ctx.createLinearGradient(0, FRAME_HEIGHT * 0.72, 0, FRAME_HEIGHT);
  floorGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
  floorGrad.addColorStop(0.6, 'rgba(14, 116, 144, 0.18)');
  floorGrad.addColorStop(1, 'rgba(2, 24, 43, 0.78)');
  ctx.fillStyle = floorGrad;
  ctx.fillRect(0, FRAME_HEIGHT * 0.72, FRAME_WIDTH, FRAME_HEIGHT * 0.28);

  return bgCanvas;
}

/**
 * Renders one continuous 960x540 scene at any floating-point framePosition (0..36)
 * with all 11 fish hanging vertically upside-down (tail UP, head DOWN), slow smooth rotation,
 * pronounced front sizing, and clean depth-aware nameplates below each fish.
 */
function renderCarouselScene(
  ctx: CanvasRenderingContext2D,
  bgCanvas: HTMLCanvasElement,
  framePosition: number,
  sprites: ExtractedSprite[],
  hoveredFishId: string | null
): FishHitBox[] {
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Instant blit of pre-rendered static ocean backdrop + rear rail
  ctx.drawImage(bgCanvas, 0, 0, FRAME_WIDTH, FRAME_HEIGHT);

  const railCx = FRAME_WIDTH * 0.5;
  const railCy = 88;
  const rx = 340;
  const ry = 46;
  const baseAngleRad = (framePosition / TOTAL_FRAMES) * Math.PI * 2;

  const placements = sprites.map(({ spec, canvas }) => {
    const theta = baseAngleRad + (spec.phaseOffsetDeg * Math.PI) / 180;
    const hookX = railCx + rx * Math.cos(theta);
    const hookY = railCy + ry * Math.sin(theta);

    // depth = -1 (back of carousel) to +1 (front center foreground)
    const depth = Math.sin(theta);
    const t = (depth + 1) / 2;

    // Prominent 3D foreground enlargement (~3x bigger in front than at the back)
    const perspectiveScale = 0.46 + Math.pow(t, 1.3) * 0.92; // 0.46 .. 1.38
    const cordLen = 14 + t * 18;

    const hangH = spec.baseHeightPx * perspectiveScale;
    const hangW = (hangH * canvas.height) / Math.max(1, canvas.width);
    const centerY = hookY + cordLen + hangH * 0.5;
    const swayRad = Math.sin(baseAngleRad * 2 + spec.pendulumPhase) * 0.032;

    // Compute nameplate geometry right below tail tip
    const isHovered = hoveredFishId === spec.id;
    const isFront = depth >= 0.15;
    const fontSize = isHovered ? 13 : isFront ? 12.5 : depth >= -0.25 ? 10.5 : 9.5;
    const padX = isFront || isHovered ? 9 : 7;
    const tagH = isFront || isHovered ? 24 : 20;

    ctx.save();
    ctx.font = `${isFront || isHovered ? '700' : '600'} ${fontSize}px ui-sans-serif, system-ui, -apple-system, sans-serif`;
    const textW = ctx.measureText(spec.name).width;
    ctx.restore();

    const tagW = textW + padX * 2 + (isFront || isHovered ? 10 : 0);
    const rawTagX = hookX - tagW / 2;
    const tagX = Math.max(14, Math.min(FRAME_WIDTH - tagW - 14, rawTagX));
    const tagY = Math.min(FRAME_HEIGHT - 64 - tagH, hookY + cordLen + hangH + 8);

    const hitBox: FishHitBox = {
      spec,
      depth,
      minX: Math.min(hookX - Math.max(32, hangW * 0.58), tagX),
      maxX: Math.max(hookX + Math.max(32, hangW * 0.58), tagX + tagW),
      minY: hookY + cordLen,
      maxY: Math.max(hookY + cordLen + hangH, tagY + tagH),
    };

    return {
      spec,
      canvas,
      hookX,
      hookY,
      cordLen,
      centerY,
      hangW,
      hangH,
      swayRad,
      depth,
      t,
      alpha: isHovered ? 1 : 0.78 + t * 0.22,
      isHovered,
      isFront,
      fontSize,
      tagX,
      tagY,
      tagW,
      tagH,
      padX,
      hitBox,
    };
  });

  // Sort back-to-front for accurate depth overlap
  placements.sort((a, b) => a.depth - b.depth);

  const backFishes = placements.filter((p) => p.depth < 0);
  const frontFishes = placements.filter((p) => p.depth >= 0);

  const drawHangingFish = (item: (typeof placements)[number]) => {
    const {
      spec,
      canvas,
      hookX,
      hookY,
      cordLen,
      centerY,
      hangW,
      hangH,
      swayRad,
      alpha,
      isHovered,
      isFront,
      fontSize,
      tagX,
      tagY,
      tagW,
      tagH,
      padX,
      t,
    } = item;

    ctx.save();
    ctx.globalAlpha = alpha;

    // Soft ice floor shadow directly below each spinning fish
    ctx.save();
    ctx.fillStyle = `rgba(2, 16, 30, ${(0.22 + t * 0.16).toFixed(2)})`;
    ctx.beginPath();
    ctx.ellipse(
      hookX,
      Math.min(FRAME_HEIGHT - 36, centerY + hangH * 0.54 + 12),
      Math.max(16, hangW * 0.42),
      Math.max(3.5, hangW * 0.11),
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.restore();

    // Draw fish hanging VERTICALLY upside-down (tail UP, head DOWN)
    // Canvas rotate(-PI/2) puts left-facing head DOWN (+Y) & tail UP (-Y);
    // rotate(+PI/2) puts right-facing head DOWN (+Y) & tail UP (-Y).
    ctx.save();
    ctx.translate(hookX, hookY + cordLen);
    ctx.rotate(swayRad);
    ctx.translate(0, hangH * 0.5);
    ctx.rotate(spec.facing === 'right' ? Math.PI / 2 : -Math.PI / 2);

    ctx.shadowColor = isHovered ? 'rgba(52, 211, 153, 0.55)' : 'rgba(2, 18, 36, 0.6)';
    ctx.shadowBlur = isHovered ? 20 : 14;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 5;

    ctx.drawImage(canvas, -hangH / 2, -hangW / 2, hangH, hangW);
    ctx.restore();

    // Clean, legible floating nameplate directly beneath the hanging fish
    ctx.save();
    const labelAlpha = isHovered ? 1 : isFront ? 0.96 : 0.62 + t * 0.3;
    ctx.globalAlpha = labelAlpha;

    drawRoundedRectPath(ctx, tagX, tagY, tagW, tagH, 6);
    ctx.fillStyle = isHovered
      ? 'rgba(6, 78, 59, 0.94)'
      : isFront
        ? 'rgba(3, 21, 37, 0.90)'
        : 'rgba(3, 21, 37, 0.72)';
    ctx.fill();

    ctx.lineWidth = isHovered ? 1.5 : 1;
    ctx.strokeStyle = isHovered
      ? '#34d399'
      : isFront
        ? 'rgba(103, 232, 249, 0.55)'
        : 'rgba(125, 211, 252, 0.25)';
    ctx.stroke();

    let textOffsetX = tagX + padX;
    if (isFront || isHovered) {
      ctx.fillStyle = isHovered ? '#6ee7b7' : '#34d399';
      ctx.beginPath();
      ctx.arc(tagX + padX + 3, tagY + tagH / 2, 2.5, 0, Math.PI * 2);
      ctx.fill();
      textOffsetX += 10;
    }

    ctx.font = `${isFront || isHovered ? '700' : '600'} ${fontSize}px ui-sans-serif, system-ui, -apple-system, sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isHovered ? '#ffffff' : isFront ? '#f0f9ff' : '#bae6fd';
    ctx.fillText(spec.name, textOffsetX, tagY + tagH / 2 + 0.5);
    ctx.restore();

    ctx.restore();
  };

  backFishes.forEach(drawHangingFish);

  frontFishes.forEach(drawHangingFish);

  // Seamless mist / bubble shimmer particles slowly drifting
  for (let bIdx = 0; bIdx < 12; bIdx++) {
    const bAngle = baseAngleRad + (bIdx / 12) * Math.PI * 2;
    const bx = railCx + (rx * 0.92 + (bIdx % 3) * 14) * Math.cos(bAngle);
    const by = FRAME_HEIGHT * 0.56 + 95 * Math.sin(bAngle) - ((bIdx * 4) % 18);
    ctx.fillStyle = `rgba(186, 230, 253, ${(0.16 + (bIdx % 3) * 0.08).toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(bx, by, 1.8 + (bIdx % 2) * 1.1, 0, Math.PI * 2);
    ctx.fill();
  }

  // Front-to-back hit-boxes so clicks always pick the frontmost overlapping fish
  return [...placements].reverse().map((p) => p.hitBox);
}

export const Fish360Viewer: React.FC<Fish360ViewerProps> = ({
  frames,
  autoSpinFps = 1.25,
  className = '',
}) => {
  const { products, setSelectedProductForDetail } = useStore();
  const totalFrames = frames?.length || TOTAL_FRAMES;
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isAutoSpin, setIsAutoSpin] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true;
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredFish, setHoveredFish] = useState<RealFishSpec | null>(null);
  const [loadedCount, setLoadedCount] = useState(0);
  const [hasLoadError, setHasLoadError] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const externalFramesRef = useRef<(HTMLImageElement | null)[]>([]);
  const extractedSpritesRef = useRef<ExtractedSprite[]>([]);
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const liveHitBoxesRef = useRef<FishHitBox[]>([]);
  const hoveredFishIdRef = useRef<string | null>(null);

  const drawTransformRef = useRef<DrawTransform>({
    offsetX: 0,
    offsetY: 0,
    drawW: FRAME_WIDTH,
    drawH: FRAME_HEIGHT,
    srcW: FRAME_WIDTH,
    srcH: FRAME_HEIGHT,
  });

  const dragStartXRef = useRef(0);
  const dragStartYRef = useRef(0);
  const dragResidualPxRef = useRef(0);
  const pointerDownActiveRef = useRef(false);
  const hasMovedBeyondTapRef = useRef(false);
  const lastDragTimeRef = useRef(0);
  const velocityFramesPerSecRef = useRef(0);
  const virtualFrameRef = useRef(0);

  const isLoading = loadedCount < totalFrames;
  const loadPercent = Math.min(100, Math.round((loadedCount / totalFrames) * 100));

  const normalizeFrame = useCallback(
    (idx: number) => ((idx % totalFrames) + totalFrames) % totalFrames,
    [totalFrames]
  );

  useEffect(() => {
    hoveredFishIdRef.current = hoveredFish?.id || null;
  }, [hoveredFish]);

  // Render scene cleanly onto HiDPI display canvas at any continuous framePosition
  const drawAtPosition = useCallback(
    (framePosition: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const targetW = Math.round(rect.width * dpr);
      const targetH = Math.round(rect.height * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // External pre-supplied 36 frame URLs mode
      if (frames && frames.length > 0) {
        const safeIdx = normalizeFrame(Math.round(framePosition));
        const img = externalFramesRef.current[safeIdx];
        if (!img || !img.complete || img.naturalWidth === 0) return;

        const srcW = img.naturalWidth;
        const srcH = img.naturalHeight;
        const canvasAspect = canvas.width / canvas.height;
        const srcAspect = srcW / srcH;

        let drawW = canvas.width;
        let drawH = canvas.height;
        let offsetX = 0;
        let offsetY = 0;

        if (canvasAspect > srcAspect) {
          drawW = canvas.width;
          drawH = canvas.width / srcAspect;
          offsetY = (canvas.height - drawH) / 2;
        } else {
          drawH = canvas.height;
          drawW = canvas.height * srcAspect;
          offsetX = (canvas.width - drawW) * 0.5;
        }

        drawTransformRef.current = { offsetX, offsetY, drawW, drawH, srcW, srcH };
        ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
        return;
      }

      // Continuous 60fps 11-fish hanging carousel mode
      const sprites = extractedSpritesRef.current;
      if (sprites.length === 0) return;
      if (!bgCanvasRef.current) {
        bgCanvasRef.current = createStaticBackdropCanvas();
      }

      // Render logical 960x540 scene onto offscreen buffer or directly scaled onto HiDPI canvas
      const canvasAspect = canvas.width / canvas.height;
      const srcAspect = FRAME_WIDTH / FRAME_HEIGHT;

      let drawW = canvas.width;
      let drawH = canvas.height;
      let offsetX = 0;
      let offsetY = 0;

      if (canvasAspect > srcAspect) {
        drawW = canvas.width;
        drawH = canvas.width / srcAspect;
        offsetY = (canvas.height - drawH) / 2;
      } else {
        drawH = canvas.height;
        drawW = canvas.height * srcAspect;
        offsetX = (canvas.width - drawW) * 0.5;
      }

      drawTransformRef.current = {
        offsetX,
        offsetY,
        drawW,
        drawH,
        srcW: FRAME_WIDTH,
        srcH: FRAME_HEIGHT,
      };

      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(drawW / FRAME_WIDTH, drawH / FRAME_HEIGHT);
      liveHitBoxesRef.current = renderCarouselScene(
        ctx,
        bgCanvasRef.current,
        framePosition,
        sprites,
        hoveredFishIdRef.current
      );
      ctx.restore();
    },
    [frames, normalizeFrame]
  );

  // Hit-test a pointer client coordinate against the currently visible hanging fish & nameplates
  const hitTestFish = useCallback((clientX: number, clientY: number): RealFishSpec | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;

    const dpr = canvas.width / rect.width;
    const canvasX = (clientX - rect.left) * dpr;
    const canvasY = (clientY - rect.top) * dpr;

    const { offsetX, offsetY, drawW, drawH, srcW, srcH } = drawTransformRef.current;
    if (drawW <= 0 || drawH <= 0) return null;

    const sceneX = ((canvasX - offsetX) / drawW) * srcW;
    const sceneY = ((canvasY - offsetY) / drawH) * srcH;

    for (const box of liveHitBoxesRef.current) {
      if (
        sceneX >= box.minX &&
        sceneX <= box.maxX &&
        sceneY >= box.minY &&
        sceneY <= box.maxY
      ) {
        return box.spec;
      }
    }
    return null;
  }, []);

  // Open matched catalog product modal on click
  const openFishProduct = useCallback(
    (spec: RealFishSpec) => {
      const matched =
        products.find((p) => p.id === spec.productId) ||
        products.find((p) =>
          p.name.toLowerCase().includes(spec.name.split(' ')[0].toLowerCase())
        );
      if (matched) {
        setSelectedProductForDetail(matched);
      }
    },
    [products, setSelectedProductForDetail]
  );

  // Preload all 11 real fish cutouts (or external 36 frames) cleanly with progress bar
  useEffect(() => {
    let isCancelled = false;
    externalFramesRef.current = new Array(totalFrames).fill(null);
    extractedSpritesRef.current = [];
    liveHitBoxesRef.current = [];
    setLoadedCount(0);
    setHasLoadError(false);

    if (frames && frames.length > 0) {
      let completed = 0;
      let errors = 0;

      frames.forEach((src, index) => {
        const img = new Image();
        if (!src.startsWith('data:') && !src.startsWith('/')) {
          img.crossOrigin = 'anonymous';
        }

        const handleDone = (errored: boolean) => {
          if (isCancelled) return;
          completed += 1;
          if (errored) errors += 1;
          externalFramesRef.current[index] = errored ? null : img;
          setLoadedCount(completed);
          if (errors === totalFrames) {
            setHasLoadError(true);
          }
          if (index === Math.round(virtualFrameRef.current) || completed === 1) {
            drawAtPosition(virtualFrameRef.current);
          }
        };

        img.onload = () => handleDone(false);
        img.onerror = () => handleDone(true);
        img.src = src;
      });

      return () => {
        isCancelled = true;
      };
    }

    const loadSprites = async () => {
      try {
        bgCanvasRef.current = createStaticBackdropCanvas();
        let assetsLoaded = 0;
        const sprites: ExtractedSprite[] = [];

        await Promise.all(
          ROTATING_REAL_FISH.map(async (spec) => {
            const img = await loadImageAsset(spec.src);
            if (isCancelled) return;
            const spriteCanvas = extractFishSprite(img);
            sprites.push({ spec, canvas: spriteCanvas });
            assetsLoaded += 1;
            const progressFrames = Math.min(
              TOTAL_FRAMES,
              Math.round((assetsLoaded / ROTATING_REAL_FISH.length) * TOTAL_FRAMES)
            );
            setLoadedCount(progressFrames);
          })
        );

        if (isCancelled) return;

        extractedSpritesRef.current = ROTATING_REAL_FISH.map(
          (spec) => sprites.find((s) => s.spec.id === spec.id)!
        ).filter(Boolean);

        setLoadedCount(TOTAL_FRAMES);
        drawAtPosition(virtualFrameRef.current);
      } catch {
        if (!isCancelled) {
          setHasLoadError(true);
        }
      }
    };

    loadSprites();

    return () => {
      isCancelled = true;
    };
  }, [frames, totalFrames, drawAtPosition]);

  // Redraw immediately if hover state changes while paused
  useEffect(() => {
    if (!isLoading && !hasLoadError) {
      drawAtPosition(virtualFrameRef.current);
    }
  }, [hoveredFish, isLoading, hasLoadError, drawAtPosition]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => {
      drawAtPosition(virtualFrameRef.current);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [drawAtPosition]);

  // Continuous 60fps silky-smooth & slow rotation + inertia loop
  useEffect(() => {
    if (isLoading || hasLoadError) return;

    let rafId = 0;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.08);
      lastTime = now;

      if (!isDragging) {
        let deltaFrames = 0;

        if (Math.abs(velocityFramesPerSecRef.current) > 0.12) {
          deltaFrames = velocityFramesPerSecRef.current * dt;
          velocityFramesPerSecRef.current *= Math.pow(0.06, dt);
        } else if (isAutoSpin) {
          velocityFramesPerSecRef.current = 0;
          deltaFrames = autoSpinFps * dt;
        }

        if (deltaFrames !== 0) {
          virtualFrameRef.current =
            ((virtualFrameRef.current + deltaFrames) % totalFrames + totalFrames) % totalFrames;
          drawAtPosition(virtualFrameRef.current);

          const nextDiscrete = normalizeFrame(Math.floor(virtualFrameRef.current));
          setCurrentFrame((prev) => (prev === nextDiscrete ? prev : nextDiscrete));
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [
    isAutoSpin,
    isDragging,
    isLoading,
    hasLoadError,
    autoSpinFps,
    totalFrames,
    normalizeFrame,
    drawAtPosition,
  ]);

  // Pointer drag / touch swipe / fish click detection
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    pointerDownActiveRef.current = true;
    hasMovedBeyondTapRef.current = false;
    dragStartXRef.current = e.clientX;
    dragStartYRef.current = e.clientY;
    dragResidualPxRef.current = 0;
    velocityFramesPerSecRef.current = 0;
    lastDragTimeRef.current = performance.now();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerDownActiveRef.current) {
      if (!isLoading) {
        const hit = hitTestFish(e.clientX, e.clientY);
        setHoveredFish((prev) => (prev?.id === hit?.id ? prev : hit));
      }
      return;
    }

    const totalMoved = Math.hypot(
      e.clientX - dragStartXRef.current,
      e.clientY - dragStartYRef.current
    );

    if (!hasMovedBeyondTapRef.current) {
      if (totalMoved < 6) return;
      hasMovedBeyondTapRef.current = true;
      setIsDragging(true);
      dragStartXRef.current = e.clientX;
    }

    const now = performance.now();
    const dt = Math.max((now - lastDragTimeRef.current) / 1000, 0.008);
    lastDragTimeRef.current = now;

    const containerWidth = containerRef.current?.clientWidth || 360;
    const pxPerFrame = Math.max(6, (containerWidth * 0.85) / totalFrames);

    const deltaX = e.clientX - dragStartXRef.current;
    dragStartXRef.current = e.clientX;
    dragResidualPxRef.current += deltaX;

    const frameDelta = dragResidualPxRef.current / pxPerFrame;
    if (Math.abs(frameDelta) >= 0.02) {
      dragResidualPxRef.current = 0;
      velocityFramesPerSecRef.current = Math.max(-24, Math.min(24, frameDelta / dt));
      virtualFrameRef.current =
        ((virtualFrameRef.current + frameDelta) % totalFrames + totalFrames) % totalFrames;
      drawAtPosition(virtualFrameRef.current);
      const discrete = normalizeFrame(Math.round(virtualFrameRef.current));
      setCurrentFrame((prev) => (prev === discrete ? prev : discrete));
    }
  };

  const handlePointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    const wasClickTap = pointerDownActiveRef.current && !hasMovedBeyondTapRef.current;
    pointerDownActiveRef.current = false;
    setIsDragging(false);

    if (wasClickTap && !isLoading) {
      const hit = hitTestFish(e.clientX, e.clientY);
      if (hit) {
        openFishProduct(hit);
      }
    }
  };

  const handlePointerLeave = () => {
    setHoveredFish(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      setIsAutoSpin(false);
      const next = normalizeFrame(currentFrame + 1);
      virtualFrameRef.current = next;
      drawAtPosition(next);
      setCurrentFrame(next);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      setIsAutoSpin(false);
      const prev = normalizeFrame(currentFrame - 1);
      virtualFrameRef.current = prev;
      drawAtPosition(prev);
      setCurrentFrame(prev);
    } else if (e.key === ' ') {
      e.preventDefault();
      setIsAutoSpin((prev) => !prev);
    }
  };

  const toggleAutoSpin = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAutoSpin((prev) => !prev);
  };

  const degreeAngle = Math.round((currentFrame / totalFrames) * 360);
  const frontFish = liveHitBoxesRef.current[0]?.spec || null;

  return (
    <div
      ref={containerRef}
      role="slider"
      tabIndex={0}
      aria-label="360-degree interactive spinning catch showcase featuring 11 fishes. Click any fish to view item details."
      aria-valuemin={1}
      aria-valuemax={totalFrames}
      aria-valuenow={currentFrame + 1}
      aria-valuetext={`Frame ${currentFrame + 1} of ${totalFrames}, ${degreeAngle} degrees`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onPointerLeave={handlePointerLeave}
      onKeyDown={handleKeyDown}
      className={`relative rounded-2xl overflow-hidden border border-cyan-500/30 shadow-2xl bg-[#03192c] aspect-[4/3] sm:aspect-[16/9] min-h-[250px] sm:min-h-0 select-none touch-pan-y outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
        isDragging ? 'cursor-grabbing' : hoveredFish ? 'cursor-pointer' : 'cursor-grab'
      } ${className}`}
    >
      {/* 60fps Continuous Carousel Canvas */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="w-full h-full block max-w-full"
      />

      {/* Compact Top-Left Showcase Title */}
      <div className="pointer-events-none absolute top-2.5 left-2.5 sm:top-3.5 sm:left-3.5 bg-[#031829]/80 backdrop-blur-md border border-cyan-400/25 rounded-lg px-2.5 sm:px-3 py-1.5 space-y-0.5 max-w-[60%] sm:max-w-xs">
        <p className="text-[11px] font-semibold tracking-wide text-cyan-300">
          360° Catch Showcase · 11 Cuts
        </p>
        <p className="font-display text-xs sm:text-sm font-bold text-white leading-snug">
          Fresh Catch · Chilled at 0°C – 4°C
        </p>
      </div>

      {/* Top Right Degree / Frame Telemetry (Tabular Numerals) */}
      <div className="pointer-events-none absolute top-2.5 right-2.5 sm:top-3.5 sm:right-3.5 bg-[#031829]/80 backdrop-blur-md border border-cyan-400/30 rounded-lg px-2.5 py-1 text-[11px] font-mono tabular-nums text-cyan-100 shadow-sm flex items-center gap-1.5">
        <RotateCw
          className={`w-3 h-3 text-cyan-300 shrink-0 ${
            isAutoSpin && !isDragging ? 'animate-[spin_16s_linear_infinite]' : ''
          }`}
        />
        <span>
          {String(currentFrame + 1).padStart(2, '0')}/{totalFrames}
        </span>
        <span aria-hidden="true" className="text-cyan-500">
          ·
        </span>
        <span>{degreeAngle}°</span>
      </div>

      {/* Loading Progress Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-30 bg-[#031829]/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
          <div className="w-full max-w-xs space-y-2.5">
            <div className="flex items-center justify-between text-xs font-medium text-cyan-100 tabular-nums">
              <span>Loading 360° catch showcase</span>
              <span>
                {loadedCount}/{totalFrames} ({loadPercent}%)
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-cyan-950/90 border border-cyan-500/30 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all duration-150 ease-out"
                style={{ width: `${loadPercent}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Error State Fallback */}
      {hasLoadError && (
        <div className="absolute inset-0 z-30 bg-[#031829]/90 flex flex-col items-center justify-center p-6 text-center">
          <p className="text-sm font-semibold text-white">Unable to load 360° showcase</p>
          <p className="text-xs text-cyan-200/80 mt-1">Verify frame URLs or refresh to retry.</p>
        </div>
      )}

      {/* Bottom Interactive Control & Click-to-Open Bar */}
      <div className="absolute bottom-2.5 left-2.5 right-2.5 sm:bottom-3.5 sm:left-3.5 sm:right-3.5 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {hoveredFish ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openFishProduct(hoveredFish);
            }}
            className="pointer-events-auto min-h-[44px] sm:min-h-[36px] inline-flex items-center gap-1.5 bg-emerald-600/95 hover:bg-emerald-500 text-white rounded-lg px-3 py-1.5 text-[11px] font-semibold shadow-md transition-colors cursor-pointer"
          >
            <MousePointerClick className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">Open {hoveredFish.name}</span>
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5 pointer-events-none">
            <div className="inline-flex items-center gap-1.5 bg-[#031829]/80 backdrop-blur-md border border-cyan-500/25 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-cyan-100">
              <MoveHorizontal className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
              <span className="whitespace-nowrap">
                {isDragging ? 'Scrubbing 360°' : 'Drag to spin · Click fish to view'}
              </span>
            </div>
            {frontFish && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openFishProduct(frontFish);
                }}
                className="pointer-events-auto hidden sm:inline-flex min-h-[36px] items-center gap-1.5 bg-cyan-950/90 hover:bg-cyan-900 border border-cyan-400/40 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-emerald-300 transition-colors cursor-pointer"
              >
                <MousePointerClick className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">Front: {frontFish.name}</span>
              </button>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={toggleAutoSpin}
          aria-pressed={isAutoSpin}
          className="pointer-events-auto min-h-[44px] sm:min-h-[36px] inline-flex items-center gap-2 px-3.5 py-2 sm:py-1.5 rounded-lg bg-[#031829]/90 hover:bg-[#072b47] text-white border border-cyan-400/40 text-xs font-semibold shadow-md transition-colors cursor-pointer whitespace-nowrap shrink-0 active:scale-95"
        >
          {isAutoSpin ? (
            <>
              <Pause className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Auto-Spin On</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
              <span>Auto-Spin Off</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
