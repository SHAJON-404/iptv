"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function BackgroundScene() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let W = window.innerWidth;
    let H = window.innerHeight;

    // Scene setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x070414, 0.025);

    const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 1000);
    camera.position.set(0, 2, 20);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setClearColor(0x070414, 1);
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Mouse position tracking for camera parallax interaction
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX - W / 2) / 100;
      mouseY = (e.clientY - H / 2) / 100;
    };
    window.addEventListener("mousemove", handleMouseMove);

    // ── 1. Cyber Grid Floor (Synthwave/Cyber Grid) ──
    const gridRows = 40;
    const gridCols = 40;
    const gridSpacing = 2.5;
    const gridWidth = gridCols * gridSpacing;
    const gridDepth = gridRows * gridSpacing;

    const gridGeo = new THREE.BufferGeometry();
    const gridVertices: number[] = [];
    const gridColors: number[] = [];

    // Colors mapping (cyan to indigo gradient)
    const colorStart = new THREE.Color(0x06b6d4); // Cyan
    const colorEnd = new THREE.Color(0x8b5cf6);   // Purple/Indigo

    // Create horizontal lines
    for (let r = 0; r <= gridRows; r++) {
      const z = r * gridSpacing - gridDepth / 2;
      gridVertices.push(-gridWidth / 2, -5, z);
      gridVertices.push(gridWidth / 2, -5, z);

      const ratio = r / gridRows;
      const col = colorStart.clone().lerp(colorEnd, ratio);
      gridColors.push(col.r, col.g, col.b);
      gridColors.push(col.r, col.g, col.b);
    }
    // Create vertical lines
    for (let c = 0; c <= gridCols; c++) {
      const x = c * gridSpacing - gridWidth / 2;
      gridVertices.push(x, -5, -gridDepth / 2);
      gridVertices.push(x, -5, gridDepth / 2);

      const ratio = c / gridCols;
      const col = colorStart.clone().lerp(colorEnd, ratio);
      gridColors.push(col.r, col.g, col.b);
      gridColors.push(col.r, col.g, col.b);
    }

    gridGeo.setAttribute("position", new THREE.Float32BufferAttribute(gridVertices, 3));
    gridGeo.setAttribute("color", new THREE.Float32BufferAttribute(gridColors, 3));

    const gridMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
    });

    const gridMesh = new THREE.LineSegments(gridGeo, gridMat);
    scene.add(gridMesh);

    // ── 2. Fluid Flow Field Particles (Starry data streams) ──
    const particleCount = 1200;
    const pPositions = new Float32Array(particleCount * 3);
    const pColors = new Float32Array(particleCount * 3);
    const pSpeeds: number[] = [];
    const pOffsets: number[] = [];

    const pPalette = [
      new THREE.Color(0x8b5cf6), // Purple
      new THREE.Color(0x06b6d4), // Cyan
      new THREE.Color(0xd946ef), // Neon Pink
      new THREE.Color(0x4f46e5), // Royal Blue
    ];

    for (let i = 0; i < particleCount; i++) {
      pPositions[i * 3] = (Math.random() - 0.5) * 45;
      pPositions[i * 3 + 1] = (Math.random() - 0.5) * 30 + 5;
      pPositions[i * 3 + 2] = (Math.random() - 0.5) * 20;

      const color = pPalette[Math.floor(Math.random() * pPalette.length)];
      pColors[i * 3] = color.r;
      pColors[i * 3 + 1] = color.g;
      pColors[i * 3 + 2] = color.b;

      pSpeeds.push(0.01 + Math.random() * 0.03);
      pOffsets.push(Math.random() * Math.PI * 2);
    }

    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPositions, 3));
    pGeo.setAttribute("color", new THREE.BufferAttribute(pColors, 3));

    // Circle texture for smooth particles
    const canvas = document.createElement("canvas");
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
      grad.addColorStop(0, "rgba(255, 255, 255, 1)");
      grad.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 16, 16);
    }
    const particleTex = new THREE.CanvasTexture(canvas);

    const pMat = new THREE.PointsMaterial({
      size: 0.18,
      vertexColors: true,
      map: particleTex,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    // ── 3. Giant Holographic Spheres in the sky ──
    const shapes: THREE.Mesh[] = [];
    const shapeSpeeds: number[] = [];

    const createCyberSphere = (radius: number, color: number, x: number, y: number, z: number, speed: number) => {
      // Wireframe sphere
      const sphereGeo = new THREE.IcosahedronGeometry(radius, 2);
      const sphereMat = new THREE.MeshBasicMaterial({
        color: color,
        wireframe: true,
        transparent: true,
        opacity: 0.15,
        blending: THREE.AdditiveBlending,
      });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      sphere.position.set(x, y, z);
      scene.add(sphere);
      shapes.push(sphere);
      shapeSpeeds.push(speed);

      // Inner glowing point light sphere
      const coreGeo = new THREE.SphereGeometry(radius * 0.2, 16, 16);
      const coreMat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
      });
      const core = new THREE.Mesh(coreGeo, coreMat);
      sphere.add(core);

      // Glowing outer ring
      const ringGeo = new THREE.TorusGeometry(radius * 1.4, 0.03, 4, 100);
      const ringMat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI * 0.4;
      sphere.add(ring);
    };

    createCyberSphere(5, 0x8b5cf6, -15, 8, -12, 0.002); // Purple sphere left
    createCyberSphere(4, 0x06b6d4, 16, 6, -10, -0.003); // Cyan sphere right

    // ── 4. Animation clock and loops ──
    const startTime = performance.now();
    let animId: number;
    let isPaused = false;

    const animate = () => {
      if (isPaused) return;
      animId = requestAnimationFrame(animate);
      const time = (performance.now() - startTime) * 0.001;

      // Camera inertia parallax
      targetX += (mouseX - targetX) * 0.05;
      targetY += (-mouseY - targetY) * 0.05;
      camera.position.x = targetX * 4;
      camera.position.y = 2 + targetY * 2;
      camera.lookAt(0, 0, 0);

      // Animate/Scroll Cyber Grid (creates forward movement effect)
      gridMesh.position.z = (time * 2.5) % gridSpacing;

      // Animate flowing particle field
      const pos = pGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        const idx = i * 3;

        // Flow field vector calculations (sine / cosine flow math)
        const offset = pOffsets[i];
        pos[idx] += Math.sin(time * 0.2 + offset) * 0.008; // X drift
        pos[idx + 1] -= pSpeeds[i] * 1.5;                // Y drift (fall)
        pos[idx + 2] += Math.cos(time * 0.15 + offset) * 0.005; // Z drift

        // Reset particle if it falls below the grid floor
        if (pos[idx + 1] < -8) {
          pos[idx] = (Math.random() - 0.5) * 45;
          pos[idx + 1] = 22;
          pos[idx + 2] = (Math.random() - 0.5) * 20;
        }
      }
      pGeo.attributes.position.needsUpdate = true;

      // Rotate holographic spheres
      shapes.forEach((sphere, idx) => {
        sphere.rotation.y += shapeSpeeds[idx];
        sphere.rotation.x += shapeSpeeds[idx] * 0.5;
      });

      renderer.render(scene, camera);
    };
    animate();

    // Pause/resume animation when player enters/exits fullscreen
    // The background is invisible behind the fullscreen player, so skip rendering
    const handleFullscreenEvent = (e: Event) => {
      const { isFullscreen } = (e as CustomEvent).detail;
      if (isFullscreen) {
        isPaused = true;
        cancelAnimationFrame(animId);
      } else {
        isPaused = false;
        animate();
      }
    };
    window.addEventListener("iptv-fullscreen", handleFullscreenEvent);

    // Resize handler — skip resize during fullscreen to avoid layout thrashing
    const onResize = () => {
      if (isPaused) return;
      W = window.innerWidth;
      H = window.innerHeight;
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      renderer.setSize(W, H);
    };
    window.addEventListener("resize", onResize);

    return () => {
      isPaused = true;
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("iptv-fullscreen", handleFullscreenEvent);
      renderer.domElement.remove();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}
