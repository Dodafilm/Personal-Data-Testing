'use client';

import { useRef, useEffect, useState } from 'react';
import type { DayRecord } from '@/lib/types';

interface ThreeBackgroundProps {
  effect: string;
  data: DayRecord[];
}

export default function ThreeBackground({ effect, data }: ThreeBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const managerRef = useRef<unknown>(null);
  const effectRef = useRef(effect);
  const dataRef = useRef(data);
  const [error, setError] = useState<string | null>(null);
  effectRef.current = effect;
  dataRef.current = data;

  useEffect(() => {
    if (!canvasRef.current) return;

    let disposed = false;

    (async () => {
      try {
        const THREE = await import('three');
        if (disposed || !canvasRef.current) return;

        const renderer = new THREE.WebGLRenderer({
          canvas: canvasRef.current,
          antialias: true,
          alpha: true,
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0x0a0a0f, 1);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 0, 30);

        const clock = new THREE.Clock();

        const handleResize = () => {
          const w = window.innerWidth;
          const h = window.innerHeight;
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        };
        window.addEventListener('resize', handleResize);
        handleResize();

        // Create particles
        const particleCount = 2000;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
          const i3 = i * 3;
          positions[i3] = (Math.random() - 0.5) * 80;
          positions[i3 + 1] = (Math.random() - 0.5) * 60;
          positions[i3 + 2] = (Math.random() - 0.5) * 40;
          velocities[i3] = (Math.random() - 0.5) * 0.02;
          velocities[i3 + 1] = (Math.random() - 0.5) * 0.015;
          velocities[i3 + 2] = (Math.random() - 0.5) * 0.01;
          colors[i3] = 0.4 + Math.random() * 0.2;
          colors[i3 + 1] = 0.35 + Math.random() * 0.3;
          colors[i3 + 2] = 0.8 + Math.random() * 0.2;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
          size: 2.5,
          vertexColors: true,
          transparent: true,
          opacity: 0.85,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          sizeAttenuation: true,
        });

        const particles = new THREE.Points(geometry, material);
        scene.add(particles);

        let running = true;
        const animate = () => {
          if (!running) return;
          requestAnimationFrame(animate);
          const elapsed = clock.getElapsedTime();
          const pos = geometry.attributes.position.array as Float32Array;

          for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            pos[i3] += velocities[i3] + Math.sin(elapsed * 0.3 + i * 0.01) * 0.005;
            pos[i3 + 1] += velocities[i3 + 1] + Math.cos(elapsed * 0.2 + i * 0.02) * 0.005;
            pos[i3 + 2] += velocities[i3 + 2];
            if (pos[i3] > 40) pos[i3] = -40;
            if (pos[i3] < -40) pos[i3] = 40;
            if (pos[i3 + 1] > 30) pos[i3 + 1] = -30;
            if (pos[i3 + 1] < -30) pos[i3 + 1] = 30;
            if (pos[i3 + 2] > 20) pos[i3 + 2] = -20;
            if (pos[i3 + 2] < -20) pos[i3 + 2] = 20;
          }
          geometry.attributes.position.needsUpdate = true;
          particles.rotation.y += 0.0003;
          renderer.render(scene, camera);
        };
        animate();

        managerRef.current = {
          dispose: () => {
            running = false;
            window.removeEventListener('resize', handleResize);
            geometry.dispose();
            material.dispose();
            renderer.dispose();
          },
        };
      } catch (err) {
        console.error('ThreeBackground error:', err);
        setError(String(err));
      }
    })();

    return () => {
      disposed = true;
      if (managerRef.current && typeof (managerRef.current as { dispose: () => void }).dispose === 'function') {
        (managerRef.current as { dispose: () => void }).dispose();
        managerRef.current = null;
      }
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="bg-canvas" />
      {error && (
        <div style={{ position: 'fixed', top: 10, left: 10, color: 'red', zIndex: 9999, fontSize: 12, background: 'rgba(0,0,0,0.8)', padding: 8, borderRadius: 4 }}>
          3D Error: {error}
        </div>
      )}
    </>
  );
}
