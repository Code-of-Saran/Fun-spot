import * as THREE from 'three';

/**
 * Creates an interactive 3D cyberpunk scene for the Fun Spot landing page.
 * Features:
 * - Infinite perspective neon cyber grid floor
 * - Floating geometric holographic pylons with multi-layer parallax
 * - Drifting cyber data particles
 * - Three interactive 3D holographic game portal structures
 * - Dynamic lighting and scroll-driven cinematic camera trajectory
 * - Complete unmount cleanup and reduced-motion handling
 */
function isWebGLAvailable() {
  try {
    const probe = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
      (probe.getContext('webgl2') ||
        probe.getContext('webgl') ||
        probe.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

export function createLanding3DScene(targetElement) {
  if (!targetElement) return null;

  let canvas;
  let isManagedCanvas = false;

  if (targetElement.tagName === 'CANVAS') {
    canvas = targetElement;
  } else if (typeof targetElement.appendChild === 'function') {
    // Container element provided: ensure idempotency by removing any prior landing canvases
    const existing = targetElement.querySelectorAll('.cyber-landing__canvas');
    existing.forEach((el) => {
      try {
        el.remove();
      } catch {
        // ignore
      }
    });

    canvas = document.createElement('canvas');
    canvas.className = 'cyber-landing__canvas';
    targetElement.appendChild(canvas);
    isManagedCanvas = true;
  } else {
    return null;
  }

  // Verify WebGL availability without locking the target canvas to WebGL1
  if (!isWebGLAvailable()) {
    if (isManagedCanvas && canvas.parentNode) {
      canvas.remove();
    }
    return null;
  }

  let disposed = false;
  let animFrameId = null;
  let targetProgress = 0;
  let currentProgress = 0;
  let mouseX = 0;
  let mouseY = 0;
  let targetMouseX = 0;
  let targetMouseY = 0;

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // Scene setup
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x050a18, 0.016);

  const initWidth = canvas.clientWidth || canvas.parentElement?.clientWidth || window.innerWidth || 1280;
  const initHeight = canvas.clientHeight || canvas.parentElement?.clientHeight || window.innerHeight || 720;

  const camera = new THREE.PerspectiveCamera(55, initWidth / initHeight || 16 / 9, 0.1, 400);
  camera.position.set(0, 8, 48);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
      failIfMajorPerformanceCaveat: false,
    });
  } catch (err) {
    console.warn('[Landing3D] THREE.WebGLRenderer creation failed:', err);
    if (isManagedCanvas && canvas.parentNode) {
      canvas.remove();
    }
    return null;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(initWidth, initHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  // Lighting
  const ambientLight = new THREE.AmbientLight(0x08122c, 1.8);
  scene.add(ambientLight);

  const cyanLight = new THREE.PointLight(0x00f0ff, 4.0, 70, 1.5);
  cyanLight.position.set(-14, 10, 20);
  scene.add(cyanLight);

  const purpleLight = new THREE.PointLight(0xb026ff, 4.5, 75, 1.5);
  purpleLight.position.set(14, 12, 10);
  scene.add(purpleLight);

  const limeLight = new THREE.PointLight(0x76ff03, 3.0, 50, 1.8);
  limeLight.position.set(0, 6, -15);
  scene.add(limeLight);

  // 1. Perspective Cyber Grid Floor
  const gridHelper = new THREE.GridHelper(260, 90, 0x00f0ff, 0x1f2e55);
  gridHelper.position.set(0, -2, -30);
  if (gridHelper.material) {
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.45;
  }
  scene.add(gridHelper);

  // Secondary sub-grid glow plane
  const subGridHelper = new THREE.GridHelper(260, 45, 0xb026ff, 0x0a1428);
  subGridHelper.position.set(0, -2.05, -30);
  if (subGridHelper.material) {
    subGridHelper.material.transparent = true;
    subGridHelper.material.opacity = 0.28;
  }
  scene.add(subGridHelper);

  // 2. Parallax Cyber Pylons and Floating Structures
  const pylonGroup = new THREE.Group();
  scene.add(pylonGroup);

  const pylonGeom = new THREE.BoxGeometry(1.4, 18, 1.4);
  const pylonEdges = new THREE.EdgesGeometry(pylonGeom);

  const pylonPositions = [
    // Layer 1 (Near)
    { x: -16, y: 4, z: 22, color: 0x00f0ff },
    { x: 16, y: 5, z: 20, color: 0xb026ff },
    // Layer 2 (Mid)
    { x: -22, y: 7, z: -5, color: 0xb026ff },
    { x: 22, y: 6, z: -8, color: 0x00f0ff },
    // Layer 3 (Far)
    { x: -18, y: 9, z: -35, color: 0x76ff03 },
    { x: 18, y: 8, z: -38, color: 0x00f0ff },
    // Core Gate Columns
    { x: -10, y: 10, z: -60, color: 0x00f0ff },
    { x: 10, y: 10, z: -60, color: 0xb026ff },
  ];

  const pylons = pylonPositions.map((pos) => {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x071126,
      roughness: 0.2,
      metalness: 0.85,
      transparent: true,
      opacity: 0.88,
    });
    const mesh = new THREE.Mesh(pylonGeom, mat);
    mesh.position.set(pos.x, pos.y, pos.z);

    const lineMat = new THREE.LineBasicMaterial({
      color: pos.color,
      transparent: true,
      opacity: 0.75,
    });
    const wireframe = new THREE.LineSegments(pylonEdges, lineMat);
    mesh.add(wireframe);

    pylonGroup.add(mesh);
    return { mesh, baseY: pos.y, speed: 0.001 + Math.random() * 0.001 };
  });

  // 3. Floating Holographic Game Portal Nodes (Scene 3 highlight)
  const portalsGroup = new THREE.Group();
  scene.add(portalsGroup);

  // Portal 1: Virtual Partner (Cyan Hologram Core)
  const portal1Group = new THREE.Group();
  portal1Group.position.set(-7.5, 3.2, 4);
  const p1Torus = new THREE.Mesh(
    new THREE.TorusGeometry(2.1, 0.08, 16, 48),
    new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true })
  );
  const p1Core = new THREE.Mesh(
    new THREE.OctahedronGeometry(1.2, 0),
    new THREE.MeshStandardMaterial({ color: 0x00f0ff, metalness: 0.9, roughness: 0.1, wireframe: true })
  );
  portal1Group.add(p1Torus, p1Core);
  portalsGroup.add(portal1Group);

  // Portal 2: Don't Laugh (Vibrant Magenta Hologram Core)
  const portal2Group = new THREE.Group();
  portal2Group.position.set(0, 3.6, 2);
  const p2Torus = new THREE.Mesh(
    new THREE.TorusGeometry(2.3, 0.08, 16, 48),
    new THREE.MeshBasicMaterial({ color: 0xff007f, wireframe: true })
  );
  const p2Core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.3, 0),
    new THREE.MeshStandardMaterial({ color: 0xff007f, metalness: 0.9, roughness: 0.1, wireframe: true })
  );
  portal2Group.add(p2Torus, p2Core);
  portalsGroup.add(portal2Group);

  // Portal 3: Wrong Answers Only (Electric Lime Hologram Core)
  const portal3Group = new THREE.Group();
  portal3Group.position.set(7.5, 3.2, 4);
  const p3Torus = new THREE.Mesh(
    new THREE.TorusGeometry(2.1, 0.08, 16, 48),
    new THREE.MeshBasicMaterial({ color: 0x76ff03, wireframe: true })
  );
  const p3Core = new THREE.Mesh(
    new THREE.DodecahedronGeometry(1.2, 0),
    new THREE.MeshStandardMaterial({ color: 0x76ff03, metalness: 0.9, roughness: 0.1, wireframe: true })
  );
  portal3Group.add(p3Torus, p3Core);
  portalsGroup.add(portal3Group);

  // 4. Cyber Floating Particles
  const particleCount = 450;
  const particleGeom = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(particleCount * 3);
  const particleColors = new Float32Array(particleCount * 3);

  const colorPalette = [
    new THREE.Color(0x00f0ff),
    new THREE.Color(0xb026ff),
    new THREE.Color(0x76ff03),
    new THREE.Color(0xffffff),
  ];

  for (let i = 0; i < particleCount; i++) {
    particlePositions[i * 3] = (Math.random() - 0.5) * 80;
    particlePositions[i * 3 + 1] = Math.random() * 28 - 2;
    particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 120;

    const c = colorPalette[Math.floor(Math.random() * colorPalette.length)];
    particleColors[i * 3] = c.r;
    particleColors[i * 3 + 1] = c.g;
    particleColors[i * 3 + 2] = c.b;
  }

  particleGeom.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  particleGeom.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

  const particleMat = new THREE.PointsMaterial({
    size: 0.28,
    vertexColors: true,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending,
  });
  const particleSystem = new THREE.Points(particleGeom, particleMat);
  scene.add(particleSystem);

  // 5. Grand Neon Arch at Final CTA (Scene 5)
  const archGeom = new THREE.TorusGeometry(12, 0.25, 12, 60, Math.PI);
  const archMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.65 });
  const finalArch = new THREE.Mesh(archGeom, archMat);
  finalArch.position.set(0, -1, -55);
  finalArch.rotation.z = 0;
  scene.add(finalArch);

  // Pointer interaction
  const onPointerMove = (e) => {
    const x = (e.clientX / window.innerWidth) * 2 - 1;
    const y = -(e.clientY / window.innerHeight) * 2 + 1;
    targetMouseX = x * 1.5;
    targetMouseY = y * 0.8;
  };
  window.addEventListener('pointermove', onPointerMove, { passive: true });

  // Resize handler
  const onResize = () => {
    if (!canvas || disposed) return;
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    if (width > 0 && height > 0) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    }
  };
  const resizeObserver = new ResizeObserver(onResize);
  resizeObserver.observe(canvas);

  // Camera scroll keyframes
  function getCameraState(progress) {
    // 5 Distinct Scenes:
    // 0.00 - 0.22: Scene 1 — Arrival (Wide cinematic neon arcade)
    // 0.22 - 0.48: Scene 2 — Arcade Reveal (Parallax pylons & grid acceleration)
    // 0.48 - 0.72: Scene 3 — 3 Game Portals (Holographic core showcase)
    // 0.72 - 0.88: Scene 4 — How It Works (Elevated tactical guide station)
    // 0.88 - 1.00: Scene 5 — Final CTA (Ascending to grand neon portal)

    if (progress <= 0.22) {
      const t = progress / 0.22;
      return {
        pos: new THREE.Vector3(
          THREE.MathUtils.lerp(0, 0, t),
          THREE.MathUtils.lerp(8, 5.2, t),
          THREE.MathUtils.lerp(48, 28, t)
        ),
        lookAt: new THREE.Vector3(0, THREE.MathUtils.lerp(3, 3.2, t), 0),
        cyanIntensity: 4.0,
        purpleIntensity: 4.5,
      };
    } else if (progress <= 0.48) {
      const t = (progress - 0.22) / 0.26;
      return {
        pos: new THREE.Vector3(
          THREE.MathUtils.lerp(0, 1.8, t),
          THREE.MathUtils.lerp(5.2, 4.0, t),
          THREE.MathUtils.lerp(28, 14, t)
        ),
        lookAt: new THREE.Vector3(
          THREE.MathUtils.lerp(0, 0.4, t),
          THREE.MathUtils.lerp(3.2, 3.5, t),
          THREE.MathUtils.lerp(0, 2, t)
        ),
        cyanIntensity: 5.2,
        purpleIntensity: 5.8,
      };
    } else if (progress <= 0.72) {
      const t = (progress - 0.48) / 0.24;
      return {
        pos: new THREE.Vector3(
          THREE.MathUtils.lerp(1.8, 0, t),
          THREE.MathUtils.lerp(4.0, 3.4, t),
          THREE.MathUtils.lerp(14, 5.8, t)
        ),
        lookAt: new THREE.Vector3(0, 3.3, 2),
        cyanIntensity: 6.0,
        purpleIntensity: 6.0,
      };
    } else if (progress <= 0.88) {
      const t = (progress - 0.72) / 0.16;
      return {
        pos: new THREE.Vector3(
          THREE.MathUtils.lerp(0, -4.5, t),
          THREE.MathUtils.lerp(3.4, 6.2, t),
          THREE.MathUtils.lerp(5.8, -12, t)
        ),
        lookAt: new THREE.Vector3(
          THREE.MathUtils.lerp(0, 1.5, t),
          THREE.MathUtils.lerp(3.3, 4.0, t),
          THREE.MathUtils.lerp(2, -25, t)
        ),
        cyanIntensity: 4.8,
        purpleIntensity: 5.0,
      };
    } else {
      const t = Math.min(1, (progress - 0.88) / 0.12);
      return {
        pos: new THREE.Vector3(
          THREE.MathUtils.lerp(-4.5, 0, t),
          THREE.MathUtils.lerp(6.2, 6.5, t),
          THREE.MathUtils.lerp(-12, -32, t)
        ),
        lookAt: new THREE.Vector3(0, 4.0, -55),
        cyanIntensity: 6.5,
        purpleIntensity: 7.0,
      };
    }
  }

  // Animation Loop
  let lastTime = performance.now();
  const currentLookAt = new THREE.Vector3(0, 3, 0);

  function render(time) {
    if (disposed) return;

    // Smooth scroll progress interpolation
    const lerpFactor = prefersReducedMotion ? 0.2 : 0.07;
    currentProgress += (targetProgress - currentProgress) * lerpFactor;

    // Smooth mouse parallax
    if (!prefersReducedMotion) {
      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;
    }

    // Interpolate camera state
    const state = getCameraState(currentProgress);
    camera.position.x = state.pos.x + mouseX;
    camera.position.y = state.pos.y + mouseY;
    camera.position.z = state.pos.z;

    currentLookAt.lerp(state.lookAt, 0.08);
    camera.lookAt(currentLookAt);

    cyanLight.intensity = state.cyanIntensity;
    purpleLight.intensity = state.purpleIntensity;

    // Animate grid and floating objects
    const dt = Math.min(0.1, (time - lastTime) / 1000);
    lastTime = time;

    const scrollSpeedMultiplier = 1 + Math.abs(targetProgress - currentProgress) * 12;

    // Move grid slightly with scroll for dynamic speed illusion
    gridHelper.position.z = -30 + ((currentProgress * 40) % 2.88);
    subGridHelper.position.z = -30 + ((currentProgress * 40) % 5.77);

    // Subtle breathing animation on pylons
    pylons.forEach((p, idx) => {
      p.mesh.position.y = p.baseY + Math.sin(time * p.speed + idx) * 0.45;
    });

    // Rotate 3D Game Portal Nodes
    const rotSpeed = prefersReducedMotion ? 0.002 : 0.015;
    p1Torus.rotation.x += rotSpeed * 1.2;
    p1Torus.rotation.y += rotSpeed * 0.8;
    p1Core.rotation.y -= rotSpeed * 1.5;

    p2Torus.rotation.y += rotSpeed * 1.4;
    p2Torus.rotation.z += rotSpeed * 0.9;
    p2Core.rotation.x += rotSpeed * 1.2;

    p3Torus.rotation.x -= rotSpeed * 1.1;
    p3Torus.rotation.y += rotSpeed * 1.3;
    p3Core.rotation.z -= rotSpeed * 1.6;

    // Rotate final grand arch
    finalArch.rotation.z = Math.sin(time * 0.0005) * 0.05;

    // Drift particles
    const positions = particleGeom.attributes.position.array;
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3 + 2] += dt * 3.5 * scrollSpeedMultiplier;
      if (positions[i * 3 + 2] > 50) {
        positions[i * 3 + 2] = -70;
      }
    }
    particleGeom.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
    animFrameId = requestAnimationFrame(render);
  }

  animFrameId = requestAnimationFrame(render);

  return {
    setScrollProgress(progress) {
      targetProgress = THREE.MathUtils.clamp(progress, 0, 1);
    },
    resize() {
      onResize();
    },
    dispose() {
      if (disposed) return;
      disposed = true;

      if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }

      window.removeEventListener('pointermove', onPointerMove);

      if (resizeObserver) {
        try {
          resizeObserver.disconnect();
        } catch {
          // ignore
        }
      }

      // Clean up Three.js scene graph objects
      scene.traverse((obj) => {
        if (obj.isMesh || obj.isPoints || obj.isLine || obj.isLineSegments) {
          try {
            obj.geometry?.dispose();
          } catch {
            // ignore
          }
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => {
              try {
                m?.map?.dispose?.();
                m?.dispose();
              } catch {
                // ignore
              }
            });
          } else if (obj.material) {
            try {
              obj.material.map?.dispose?.();
              obj.material.dispose();
            } catch {
              // ignore
            }
          }
        }
      });

      // Explicitly lose WebGL context to free browser GPU context slots immediately
      try {
        renderer.dispose();
        renderer.forceContextLoss?.();
        const gl = renderer.getContext?.();
        const loseExt = gl?.getExtension?.('WEBGL_lose_context');
        loseExt?.loseContext?.();
      } catch {
        // ignore
      }

      // Remove managed canvas from DOM to ensure clean remounts
      if (isManagedCanvas && canvas?.parentNode) {
        try {
          canvas.remove();
        } catch {
          // ignore
        }
      }
    },
  };
}
