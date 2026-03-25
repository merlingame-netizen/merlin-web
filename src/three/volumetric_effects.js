// M.E.R.L.I.N. — Volumetric Effects
// Ground fog, light shafts, and god ray helpers
// All procedural, no external assets

import * as THREE from 'three'

// ── Ground Fog ─────────────────────────────────────────────────────────

const FOG_VERTEX = `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldPos = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

const FOG_FRAGMENT = `
  uniform float uTime;
  uniform vec3 uFogColor;
  uniform float uFogHeight;
  uniform float uDensity;
  uniform vec3 uCameraPos;
  varying vec2 vUv;
  varying vec3 vWorldPos;

  // Simple noise
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p *= 2.1;
      a *= 0.45;
    }
    return v;
  }

  void main() {
    // Animated noise for fog density
    vec2 noiseCoord = vWorldPos.xz * 0.02 + uTime * 0.015;
    float n = fbm(noiseCoord);

    // Distance fade (near camera = visible, far = transparent)
    float dist = length(vWorldPos.xz - uCameraPos.xz);
    float distFade = smoothstep(5.0, 50.0, dist);
    float nearFade = smoothstep(1.0, 4.0, dist); // don't obscure right at camera

    // Height fade (only low fog)
    float heightFade = 1.0 - smoothstep(0.0, uFogHeight, vWorldPos.y - uCameraPos.y + uFogHeight);

    float alpha = n * uDensity * heightFade * (1.0 - distFade) * nearFade;
    alpha = clamp(alpha, 0.0, 0.55);

    gl_FragColor = vec4(uFogColor, alpha);
  }
`

// ── Light Shaft ────────────────────────────────────────────────────────

const SHAFT_VERTEX = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const SHAFT_FRAGMENT = `
  uniform float uTime;
  uniform float uIntensity;
  uniform vec3 uColor;
  varying vec2 vUv;

  void main() {
    // Vertical gradient (bright at top, fade at bottom)
    float grad = smoothstep(0.0, 0.8, vUv.y);

    // Horizontal fade (center bright, edges transparent)
    float horiz = 1.0 - abs(vUv.x - 0.5) * 2.0;
    horiz = smoothstep(0.0, 0.5, horiz);

    // Animated shimmer
    float shimmer = 0.7 + 0.3 * sin(uTime * 1.5 + vUv.y * 8.0);

    float alpha = grad * horiz * shimmer * uIntensity;
    alpha = clamp(alpha, 0.0, 0.25);

    gl_FragColor = vec4(uColor, alpha);
  }
`

// ── Biome fog configs ──────────────────────────────────────────────────

const FOG_CONFIGS = {
  broceliande:    { color: [0.4, 0.55, 0.35], density: 0.45, height: 3.0, shaftColor: [0.9, 0.85, 0.6] },
  landes:         { color: [0.5, 0.5, 0.45], density: 0.2, height: 1.5, shaftColor: [0.85, 0.85, 0.75] },
  cotes:          { color: [0.5, 0.6, 0.7], density: 0.3, height: 2.0, shaftColor: [0.8, 0.85, 0.9] },
  monts:          { color: [0.3, 0.3, 0.35], density: 0.4, height: 3.0, shaftColor: [0.6, 0.5, 0.6] },
  ile_sein:       { color: [0.4, 0.5, 0.65], density: 0.25, height: 1.5, shaftColor: [0.7, 0.8, 0.9] },
  huelgoat:       { color: [0.35, 0.5, 0.3], density: 0.5, height: 3.5, shaftColor: [0.7, 0.9, 0.5] },
  ecosse:         { color: [0.45, 0.4, 0.5], density: 0.3, height: 2.0, shaftColor: [0.8, 0.7, 0.8] },
  iles_mystiques: { color: [0.6, 0.55, 0.35], density: 0.3, height: 2.0, shaftColor: [1.0, 0.9, 0.5] },
}

// ── Main Class ─────────────────────────────────────────────────────────

export class VolumetricEffects {
  constructor(biomeKey, heightFn, pathCurve) {
    this._meshes = []
    this._uniforms = []
    this._group = new THREE.Group()
    const config = FOG_CONFIGS[biomeKey] ?? FOG_CONFIGS.broceliande

    // ── Ground Fog Planes (3 layers at different heights) ──
    const fogLayers = [
      { height: 0.2, opacity: 0.4 },
      { height: 0.5, opacity: 0.25 },
      { height: 1.0, opacity: 0.15 },
    ]

    this._fogUniforms = {
      uTime: { value: 0 },
      uFogColor: { value: new THREE.Color(config.color[0], config.color[1], config.color[2]) },
      uFogHeight: { value: config.height },
      uDensity: { value: config.density },
      uCameraPos: { value: new THREE.Vector3() },
    }

    for (const layer of fogLayers) {
      const fogGeo = new THREE.PlaneGeometry(200, 200, 1, 1)
      fogGeo.rotateX(-Math.PI / 2)

      const layerUniforms = {
        uTime: this._fogUniforms.uTime,
        uFogColor: this._fogUniforms.uFogColor,
        uFogHeight: this._fogUniforms.uFogHeight,
        uDensity: { value: config.density * (layer.opacity / 0.4) },
        uCameraPos: this._fogUniforms.uCameraPos,
      }

      const fogMat = new THREE.ShaderMaterial({
        vertexShader: FOG_VERTEX,
        fragmentShader: FOG_FRAGMENT,
        uniforms: layerUniforms,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      })

      const fogMesh = new THREE.Mesh(fogGeo, fogMat)
      fogMesh.position.y = layer.height
      fogMesh.renderOrder = 900
      this._meshes.push(fogMesh)
      this._group.add(fogMesh)
    }

    // ── Light Shafts ──
    const shaftCount = biomeKey === 'broceliande' || biomeKey === 'huelgoat' ? 30 : 12
    this._shaftUniforms = []
    this._shaftMeshes = []

    for (let i = 0; i < shaftCount; i++) {
      const shaftGeo = new THREE.PlaneGeometry(0.6 + Math.random() * 0.4, 10 + Math.random() * 5)

      const uniforms = {
        uTime: { value: Math.random() * 10 },
        uIntensity: { value: 0.15 + Math.random() * 0.15 },
        uColor: { value: new THREE.Color(config.shaftColor[0], config.shaftColor[1], config.shaftColor[2]) },
      }

      const shaftMat = new THREE.ShaderMaterial({
        vertexShader: SHAFT_VERTEX,
        fragmentShader: SHAFT_FRAGMENT,
        uniforms,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      })

      const shaft = new THREE.Mesh(shaftGeo, shaftMat)

      // Place along path or randomly in the forest
      let x, z
      if (pathCurve) {
        const t = 0.1 + (i / shaftCount) * 0.8
        const p = pathCurve.getPointAt(t)
        x = p.x + (Math.random() - 0.5) * 10
        z = p.z + (Math.random() - 0.5) * 10
      } else {
        x = (Math.random() - 0.5) * 80
        z = (Math.random() - 0.5) * 80
      }

      const y = heightFn(x, z) + 5 + Math.random() * 3
      shaft.position.set(x, y, z)
      shaft.rotation.y = Math.random() * Math.PI

      this._meshes.push(shaft)
      this._shaftMeshes.push(shaft)
      this._shaftUniforms.push(uniforms)
    }

    // Pollen/dust particles
    const pollenGeo = new THREE.BufferGeometry()
    const pollenPos = new Float32Array(200 * 3)
    for (let i = 0; i < 200; i++) {
      pollenPos[i*3] = (Math.random() - 0.5) * 80
      pollenPos[i*3+1] = 0.5 + Math.random() * 3.5
      pollenPos[i*3+2] = (Math.random() - 0.5) * 80
    }
    pollenGeo.setAttribute('position', new THREE.BufferAttribute(pollenPos, 3))
    this._pollen = new THREE.Points(pollenGeo, new THREE.PointsMaterial({
      color: 0xeeddaa, size: 0.04, transparent: true, opacity: 0.35, depthWrite: false
    }))
    this._group.add(this._pollen)
    this._meshes.push(this._pollen)
  }

  getMeshes() { return this._meshes }

  update(dt, elapsed, cameraPos) {
    // Update fog
    if (this._fogUniforms) {
      this._fogUniforms.uTime.value = elapsed
      if (cameraPos) {
        this._fogUniforms.uCameraPos.value.copy(cameraPos)
      }
    }

    // Update light shafts (pulsation + lateral sway)
    for (let i = 0; i < this._shaftUniforms.length; i++) {
      const u = this._shaftUniforms[i]
      u.uTime.value += dt
      // Pulsating intensity
      u.uIntensity.value = 0.15 + Math.sin(elapsed * 0.8 + i * 1.3) * 0.1
      // Lateral sway
      if (this._shaftMeshes[i]) {
        this._shaftMeshes[i].rotation.z = Math.sin(elapsed * 0.3 + i * 0.7) * 0.04
      }
    }

    // Animate pollen
    if (this._pollen) {
      const pp = this._pollen.geometry.attributes.position
      for (let i = 0; i < pp.count; i++) {
        pp.array[i*3] += Math.sin(elapsed * 0.3 + i) * 0.003
        pp.array[i*3+1] += Math.sin(elapsed * 0.5 + i * 0.7) * 0.002
      }
      pp.needsUpdate = true
    }
  }

  dispose() {
    for (const m of this._meshes) {
      m.geometry.dispose()
      m.material.dispose()
    }
    this._meshes = []
  }
}
