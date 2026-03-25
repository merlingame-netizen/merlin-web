// M.E.R.L.I.N. — Post-Processing
// Cinematic forest: vignette + bloom + color grading + chromatic aberration
// Phase 3: Night tint (desaturation + blue tint based on uNightBlend)
// CRT scanlines + film grain + painterly blur blend

import * as THREE from 'three'

export class PostProcessing {
  constructor(renderer) {
    this._renderer = renderer
    this._enabled = true

    // Render target at full resolution
    const size = renderer.getSize(new THREE.Vector2())
    this._renderTarget = new THREE.WebGLRenderTarget(size.x, size.y)

    // Fullscreen quad
    this._quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    this._quadScene = new THREE.Scene()

    this._material = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: this._renderTarget.texture },
        uBlurTexture: { value: null },
        uResolution: { value: new THREE.Vector2(size.x, size.y) },
        uTime: { value: 0 },
        uVignetteIntensity: { value: 0.06 },
        uAberrationAmount: { value: 0.0005 },
        uExposure: { value: 1.5 },
        uBloomThreshold: { value: 0.7 },
        uBloomIntensity: { value: 0.15 },
        uScanlineAlpha: { value: 0.015 },
        uGrainIntensity: { value: 0.03 },
        uPainterlyBlend: { value: 0.12 },
        uNightBlend: { value: 0.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uTexture;
        uniform sampler2D uBlurTexture;
        uniform vec2 uResolution;
        uniform float uTime;
        uniform float uVignetteIntensity;
        uniform float uAberrationAmount;
        uniform float uExposure;
        uniform float uBloomThreshold;
        uniform float uBloomIntensity;
        uniform float uScanlineAlpha;
        uniform float uGrainIntensity;
        uniform float uPainterlyBlend;
        uniform float uNightBlend;
        varying vec2 vUv;

        vec3 filmicTonemap(vec3 x) {
          vec3 X = max(vec3(0.0), x - 0.004);
          return (X * (6.2 * X + 0.5)) / (X * (6.2 * X + 1.7) + 0.06);
        }

        void main() {
          // Chromatic aberration (subtle)
          vec2 dir = vUv - 0.5;
          float dist = length(dir);
          vec2 offset = dir * dist * uAberrationAmount;

          float r = texture2D(uTexture, vUv + offset).r;
          float g = texture2D(uTexture, vUv).g;
          float b = texture2D(uTexture, vUv - offset).b;
          vec3 color = vec3(r, g, b);

          // Exposure
          color *= uExposure;

          // Simple bloom approximation
          vec3 bloom = vec3(0.0);
          float blurSize = 3.0 / uResolution.x;
          for (int x = -2; x <= 2; x++) {
            for (int y = -2; y <= 2; y++) {
              vec2 sampleUv = vUv + vec2(float(x), float(y)) * blurSize;
              vec3 s = texture2D(uTexture, sampleUv).rgb * uExposure;
              bloom += max(s - uBloomThreshold, vec3(0.0));
            }
          }
          bloom /= 25.0;
          color += bloom * uBloomIntensity;

          // Color grading: warm shadows, cool highlights
          float lum = dot(color, vec3(0.2126, 0.7152, 0.0722));
          vec3 warmShadow = vec3(0.15, 0.08, 0.02);
          vec3 coolHighlight = vec3(-0.02, 0.0, 0.04);
          float shadowMask = 1.0 - smoothstep(0.0, 0.4, lum);
          float highlightMask = smoothstep(0.6, 1.0, lum);
          color += warmShadow * shadowMask * 0.3;
          color += coolHighlight * highlightMask * 0.2;

          // Night tint (Phase 3) — desaturation + blue shift
          if (uNightBlend > 0.0) {
            float grey = dot(color, vec3(0.299, 0.587, 0.114));
            vec3 nightColor = mix(vec3(grey), vec3(grey * 0.7, grey * 0.75, grey * 1.2), 0.6);
            color = mix(color, nightColor, uNightBlend);
          }

          // Filmic tonemap
          color = filmicTonemap(color);

          // Painterly blur blend
          vec3 blurred = texture2D(uBlurTexture, vUv).rgb;
          color = mix(color, blurred, uPainterlyBlend);

          // Vignette
          float vignette = 1.0 - dist * dist * uVignetteIntensity * 2.0;
          color *= clamp(vignette, 0.0, 1.0);

          // CRT scanlines (extremely light)
          float scanline = sin(gl_FragCoord.y * 1.5) * 0.5 + 0.5;
          color *= 1.0 - scanline * uScanlineAlpha;

          // Film grain (subtle)
          float grain = fract(sin(dot(vUv * (uTime + 1.0), vec2(12.9898, 78.233))) * 43758.5453);
          color *= (1.0 - uGrainIntensity) + grain * uGrainIntensity * 2.0;

          gl_FragColor = vec4(color, 1.0);
        }
      `,
    })

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this._material)
    this._quadScene.add(quad)

    // Half-res blur target for painterly effect
    const halfW = Math.max(1, Math.floor(size.x / 2))
    const halfH = Math.max(1, Math.floor(size.y / 2))
    this._blurTarget = new THREE.WebGLRenderTarget(halfW, halfH)

    this._blurMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: this._renderTarget.texture },
        uResolution: { value: new THREE.Vector2(halfW, halfH) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uTexture;
        uniform vec2 uResolution;
        varying vec2 vUv;
        void main() {
          vec3 c = vec3(0.0);
          float total = 0.0;
          for (int x = -1; x <= 1; x++) {
            for (int y = -1; y <= 1; y++) {
              vec2 off = vec2(float(x), float(y)) / uResolution;
              float w = 1.0 - length(vec2(float(x), float(y))) * 0.3;
              c += texture2D(uTexture, vUv + off * 2.0).rgb * w;
              total += w;
            }
          }
          gl_FragColor = vec4(c / total, 1.0);
        }
      `,
    })

    this._blurScene = new THREE.Scene()
    this._blurScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this._blurMaterial))

    this._material.uniforms.uBlurTexture.value = this._blurTarget.texture
  }

  setEnabled(enabled) { this._enabled = enabled }

  /** Set night blend (0=day, 0.7=full night) */
  setNightBlend(value) {
    this._material.uniforms.uNightBlend.value = value
  }

  render(scene, camera, elapsed) {
    if (!this._enabled) {
      this._renderer.render(scene, camera)
      return
    }

    this._material.uniforms.uTime.value = elapsed

    // Render scene to render target
    this._renderer.setRenderTarget(this._renderTarget)
    this._renderer.render(scene, camera)

    // Blur pass (half-res for painterly effect)
    this._renderer.setRenderTarget(this._blurTarget)
    this._renderer.render(this._blurScene, this._quadCamera)
    this._renderer.setRenderTarget(null)

    // Render post-processed quad to screen
    this._renderer.render(this._quadScene, this._quadCamera)
  }

  resize(width, height) {
    this._renderTarget.setSize(width, height)
    this._material.uniforms.uResolution.value.set(width, height)
    const halfW = Math.max(1, Math.floor(width / 2))
    const halfH = Math.max(1, Math.floor(height / 2))
    this._blurTarget.setSize(halfW, halfH)
    this._blurMaterial.uniforms.uResolution.value.set(halfW, halfH)
  }

  dispose() {
    this._renderTarget.dispose()
    this._blurTarget.dispose()
    this._material.dispose()
    this._blurMaterial.dispose()
  }
}
