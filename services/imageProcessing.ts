import { SeamlessMethod, CropSettings, AveragingSettings, TileFormat, OutputFormat, ProcessResult } from '../types';

// Helper to load image
const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

// Helper to create canvas
const createCanvas = (w: number, h: number) => {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not get canvas context');
  return { canvas, ctx };
};

// ---------------------------------------------------------
// Pre-processing
// ---------------------------------------------------------

const applyCrop = (ctx: CanvasRenderingContext2D, width: number, height: number, crop: CropSettings) => {
  const newWidth = width - crop.left - crop.right;
  const newHeight = height - crop.top - crop.bottom;

  if (newWidth <= 0 || newHeight <= 0) return null;

  const { canvas: croppedCanvas, ctx: croppedCtx } = createCanvas(newWidth, newHeight);
  croppedCtx.drawImage(
    ctx.canvas,
    crop.left, crop.top, newWidth, newHeight, // Source
    0, 0, newWidth, newHeight // Dest
  );
  return croppedCanvas;
};

const applyAveraging = (canvas: HTMLCanvasElement, settings: AveragingSettings) => {
  if (settings.intensity <= 0) return canvas;

  const { width, height } = canvas;
  const { canvas: outCanvas, ctx: outCtx } = createCanvas(width, height);
  
  // Draw original
  outCtx.drawImage(canvas, 0, 0);

  // Create a blurred version for averaging
  const { canvas: blurCanvas, ctx: blurCtx } = createCanvas(width, height);
  blurCtx.filter = `blur(${settings.radius}px)`;
  blurCtx.drawImage(canvas, 0, 0);
  blurCtx.filter = 'none';

  // Blend original with blurred version based on intensity
  // We use the blurred image to "flatten" the lighting
  // Algorithm: Result = Original * (1 - intensity) + Blurred * intensity
  // Actually, a better high-pass equalize approach:
  // We want to remove low-frequency light variation.
  
  // Simple Approach: Overlay the blurred inverse? 
  // Let's implement the prompt's request: "Average dark and light areas".
  // Simplest Implementation: Alpha blend the blurred version with "Luminosity" or "Overlay" mode?
  // Let's stick to simple blending to pull towards average.
  
  outCtx.globalCompositeOperation = 'source-over';
  outCtx.globalAlpha = settings.intensity / 100;
  outCtx.drawImage(blurCanvas, 0, 0);
  outCtx.globalAlpha = 1.0;

  return outCanvas;
};

// ---------------------------------------------------------
// Seamless Algorithms
// ---------------------------------------------------------

// Method 1: Simple Mirrored Edges (Kaleidoscope effect on edges)
const generateMirrored = (srcCanvas: HTMLCanvasElement) => {
  const w = srcCanvas.width;
  const h = srcCanvas.height;
  const { canvas, ctx } = createCanvas(w, h);

  // Strategy: Mirror the image content so edges match perfectly.
  // We will take the top-left quadrant and mirror it to fill the screen.
  // Wait, that changes content too much.
  // Better Mirror Strategy: "Mirror Tile". 
  // We squash the image to 50% width/height, then draw it 4 times flipped.
  // This guarantees perfect seams but looks symmetrical.

  const halfW = w / 2;
  const halfH = h / 2;

  // Draw Top-Left (Original scaled down)
  ctx.drawImage(srcCanvas, 0, 0, w, h, 0, 0, halfW, halfH);
  
  // Draw Top-Right (Flipped X)
  ctx.save();
  ctx.translate(w, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(srcCanvas, 0, 0, w, h, 0, 0, halfW, halfH);
  ctx.restore();

  // Draw Bottom-Left (Flipped Y)
  ctx.save();
  ctx.translate(0, h);
  ctx.scale(1, -1);
  ctx.drawImage(srcCanvas, 0, 0, w, h, 0, 0, halfW, halfH);
  ctx.restore();

  // Draw Bottom-Right (Flipped X and Y)
  ctx.save();
  ctx.translate(w, h);
  ctx.scale(-1, -1);
  ctx.drawImage(srcCanvas, 0, 0, w, h, 0, 0, halfW, halfH);
  ctx.restore();

  return canvas;
};

// Method 2: Scattered Edges (Offset + Blend)
const generateScattered = (srcCanvas: HTMLCanvasElement) => {
  const w = srcCanvas.width;
  const h = srcCanvas.height;
  const { canvas, ctx } = createCanvas(w, h);

  // 1. Offset the image by 50% (makes the original edges meet in the center)
  // Top-Left becomes Bottom-Right, etc.
  const halfW = Math.round(w / 2);
  const halfH = Math.round(h / 2);

  // Draw 4 quadrants swapped
  // TL of source -> BR of dest
  ctx.drawImage(srcCanvas, 0, 0, halfW, halfH, halfW, halfH, halfW, halfH);
  // TR of source -> BL of dest
  ctx.drawImage(srcCanvas, halfW, 0, halfW, halfH, 0, halfH, halfW, halfH);
  // BL of source -> TR of dest
  ctx.drawImage(srcCanvas, 0, halfH, halfW, halfH, halfW, 0, halfW, halfH);
  // BR of source -> TL of dest
  ctx.drawImage(srcCanvas, halfW, halfH, halfW, halfH, 0, 0, halfW, halfH);

  // Now the "Seams" are exactly in the middle (vertical cross and horizontal cross).
  // We need to cover this cross with content from the original image's center (which is good).

  // 2. Overlay the original image in the center with a radial fade (feather)
  const blendSizeW = w * 0.7; // Cover 70% of the image
  const blendSizeH = h * 0.7;
  const blendX = (w - blendSizeW) / 2;
  const blendY = (h - blendSizeH) / 2;

  const { canvas: maskCanvas, ctx: maskCtx } = createCanvas(blendSizeW, blendSizeH);
  
  // Create an elliptical gradient mask
  const gradient = maskCtx.createRadialGradient(
    blendSizeW / 2, blendSizeH / 2, 0,
    blendSizeW / 2, blendSizeH / 2, Math.min(blendSizeW, blendSizeH) / 2
  );
  gradient.addColorStop(0, 'rgba(0,0,0,1)'); // Opaque in center
  gradient.addColorStop(0.5, 'rgba(0,0,0,1)'); 
  gradient.addColorStop(1, 'rgba(0,0,0,0)'); // Transparent at edges

  // Prepare the "Patch" from the center of the original source
  // We want a good chunk of the original image to paste over the seams
  const { canvas: patchCanvas, ctx: patchCtx } = createCanvas(blendSizeW, blendSizeH);
  patchCtx.drawImage(srcCanvas, 
    (w - blendSizeW) / 2, (h - blendSizeH) / 2, blendSizeW, blendSizeH,
    0, 0, blendSizeW, blendSizeH
  );

  // Apply mask to patch (DstIn)
  patchCtx.globalCompositeOperation = 'destination-in';
  patchCtx.fillStyle = gradient;
  patchCtx.fillRect(0, 0, blendSizeW, blendSizeH);

  // 3. Paste the masked patch onto the offset image
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(patchCanvas, blendX, blendY);

  return canvas;
};

// Method 3: Patch-based Blend (Stochastic)
const generatePatchBased = (srcCanvas: HTMLCanvasElement) => {
  const w = srcCanvas.width;
  const h = srcCanvas.height;
  const { canvas, ctx } = createCanvas(w, h);

  // Fill background with a random tile to start
  ctx.drawImage(srcCanvas, 0, 0);

  // Number of patches to throw
  const patchCount = 30; 
  const minPatchSize = Math.min(w, h) * 0.2;
  const maxPatchSize = Math.min(w, h) * 0.5;

  for (let i = 0; i < patchCount; i++) {
    // Random size
    const size = minPatchSize + Math.random() * (maxPatchSize - minPatchSize);
    
    // Random src position
    const sx = Math.random() * (w - size);
    const sy = Math.random() * (h - size);

    // Random dest position (handling wrapping is hard, so we just splatter freely)
    // To make it seamless, we must ensure that if we draw on the edge, we wrap around.
    // However, for MVP, a simpler approach is:
    // 1. Draw patches freely in the middle area.
    // 2. To ensure edges match, we must be careful not to touch the very edges OR 
    //    we used the Scatter method logic first, then splatter patches on top?
    
    // Let's refine: Use the Scatter logic as base (to ensure boundary continuity), 
    // then splatter patches in the MIDDLE to hide the Scatter artifacts.
    
    // Random dest position (concentrated towards center/seams to hide them)
    // We avoid touching the outer 5% to preserve the seamless wrap established by the base layer
    // Actually, simply drawing patches *anywhere* breaks seamlessness unless the patch itself wraps.
    
    // Revised Method 3:
    // 1. Start with the Scattered output (which is seamless).
    // 2. Add random patches from the source image.
    // 3. BUT, strictly avoiding the 10px boundary of the canvas.
    //    This preserves the seamless edges created by step 1, while randomizing the interior.
    
    if (i === 0) {
        // Initialize with scattered base for edge continuity
        const base = generateScattered(srcCanvas);
        ctx.drawImage(base, 0, 0);
    }

    const dx = 10 + Math.random() * (w - size - 20);
    const dy = 10 + Math.random() * (h - size - 20);

    // Create a fuzzy patch
    const { canvas: pC, ctx: pCtx } = createCanvas(size, size);
    
    // Radial Gradient Mask
    const grad = pCtx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(0.6, 'rgba(0,0,0,1)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');

    // Draw image part
    pCtx.drawImage(srcCanvas, sx, sy, size, size, 0, 0, size, size);
    
    // Mask it
    pCtx.globalCompositeOperation = 'destination-in';
    pCtx.fillStyle = grad;
    pCtx.fillRect(0, 0, size, size);

    // Paste
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(pC, dx, dy);
  }

  return canvas;
};


// ---------------------------------------------------------
// Tiling Preview
// ---------------------------------------------------------
const generateTilePreview = (textureCanvas: HTMLCanvasElement, tileFormat: TileFormat, markSeams: boolean) => {
  const w = textureCanvas.width;
  const h = textureCanvas.height;
  const rows = tileFormat;
  const cols = tileFormat;

  const { canvas, ctx } = createCanvas(w * cols, h * rows);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.drawImage(textureCanvas, c * w, r * h);
      
      if (markSeams) {
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(c * w, r * h, w, h);
      }
    }
  }

  return canvas;
};

// ---------------------------------------------------------
// Main Processor
// ---------------------------------------------------------

export const processTexture = async (
  imageSrc: string,
  method: SeamlessMethod,
  tileFormat: TileFormat,
  markSeams: boolean,
  crop: CropSettings,
  averaging: AveragingSettings,
  outputFormat: OutputFormat,
  outputQuality: number // 0-100 (for JPEG)
): Promise<ProcessResult> => {
  
  const img = await loadImage(imageSrc);
  
  // 1. Base Canvas
  let { canvas: currentCanvas, ctx } = createCanvas(img.width, img.height);
  ctx.drawImage(img, 0, 0);

  // 2. Pre-crop
  if (crop.top > 0 || crop.bottom > 0 || crop.left > 0 || crop.right > 0) {
    const cropped = applyCrop(ctx, currentCanvas.width, currentCanvas.height, crop);
    if (cropped) {
        currentCanvas = cropped;
        ctx = currentCanvas.getContext('2d')!;
    }
  }

  // 3. Pre-averaging
  if (averaging.intensity > 0) {
    currentCanvas = applyAveraging(currentCanvas, averaging);
  }

  // 4. Generate Seamless
  let seamlessCanvas: HTMLCanvasElement;
  switch (method) {
    case SeamlessMethod.MIRRORED:
      seamlessCanvas = generateMirrored(currentCanvas);
      break;
    case SeamlessMethod.PATCH_BASED:
      seamlessCanvas = generatePatchBased(currentCanvas);
      break;
    case SeamlessMethod.SCATTERED:
    default:
      seamlessCanvas = generateScattered(currentCanvas);
      break;
  }

  // 5. Generate Preview
  const previewCanvas = generateTilePreview(seamlessCanvas, tileFormat, markSeams);

  // 6. Export
  const quality = outputFormat === OutputFormat.JPEG ? outputQuality / 100 : undefined;
  
  return {
    seamlessUrl: seamlessCanvas.toDataURL(outputFormat, quality),
    previewUrl: previewCanvas.toDataURL(outputFormat, quality),
    width: seamlessCanvas.width,
    height: seamlessCanvas.height
  };
};