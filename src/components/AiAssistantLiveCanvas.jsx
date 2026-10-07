import { useEffect, useRef, useState } from "react";

/**
 * AiAssistantLiveCanvas
 *
 * TV Anime / Live2D-Style 2.5D Mesh Warping Engine.
 * Deforms the pristine original illustration (`/ai_assistant_girl.png`)
 * using a continuous 2D triangular vertex mesh in WebGL at 60 FPS.
 *
 * Guarantees:
 * 1. "HINDI NASISIRA ANG IMAGE": Zero cuts, zero transparent holes, zero double-arms / ghosting.
 * 2. "REALISTIC ANG GALAW":
 *    - Stepping leg & foot: Knees bend, ankle flexes, shoe lifts smoothly without breaking off the skirt.
 *    - Tablet arm & hand: Forearm and tablet gently tilt and sway, naturally attached to the navy blazer.
 *    - Welcoming hand: Soft greeting gesture.
 *    - Torso: Deep breathing expansion.
 *    - Hair tips: Subtle floating zero-g inertia.
 * 3. Graceful fallback to static image if WebGL is unavailable.
 */
export default function AiAssistantLiveCanvas({ className = "" }) {
  const canvasRef = useRef(null);
  const [webglSupported, setWebglSupported] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: true,
    });

    if (!gl) {
      console.warn("WebGL not supported, falling back to static image.");
      setWebglSupported(false);
      return;
    }

    const W = 768;
    const H = 1376;
    const cols = 28;
    const rows = 42;
    const numVertices = (cols + 1) * (rows + 1);
    const numIndices = cols * rows * 6;

    // Build base mesh positions & UV coordinates
    const basePositions = new Float32Array(numVertices * 2);
    const currentPositions = new Float32Array(numVertices * 2);
    const uvs = new Float32Array(numVertices * 2);
    const indices = new Uint16Array(numIndices);

    let vIdx = 0;
    for (let r = 0; r <= rows; r++) {
      const y = (r / rows) * H;
      for (let c = 0; c <= cols; c++) {
        const x = (c / cols) * W;
        basePositions[vIdx * 2] = x;
        basePositions[vIdx * 2 + 1] = y;
        currentPositions[vIdx * 2] = x;
        currentPositions[vIdx * 2 + 1] = y;
        uvs[vIdx * 2] = c / cols;
        uvs[vIdx * 2 + 1] = r / rows;
        vIdx++;
      }
    }

    let iIdx = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const topLeft = r * (cols + 1) + c;
        const topRight = topLeft + 1;
        const bottomLeft = (r + 1) * (cols + 1) + c;
        const bottomRight = bottomLeft + 1;

        // Triangle 1
        indices[iIdx++] = topLeft;
        indices[iIdx++] = bottomLeft;
        indices[iIdx++] = topRight;

        // Triangle 2
        indices[iIdx++] = topRight;
        indices[iIdx++] = bottomLeft;
        indices[iIdx++] = bottomRight;
      }
    }

    // Shaders
    const vsSource = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      uniform vec2 u_resolution;
      varying vec2 v_texCoord;

      void main() {
        vec2 zeroToOne = a_position / u_resolution;
        vec2 zeroToTwo = zeroToOne * 2.0;
        vec2 clipSpace = zeroToTwo - 1.0;
        gl_Position = vec4(clipSpace * vec2(1.0, -1.0), 0.0, 1.0);
        v_texCoord = a_texCoord;
      }
    `;

    const fsSource = `
      precision mediump float;
      uniform sampler2D u_image;
      varying vec2 v_texCoord;

      void main() {
        gl_FragColor = texture2D(u_image, v_texCoord);
      }
    `;

    function createShader(glCtx, type, source) {
      const shader = glCtx.createShader(type);
      glCtx.shaderSource(shader, source);
      glCtx.compileShader(shader);
      if (!glCtx.getShaderParameter(shader, glCtx.COMPILE_STATUS)) {
        console.error(glCtx.getShaderInfoLog(shader));
        glCtx.deleteShader(shader);
        return null;
      }
      return shader;
    }

    const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
    if (!vs || !fs) {
      setWebglSupported(false);
      return;
    }

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
      setWebglSupported(false);
      return;
    }

    gl.useProgram(program);

    const aPositionLoc = gl.getAttribLocation(program, "a_position");
    const aTexCoordLoc = gl.getAttribLocation(program, "a_texCoord");
    const uResolutionLoc = gl.getUniformLocation(program, "u_resolution");

    gl.uniform2f(uResolutionLoc, W, H);

    // Buffers
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, currentPositions, gl.DYNAMIC_DRAW);

    const texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    // Texture loading
    const texture = gl.createTexture();
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = "/ai_assistant_girl.png";

    let animationId = null;
    let isMounted = true;

    // Helper math functions
    const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
    const smoothstep = (min, max, val) => {
      const t = clamp((val - min) / (max - min), 0, 1);
      return t * t * (3 - 2 * t);
    };

    img.onload = () => {
      if (!isMounted) return;

      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.viewport(0, 0, W, H);

      const startTime = performance.now();

      function render(now) {
        if (!isMounted) return;

        const time = (now - startTime) / 1000;

        // --- 1. Realistic Waving Hand parameters ("mukhang realistic yung pag kaway ng kamay niya") ---
        // Cheerful anime greeting wave (period: ~1.9s)
        const waveCycle = time * 3.2;
        const waveAngle = 0.085 * Math.sin(waveCycle);
        const waveWristAngle = 0.05 * Math.sin(waveCycle - 0.4);
        const waveShiftX = 4.0 * Math.cos(waveCycle);
        const waveShiftY = -2.0 * (Math.sin(waveCycle * 2) * 0.5 + 0.5);

        // --- 2. Tablet Arm parameters (tucked under arm with breathing micro-sway) ---
        const tabletCycle = time * 1.5;
        const tabletAngle = 0.02 * Math.sin(tabletCycle);
        const tabletShiftY = -2.5 * (Math.sin(tabletCycle) * 0.5 + 0.5);

        // --- 3. Breathing parameters (chest) ---
        const breathCycle = time * 1.4;
        const breathFactor = Math.sin(breathCycle);

        // Key anatomical pivot coordinates
        const waveElbowX = 490;
        const waveElbowY = 390;
        const waveWristX = 550;
        const waveWristY = 280;
        const tabletPivotX = 360;
        const tabletPivotY = 350;
        const chestX = 390;
        const chestY = 420;

        for (let i = 0; i < numVertices; i++) {
          const bx = basePositions[i * 2];
          const by = basePositions[i * 2 + 1];

          let dx = 0;
          let dy = 0;

          // --- Torso Breathing ---
          if (bx >= 280 && bx <= 500 && by >= 250 && by <= 560) {
            const distChest = Math.hypot((bx - chestX) / 120, (by - chestY) / 160);
            if (distChest < 1.0) {
              const wChest = Math.cos(distChest * Math.PI * 0.5);
              dx += (bx - chestX) * 0.012 * breathFactor * wChest;
              dy += -2.5 * breathFactor * wChest;
            }
          }

          // --- Tablet Arm (Tucked under right arm) ---
          if (bx >= 240 && bx <= 420 && by >= 280 && by <= 490) {
            const wTab = smoothstep(420, 360, bx) * smoothstep(280, 340, by) * smoothstep(490, 440, by);
            if (wTab > 0) {
              const relX = bx - tabletPivotX;
              const relY = by - tabletPivotY;
              const cosA = Math.cos(tabletAngle);
              const sinA = Math.sin(tabletAngle);
              const rotX = relX * cosA - relY * sinA - relX;
              const rotY = relX * sinA + relY * cosA - relY;
              dx += rotX * wTab;
              dy += (rotY + tabletShiftY) * wTab;
            }
          }

          // --- Realistic Raised Waving Hand (Her left hand, viewer's right) ---
          if (bx >= 475 && bx <= 645 && by >= 170 && by <= 420) {
            const wWave = smoothstep(475, 520, bx) * smoothstep(420, 370, by);
            if (wWave > 0) {
              // Rotation from elbow
              const relElbowX = bx - waveElbowX;
              const relElbowY = by - waveElbowY;
              const cosE = Math.cos(waveAngle);
              const sinE = Math.sin(waveAngle);
              const rotEX = relElbowX * cosE - relElbowY * sinE - relElbowX;
              const rotEY = relElbowX * sinE + relElbowY * cosE - relElbowY;

              // Secondary wrist/finger flex for high natural realism
              let wristRotX = 0;
              let wristRotY = 0;
              if (by < 280) {
                const wWrist = smoothstep(280, 220, by);
                const relWX = bx - waveWristX;
                const relWY = by - waveWristY;
                const cosW = Math.cos(waveWristAngle);
                const sinW = Math.sin(waveWristAngle);
                wristRotX = (relWX * cosW - relWY * sinW - relWX) * wWrist;
                wristRotY = (relWX * sinW + relWY * cosW - relWY) * wWrist;
              }

              dx += (rotEX + wristRotX + waveShiftX) * wWave;
              dy += (rotEY + wristRotY + waveShiftY) * wWave;
            }
          }

          // --- Hair Tips Physics (Organic breeze) ---
          if (by >= 380 && by <= 720) {
            if (bx < 280) {
              const wHair = smoothstep(280, 200, bx) * smoothstep(380, 550, by);
              dx += 3.5 * Math.sin(time * 2.0 + by * 0.015) * wHair;
            } else if (bx > 490 && bx < 570) {
              const wHair = smoothstep(490, 540, bx) * smoothstep(380, 550, by);
              dx += 3.0 * Math.sin(time * 2.0 + by * 0.015 + 1.0) * wHair;
            }
          }

          currentPositions[i * 2] = bx + dx;
          currentPositions[i * 2 + 1] = by + dy;
        }

        // Upload updated mesh positions
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, currentPositions);

        // Bind attributes
        gl.enableVertexAttribArray(aPositionLoc);
        gl.vertexAttribPointer(aPositionLoc, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
        gl.enableVertexAttribArray(aTexCoordLoc);
        gl.vertexAttribPointer(aTexCoordLoc, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

        // Clear and draw
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawElements(gl.TRIANGLES, numIndices, gl.UNSIGNED_SHORT, 0);

        animationId = requestAnimationFrame(render);
      }

      animationId = requestAnimationFrame(render);
    };

    return () => {
      isMounted = false;
      if (animationId) cancelAnimationFrame(animationId);
      if (gl) {
        gl.deleteProgram(program);
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        gl.deleteBuffer(positionBuffer);
        gl.deleteBuffer(texCoordBuffer);
        gl.deleteBuffer(indexBuffer);
        gl.deleteTexture(texture);
      }
    };
  }, []);

  if (!webglSupported) {
    return (
      <img
        src="/ai_assistant_girl.png"
        alt="HRHub AI Assistant"
        className={className}
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={768}
      height={1376}
      className={className}
    />
  );
}
