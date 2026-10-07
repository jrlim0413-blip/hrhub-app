/**
 * signatureImageProcessor.js
 * 
 * Client-side automatic signature background removal and PNG transparent converter.
 * Converts camera photos, paper scans, white or colored paper with shadows into
 * a clean, transparent PNG with sharp dark ink strokes.
 */

export async function processSignatureToTransparentPng(fileOrDataUrl, options = {}) {
  const {
    adaptiveBackground = true,
    autoCrop = true,
    maxDimension = 1200
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (!width || !height) {
          return reject(new Error("Invalid image dimensions"));
        }

        // Downscale oversized camera photos to avoid memory bottlenecks and keep strokes sharp
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, width, height);

        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;
        const totalPixels = width * height;
        const tolerance = 18;
        const fullInkThreshold = 55;

        // 1. Preserve existing transparency while removing pale pixels and normalizing ink.
        let transparentCount = 0;
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] < 60) transparentCount++;
        }
        if (transparentCount > totalPixels * 0.2) {
          for (let i = 0; i < data.length; i += 4) {
            const sourceAlpha = data[i + 3];
            if (!sourceAlpha) continue;

            const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            const inkContrast = 255 - lum;
            if (inkContrast <= tolerance) {
              data[i + 3] = 0;
              continue;
            }

            const t = Math.min(1, Math.max(0, (inkContrast - tolerance) / (fullInkThreshold - tolerance)));
            data[i + 3] = Math.round(sourceAlpha * Math.pow(t, 0.75));
            data[i] = 0;
            data[i + 1] = 0;
            data[i + 2] = 0;
          }

          ctx.putImageData(imgData, 0, 0);
          if (autoCrop) {
            return resolve(cropCanvasToInk(canvas, data, width, height));
          }
          return resolve(canvas.toDataURL("image/png"));
        }

        // 2. Adaptive Background Illumination Grid
        // Handles uneven lighting (phone camera shadow, paper angle, yellowish or grey tint)
        const gridCols = Math.min(16, Math.max(4, Math.floor(width / 50)));
        const gridRows = Math.min(16, Math.max(4, Math.floor(height / 50)));
        const cellW = width / gridCols;
        const cellH = height / gridRows;

        const bgGrid = [];
        for (let r = 0; r < gridRows; r++) {
          const rowVals = [];
          for (let c = 0; c < gridCols; c++) {
            const lums = [];
            const startX = Math.floor(c * cellW);
            const endX = Math.floor((c + 1) * cellW);
            const startY = Math.floor(r * cellH);
            const endY = Math.floor((r + 1) * cellH);

            for (let y = startY; y < endY; y += 2) {
              for (let x = startX; x < endX; x += 2) {
                const idx = (y * width + x) * 4;
                const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
                lums.push(lum);
              }
            }

            if (lums.length > 0) {
              lums.sort((a, b) => a - b);
              // Take 90th percentile as local paper background luminance
              const p90 = lums[Math.floor(lums.length * 0.9)];
              rowVals.push(p90);
            } else {
              rowVals.push(240);
            }
          }
          bgGrid.push(rowVals);
        }

        // Bilinear interpolation for smooth background baseline across any (x, y)
        const getLocalBg = (x, y) => {
          const gx = (x / cellW) - 0.5;
          const gy = (y / cellH) - 0.5;
          const x0 = Math.max(0, Math.min(gridCols - 1, Math.floor(gx)));
          const x1 = Math.max(0, Math.min(gridCols - 1, x0 + 1));
          const y0 = Math.max(0, Math.min(gridRows - 1, Math.floor(gy)));
          const y1 = Math.max(0, Math.min(gridRows - 1, y0 + 1));

          const fx = Math.max(0, Math.min(1, gx - x0));
          const fy = Math.max(0, Math.min(1, gy - y0));

          const top = bgGrid[y0][x0] * (1 - fx) + bgGrid[y0][x1] * fx;
          const bot = bgGrid[y1][x0] * (1 - fx) + bgGrid[y1][x1] * fx;
          return top * (1 - fy) + bot * fy;
        };

        // 3. Process each pixel: remove background & normalize ink strokes
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;

            const localBg = adaptiveBackground ? getLocalBg(x, y) : 240;
            const delta = localBg - lum;

            if (delta <= tolerance) {
              // Paper background -> 100% transparent
              data[i + 3] = 0;
            } else {
              // Ink stroke or anti-aliased edge
              const t = Math.min(1, Math.max(0, (delta - tolerance) / (fullInkThreshold - tolerance)));
              const alpha = Math.round(Math.pow(t, 0.75) * 255);
              data[i + 3] = alpha;

              // Check if pen ink has blue hue
              const isBlueTint = b > r + 15 && b > g + 10;
              if (isBlueTint) {
                // Crisp dark navy pen ink
                data[i] = Math.round(Math.min(25, r * 0.25));
                data[i + 1] = Math.round(Math.min(40, g * 0.35));
                data[i + 2] = Math.round(Math.min(95, b * 0.7));
              } else {
                // Crisp dark black pen ink
                const inkVal = Math.round(Math.min(25, 25 * (1 - t)));
                data[i] = inkVal;
                data[i + 1] = inkVal;
                data[i + 2] = Math.min(35, inkVal + 5);
              }
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);

        // 4. Auto-crop around the signature
        if (autoCrop) {
          const croppedUrl = cropCanvasToInk(canvas, data, width, height);
          return resolve(croppedUrl);
        }

        resolve(canvas.toDataURL("image/png"));
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = (err) => reject(err);

    if (typeof fileOrDataUrl === "string") {
      img.src = fileOrDataUrl;
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        img.src = reader.result;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(fileOrDataUrl);
    }
  });
}

function cropCanvasToInk(canvas, data, width, height) {
  let minX = width, minY = height, maxX = 0, maxY = 0;
  let hasInk = false;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = data[(y * width + x) * 4 + 3];
      if (a > 30) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        hasInk = true;
      }
    }
  }

  if (hasInk && maxX > minX && maxY > minY) {
    const pad = 12;
    const cropX = Math.max(0, minX - pad);
    const cropY = Math.max(0, minY - pad);
    const cropW = Math.min(width - cropX, (maxX - minX) + pad * 2);
    const cropH = Math.min(height - cropY, (maxY - minY) + pad * 2);

    const croppedCanvas = document.createElement("canvas");
    croppedCanvas.width = cropW;
    croppedCanvas.height = cropH;
    const cropCtx = croppedCanvas.getContext("2d");
    cropCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
    return croppedCanvas.toDataURL("image/png");
  }

  return canvas.toDataURL("image/png");
}
