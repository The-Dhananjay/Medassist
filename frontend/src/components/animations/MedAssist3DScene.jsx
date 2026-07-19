import { useEffect, useRef } from "react";
import * as THREE from "three";

function tokenColor(name, fallback) {
  const fallbackColor = new THREE.Color(fallback);
  if (typeof window === "undefined") return fallbackColor;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!value) return fallbackColor;
  const [hue, saturation, lightness] = value.split(/\s+/).map((part) => Number.parseFloat(part));
  if ([hue, saturation, lightness].some((part) => Number.isNaN(part))) return fallbackColor;
  return new THREE.Color().setHSL(hue / 360, saturation / 100, lightness / 100);
}

function createShieldShape() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 1.55);
  shape.bezierCurveTo(0.72, 1.1, 1.08, 1.1, 1.26, 0.98);
  shape.lineTo(1.08, -0.3);
  shape.bezierCurveTo(0.94, -1.06, 0.44, -1.52, 0, -1.76);
  shape.bezierCurveTo(-0.44, -1.52, -0.94, -1.06, -1.08, -0.3);
  shape.lineTo(-1.26, 0.98);
  shape.bezierCurveTo(-1.08, 1.1, -0.72, 1.1, 0, 1.55);
  return shape;
}

function createHeartShape() {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.58);
  shape.bezierCurveTo(-1.36, 0.24, -1.46, 1.2, -0.68, 1.38);
  shape.bezierCurveTo(-0.26, 1.48, 0, 1.18, 0, 0.94);
  shape.bezierCurveTo(0, 1.18, 0.26, 1.48, 0.68, 1.38);
  shape.bezierCurveTo(1.46, 1.2, 1.36, 0.24, 0, -0.58);
  return shape;
}

export default function MedAssist3DScene({ className = "" }) {
  const hostRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const primary = tokenColor("--primary", "#0f172a");
    const secondary = tokenColor("--secondary", "#dcece6");
    const background = tokenColor("--background", "#fafaf7");
    const accent = tokenColor("--accent", "#eaf4ff");

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(background, 9, 17);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0.4, 9);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
    keyLight.position.set(3, 5, 5);
    scene.add(keyLight);
    scene.add(new THREE.AmbientLight(0xffffff, 1.8));

    const shieldGeometry = new THREE.ExtrudeGeometry(createShieldShape(), {
      depth: 0.28,
      bevelEnabled: true,
      bevelThickness: 0.08,
      bevelSize: 0.08,
      bevelSegments: 6,
    });
    shieldGeometry.center();
    const shield = new THREE.Mesh(
      shieldGeometry,
      new THREE.MeshStandardMaterial({
        color: secondary.clone().lerp(primary, 0.18),
        emissive: primary.clone(),
        emissiveIntensity: 0.08,
        roughness: 0.28,
        metalness: 0.22,
      })
    );
    shield.scale.set(1.12, 1.12, 1.12);
    group.add(shield);

    const crossMaterial = new THREE.MeshStandardMaterial({ color: primary.clone(), roughness: 0.18, metalness: 0.1 });
    const crossVertical = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.15, 0.34), crossMaterial);
    const crossHorizontal = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.24, 0.34), crossMaterial);
    crossVertical.position.z = 0.26;
    crossHorizontal.position.z = 0.27;
    shield.add(crossVertical, crossHorizontal);

    const heart = new THREE.Mesh(
      new THREE.ExtrudeGeometry(createHeartShape(), {
        depth: 0.18,
        bevelEnabled: true,
        bevelThickness: 0.05,
        bevelSize: 0.05,
        bevelSegments: 5,
      }),
      new THREE.MeshStandardMaterial({
        color: primary.clone(),
        emissive: primary.clone(),
        emissiveIntensity: 0.16,
        roughness: 0.32,
        metalness: 0.08,
      })
    );
    heart.geometry.center();
    heart.position.set(-2.45, 0.55, -0.1);
    heart.scale.set(0.54, 0.54, 0.54);
    group.add(heart);

    const capsuleGroup = new THREE.Group();
    const capsuleMaterial = new THREE.MeshStandardMaterial({ color: secondary.clone().lerp(primary, 0.14), roughness: 0.24, metalness: 0.08 });
    const capsuleCore = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 1.08, 12, 28), capsuleMaterial);
    capsuleCore.rotation.z = Math.PI / 2.4;
    const capsuleBand = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 16), new THREE.MeshStandardMaterial({ color: primary.clone(), roughness: 0.28 }));
    capsuleBand.scale.set(0.95, 0.38, 0.95);
    capsuleBand.position.x = -0.24;
    capsuleBand.rotation.z = Math.PI / 2.4;
    capsuleGroup.add(capsuleCore, capsuleBand);
    capsuleGroup.position.set(2.42, -0.68, 0);
    capsuleGroup.scale.set(0.78, 0.78, 0.78);
    group.add(capsuleGroup);

    const ringMaterial = new THREE.LineBasicMaterial({ color: primary.clone(), transparent: true, opacity: 0.42 });
    const rings = [0, 1, 2].map((index) => {
      const curve = new THREE.EllipseCurve(0, 0, 2.55 + index * 0.16, 0.72 + index * 0.08, 0, Math.PI * 2);
      const points = curve.getPoints(120).map((point) => new THREE.Vector3(point.x, point.y, 0));
      const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), ringMaterial.clone());
      ring.rotation.x = Math.PI / 2.9;
      ring.rotation.y = index * 0.55;
      group.add(ring);
      return ring;
    });

    const ecgPoints = [
      [-3.5, -2.22, 0],
      [-2.1, -2.22, 0],
      [-1.78, -2.22, 0],
      [-1.54, -1.72, 0],
      [-1.22, -2.74, 0],
      [-0.92, -2.22, 0],
      [0.45, -2.22, 0],
      [0.76, -1.9, 0],
      [1.02, -2.45, 0],
      [1.32, -2.22, 0],
      [3.5, -2.22, 0],
    ].map(([x, y, z]) => new THREE.Vector3(x, y, z));
    const ecgLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(ecgPoints),
      new THREE.LineBasicMaterial({ color: primary.clone(), transparent: true, opacity: 0.72 })
    );
    group.add(ecgLine);

    const particleCount = 90;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let index = 0; index < particleCount; index += 1) {
      const radius = 2.6 + Math.random() * 2.8;
      const angle = Math.random() * Math.PI * 2;
      particlePositions[index * 3] = Math.cos(angle) * radius;
      particlePositions[index * 3 + 1] = (Math.random() - 0.5) * 5.2;
      particlePositions[index * 3 + 2] = Math.sin(angle) * radius - 1.2;
    }
    const particles = new THREE.Points(
      new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(particlePositions, 3)),
      new THREE.PointsMaterial({ color: primary.clone(), size: 0.035, transparent: true, opacity: 0.42 })
    );
    scene.add(particles);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(3.45, 96),
      new THREE.MeshBasicMaterial({ color: accent.clone().lerp(primary, 0.08), transparent: true, opacity: 0.45 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.55;
    scene.add(floor);

    let width = 1;
    let height = 1;
    let raf = 0;
    const pointer = { x: 0, y: 0 };
    const smoothedPointer = { x: 0, y: 0 };
    const drag = {
      active: false,
      lastX: 0,
      lastY: 0,
      velocityX: 0,
      velocityY: 0,
      rotationX: -0.08,
      rotationY: 0,
    };

    const resize = () => {
      const rect = host.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const onPointerMove = (event) => {
      const rect = host.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      pointer.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
      if (!drag.active) return;

      const deltaX = event.clientX - drag.lastX;
      const deltaY = event.clientY - drag.lastY;
      drag.rotationY += deltaX * 0.018;
      drag.rotationX += deltaY * 0.014;
      drag.rotationX = Math.max(-0.95, Math.min(0.7, drag.rotationX));
      drag.velocityX = deltaX * 0.018;
      drag.velocityY = deltaY * 0.014;
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;
    };

    const onPointerDown = (event) => {
      drag.active = true;
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;
      drag.velocityX = 0;
      drag.velocityY = 0;
      host.setPointerCapture?.(event.pointerId);
      host.style.cursor = "grabbing";
    };

    const onPointerUp = (event) => {
      drag.active = false;
      host.releasePointerCapture?.(event.pointerId);
      host.style.cursor = "grab";
    };

    const clock = new THREE.Clock();
    const animate = () => {
      const time = clock.getElapsedTime();
      smoothedPointer.x += (pointer.x - smoothedPointer.x) * 0.16;
      smoothedPointer.y += (pointer.y - smoothedPointer.y) * 0.16;
      if (!reduceMotion) {
        if (!drag.active) {
          drag.rotationY += drag.velocityX;
          drag.rotationX += drag.velocityY;
          drag.velocityX *= 0.93;
          drag.velocityY *= 0.9;
          drag.rotationY += 0.0045;
          drag.rotationX += (-0.08 - drag.rotationX) * 0.018;
        }
        group.rotation.y = drag.rotationY + time * 0.08 + smoothedPointer.x * 0.16;
        group.rotation.x = drag.rotationX + smoothedPointer.y * 0.08;
        shield.position.y = Math.sin(time * 1.25) * 0.11;
        heart.position.y = 0.55 + Math.sin(time * 1.8) * 0.16;
        heart.scale.setScalar(0.54 + Math.sin(time * 4.2) * 0.025);
        capsuleGroup.rotation.y = time * 0.8;
        capsuleGroup.position.y = -0.68 + Math.cos(time * 1.45) * 0.12;
        particles.rotation.y = time * 0.04;
        ecgLine.material.opacity = 0.45 + Math.sin(time * 3.6) * 0.22;
        rings.forEach((ring, index) => {
          ring.rotation.z = time * (0.55 + index * 0.16);
          ring.material.opacity = 0.22 + Math.sin(time * 1.6 + index) * 0.14;
        });
      }
      camera.position.x += (pointer.x * 0.46 - camera.position.x) * 0.12;
      camera.position.y += (0.4 - pointer.y * 0.28 - camera.position.y) * 0.12;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
      raf = window.requestAnimationFrame(animate);
    };

    resize();
    host.style.cursor = "grab";
    host.style.touchAction = "none";
    host.addEventListener("pointerdown", onPointerDown);
    host.addEventListener("pointermove", onPointerMove);
    host.addEventListener("pointerup", onPointerUp);
    host.addEventListener("pointercancel", onPointerUp);
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    animate();

    return () => {
      window.cancelAnimationFrame(raf);
      host.removeEventListener("pointerdown", onPointerDown);
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerup", onPointerUp);
      host.removeEventListener("pointercancel", onPointerUp);
      resizeObserver.disconnect();
      renderer.dispose();
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
          else object.material.dispose();
        }
      });
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className={`h-[360px] w-full rounded-2xl bg-secondary/40 shadow-xl sm:h-[520px] ${className}`}
      data-testid="hero-3d-scene"
      aria-label="Animated 3D MedAssist medical scene"
      role="img"
    />
  );
}
