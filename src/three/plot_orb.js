// M.E.R.L.I.N. — Plot Orb
// Emissive pulsing sphere + orbiting particles for click-to-trigger encounters
// Raycaster-friendly (single mesh for click detection)

import * as THREE from 'three'

const ORB_VERTEX = `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vNormal;
  void main() {
    vUv = uv;
    vNormal = normalMatrix * normal;
    vec3 pos = position;
    // Gentle pulse
    float pulse = 1.0 + sin(uTime * 3.0) * 0.08;
    pos *= pulse;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`

const ORB_FRAGMENT = `
  uniform float uTime;
  uniform vec3 uColor;
  varying vec2 vUv;
  varying vec3 vNormal;
  void main() {
    // Fresnel glow
    float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
    vec3 color = uColor * (1.0 + fresnel * 0.8);
    // Pulsating alpha
    float alpha = 0.6 + sin(uTime * 2.5) * 0.15 + fresnel * 0.3;
    gl_FragColor = vec4(color, alpha);
  }
`

export class PlotOrb {
  constructor() {
    this._group = new THREE.Group()
    this._orbMesh = null
    this._particlesMesh = null
    this._light = null
    this._uniforms = null
    this._elapsed = 0
    this._active = false

    this._build()
  }

  _build() {
    // Main orb sphere (clickable target)
    const orbGeo = new THREE.SphereGeometry(0.35, 10, 8)
    this._uniforms = {
      uTime: { value: 0 },
      uColor: { value: new THREE.Vector3(1.0, 0.85, 0.3) }, // golden
    }
    const orbMat = new THREE.ShaderMaterial({
      vertexShader: ORB_VERTEX,
      fragmentShader: ORB_FRAGMENT,
      uniforms: this._uniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.FrontSide,
      blending: THREE.AdditiveBlending,
    })
    this._orbMesh = new THREE.Mesh(orbGeo, orbMat)
    this._group.add(this._orbMesh)

    // Orbiting particles ring
    const particleCount = 24
    const pPos = new Float32Array(particleCount * 3)
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2
      pPos[i * 3] = Math.cos(angle) * 0.8
      pPos[i * 3 + 1] = (Math.random() - 0.5) * 0.4
      pPos[i * 3 + 2] = Math.sin(angle) * 0.8
    }
    const pGeo = new THREE.BufferGeometry()
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3))
    const pMat = new THREE.PointsMaterial({
      size: 0.08,
      color: 0xffdd88,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    this._particlesMesh = new THREE.Points(pGeo, pMat)
    this._group.add(this._particlesMesh)

    // Point light for atmosphere
    this._light = new THREE.PointLight(0xffcc44, 1.5, 8)
    this._group.add(this._light)
  }

  /** Spawn at position in the scene */
  spawn(scene, position) {
    this._group.position.copy(position)
    this._group.position.y += 1.2 // float above ground
    scene.add(this._group)
    this._active = true

    // Start with scale 0 and grow
    this._group.scale.set(0.01, 0.01, 0.01)
  }

  /** Get the clickable mesh for raycasting */
  getClickTarget() {
    return this._orbMesh
  }

  isActive() { return this._active }

  update(dt) {
    if (!this._active) return
    this._elapsed += dt
    this._uniforms.uTime.value = this._elapsed

    // Grow animation (first 0.8s)
    if (this._group.scale.x < 1.0) {
      const s = Math.min(1.0, this._group.scale.x + dt * 2.5)
      this._group.scale.set(s, s, s)
    }

    // Orbit particles rotation
    if (this._particlesMesh) {
      this._particlesMesh.rotation.y += dt * 1.2
      this._particlesMesh.rotation.x = Math.sin(this._elapsed * 0.5) * 0.15
    }

    // Bobbing
    this._group.position.y += Math.sin(this._elapsed * 2.0) * dt * 0.1

    // Light pulse
    if (this._light) {
      this._light.intensity = 1.5 + Math.sin(this._elapsed * 3.0) * 0.5
    }
  }

  /** Explosion effect then remove */
  async explode(scene) {
    this._active = false

    // Quick shrink + burst
    const duration = 0.4
    const startScale = this._group.scale.x
    const start = performance.now()

    return new Promise(resolve => {
      const animate = () => {
        const t = Math.min(1, (performance.now() - start) / (duration * 1000))
        const s = startScale * (1 - t)
        this._group.scale.set(s + t * 0.3, s + t * 0.3, s + t * 0.3)
        if (this._light) this._light.intensity = (1 - t) * 3
        if (t < 1) {
          requestAnimationFrame(animate)
        } else {
          this.dispose(scene)
          resolve()
        }
      }
      animate()
    })
  }

  /**
   * Auto-trigger: spawn → pulse for delay ms → explode → callback
   * No click needed — purely visual effect
   */
  autoTrigger(scene, position, delay, callback) {
    this.spawn(scene, position)
    console.log(`[PlotOrb] Auto-trigger in ${delay}ms`)

    setTimeout(async () => {
      if (!this._active) return
      await this.explode(scene)
      callback?.()
    }, delay)
  }

  dispose(scene) {
    this._active = false
    if (scene) scene.remove(this._group)
    this._orbMesh?.geometry.dispose()
    this._orbMesh?.material.dispose()
    this._particlesMesh?.geometry.dispose()
    this._particlesMesh?.material.dispose()
  }
}
