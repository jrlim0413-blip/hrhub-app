
let segmenterInstance = null;
let segmenterLoadingPromise = null;

async function getSelfieSegmentationInstance() {
  if (segmenterInstance) return segmenterInstance;
  if (segmenterLoadingPromise) return segmenterLoadingPromise;

  segmenterLoadingPromise = (async () => {
    if (typeof window !== "undefined" && !window.SelfieSegmentation) {
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "/mediapipe/selfie_segmentation.js";
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => {
          const cdnScript = document.createElement("script");
          cdnScript.src = "https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1.1675465747/selfie_segmentation.js";
          cdnScript.async = true;
          cdnScript.onload = () => resolve();
          cdnScript.onerror = (err) => reject(new Error("Failed to load SelfieSegmentation script: " + err));
          document.head.appendChild(cdnScript);
        };
        document.head.appendChild(script);
      });
    }

    if (!window.SelfieSegmentation) {
      throw new Error("SelfieSegmentation library not available on window object");
    }

    const segmenter = new window.SelfieSegmentation({
      locateFile: (file) => `/mediapipe/${file}`
    });

    segmenter.setOptions({
      modelSelection: 1,
      selfieMode: false
    });

    await segmenter.initialize();
    segmenterInstance = segmenter;
    return segmenterInstance;
  })();

  return segmenterLoadingPromise;
}

async function processWithMediaPipe(canvas, targetSize, options = {}) {
  const {
    cleanliness = 45
  } = options;

  const segmenter = await getSelfieSegmentationInstance();

  return new Promise((resolve, reject) => {
    let resolved = false;

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error("MediaPipe AI segmentation timeout"));
      }
    }, 9000);

    segmenter.onResults((results) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);

      try {
        if (!results || !results.segmentationMask) {
          return reject(new Error("No segmentation mask returned by AI model"));
        }

        const maskCanvas = document.createElement("canvas");
        maskCanvas.width = targetSize;
        maskCanvas.height = targetSize;
        const maskCtx = maskCanvas.getContext("2d", { willReadFrequently: true });
        maskCtx.drawImage(results.segmentationMask, 0, 0, targetSize, targetSize);

        const maskImgData = maskCtx.getImageData(0, 0, targetSize, targetSize);
        const maskData = maskImgData.data;

        const norm = Math.max(0.15, Math.min(0.85, cleanliness / 100));
        const lowCut = Math.max(0.12, norm * 0.60);
        const highCut = Math.min(0.92, lowCut + 0.35);
        const range = Math.max(0.01, highCut - lowCut);

        for (let i = 0; i < maskData.length; i += 4) {
          const rawConf = Math.max(maskData[i], maskData[i + 3]) / 255;

          let alpha;
          if (rawConf <= lowCut) {
            alpha = 0;
          } else if (rawConf >= highCut) {
            alpha = 255;
          } else {
            const t = (rawConf - lowCut) / range;
            alpha = Math.round((t * t * (3 - 2 * t)) * 255);
          }

          maskData[i] = 0;
          maskData[i + 1] = 0;
          maskData[i + 2] = 0;
          maskData[i + 3] = alpha;
        }
        maskCtx.putImageData(maskImgData, 0, 0);

        const outCanvas = document.createElement("canvas");
        outCanvas.width = targetSize;
        outCanvas.height = targetSize;
        const outCtx = outCanvas.getContext("2d");

        outCtx.fillStyle = "#FFFFFF";
        outCtx.fillRect(0, 0, targetSize, targetSize);

        const fgCanvas = document.createElement("canvas");
        fgCanvas.width = targetSize;
        fgCanvas.height = targetSize;
        const fgCtx = fgCanvas.getContext("2d");

        fgCtx.drawImage(canvas, 0, 0);

        fgCtx.globalCompositeOperation = "destination-in";
        fgCtx.drawImage(maskCanvas, 0, 0);

        outCtx.drawImage(fgCanvas, 0, 0);

        resolve({
          dataUrl: outCanvas.toDataURL("image/jpeg", 0.97),
          backdropType: "pure_white_ai"
        });
      } catch (err) {
        reject(err);
      }
    });

    segmenter.send({ image: canvas }).catch((err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        reject(err);
      }
    });
  });
}

function perceptualColorDistance(r1, g1, b1, r2, g2, b2) {
  const rmean = (r1 + r2) * 0.5;
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt((((512 + rmean) * dr * dr) / 256) + 4 * dg * dg + (((767 - rmean) * db * db) / 256));
}

function isSkinTonePixel(r, g, b) {
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * r - 0.081312 * b;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (max !== min) {
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  const s = max === 0 ? 0 : d / max;
  const v = max / 255;
  const hDeg = h * 360;

  const ycbcrMatch = cb >= 77 && cb <= 133 && cr >= 130 && cr <= 178;
  const hsvMatch = ((hDeg >= 0 && hDeg <= 52) || (hDeg >= 335 && hDeg <= 360)) && s >= 0.14 && s <= 0.82 && v >= 0.22;
  return ycbcrMatch || hsvMatch;
}

function processWithCanvasFallback(canvas, targetSize, options = {}) {
  const { tolerance = 52 } = options;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const imgData = ctx.getImageData(0, 0, targetSize, targetSize);
  const data = imgData.data;
  const width = targetSize;
  const height = targetSize;
  const totalPixels = width * height;

  const bgSamples = [];
  const sampleStep = 4;
  for (let y = 0; y < Math.floor(height * 0.15); y += sampleStep) {
    for (let x = 0; x < width; x += sampleStep) {
      const idx = (y * width + x) * 4;
      if (!isSkinTonePixel(data[idx], data[idx + 1], data[idx + 2])) {
        bgSamples.push({ r: data[idx], g: data[idx + 1], b: data[idx + 2] });
      }
    }
  }

  let sumR = 0, sumG = 0, sumB = 0;
  for (const s of bgSamples) {
    sumR += s.r; sumG += s.g; sumB += s.b;
  }
  const avgR = bgSamples.length ? sumR / bgSamples.length : 240;
  const avgG = bgSamples.length ? sumG / bgSamples.length : 240;
  const avgB = bgSamples.length ? sumB / bgSamples.length : 240;

  const mask = new Uint8Array(totalPixels);
  const queue = new Int32Array(totalPixels);
  let qHead = 0, qTail = 0;

  const effTol = Math.max(tolerance, 48);

  for (let x = 0; x < width; x++) {
    const idx = x;
    const pIdx = idx * 4;
    if (!isSkinTonePixel(data[pIdx], data[pIdx + 1], data[pIdx + 2])) {
      mask[idx] = 1;
      queue[qTail++] = idx;
    }
  }

  for (let y = 1; y < Math.floor(height * 0.80); y++) {
    const leftIdx = y * width;
    const rightIdx = y * width + (width - 1);
    mask[leftIdx] = 1; queue[qTail++] = leftIdx;
    mask[rightIdx] = 1; queue[qTail++] = rightIdx;
  }

  const dx = [1, -1, 0, 0];
  const dy = [0, 0, 1, -1];

  while (qHead < qTail) {
    const currIdx = queue[qHead++];
    const cx = currIdx % width;
    const cy = Math.floor(currIdx / width);

    for (let dir = 0; dir < 4; dir++) {
      const nx = cx + dx[dir];
      const ny = cy + dy[dir];
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      const nIdx = ny * width + nx;
      if (mask[nIdx] !== 0) continue;

      const nPix = nIdx * 4;
      const nr = data[nPix], ng = data[nPix + 1], nb = data[nPix + 2];
      if (isSkinTonePixel(nr, ng, nb)) continue;

      const dist = perceptualColorDistance(nr, ng, nb, avgR, avgG, avgB);
      if (dist <= effTol) {
        mask[nIdx] = 1;
        queue[qTail++] = nIdx;
      }
    }
  }

  const outCanvas = document.createElement("canvas");
  outCanvas.width = width;
  outCanvas.height = height;
  const outCtx = outCanvas.getContext("2d");
  outCtx.fillStyle = "#FFFFFF";
  outCtx.fillRect(0, 0, width, height);

  const outImgData = outCtx.getImageData(0, 0, width, height);
  const outData = outImgData.data;

  for (let i = 0; i < totalPixels; i++) {
    const pIdx = i * 4;
    if (mask[i] === 1) {
      outData[pIdx] = 255;
      outData[pIdx + 1] = 255;
      outData[pIdx + 2] = 255;
      outData[pIdx + 3] = 255;
    } else {
      outData[pIdx] = data[pIdx];
      outData[pIdx + 1] = data[pIdx + 1];
      outData[pIdx + 2] = data[pIdx + 2];
      outData[pIdx + 3] = 255;
    }
  }
  outCtx.putImageData(outImgData, 0, 0);

  return {
    dataUrl: outCanvas.toDataURL("image/jpeg", 0.97),
    backdropType: "pure_white_fallback"
  };
}

export async function processPhotoToWhiteBackground(fileOrDataUrl, options = {}) {
  const {
    targetSize = 800,
    cleanliness = 45
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = async () => {
      try {
        const srcW = img.naturalWidth || img.width;
        const srcH = img.naturalHeight || img.height;

        if (!srcW || !srcH) {
          return reject(new Error("Invalid image dimensions"));
        }

        const canvas = document.createElement("canvas");
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });

        const cropSize = Math.min(srcW, srcH);
        const cropX = Math.max(0, Math.floor((srcW - cropSize) * 0.5));
        const cropY = Math.max(0, Math.floor((srcH - cropSize) * 0.18));

        ctx.drawImage(img, cropX, cropY, cropSize, cropSize, 0, 0, targetSize, targetSize);
        const originalUrl = canvas.toDataURL("image/jpeg", 0.96);

        try {
          const aiResult = await processWithMediaPipe(canvas, targetSize, {
            cleanliness: options.tolerance || cleanliness
          });
          return resolve({
            dataUrl: aiResult.dataUrl,
            originalUrl,
            backdropType: aiResult.backdropType
          });
        } catch (aiError) {
          console.warn("AI segmentation unavailable or timed out, using high-precision fallback:", aiError);
        }

        const fallbackResult = processWithCanvasFallback(canvas, targetSize, options);
        return resolve({
          dataUrl: fallbackResult.dataUrl,
          originalUrl,
          backdropType: fallbackResult.backdropType
        });
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
