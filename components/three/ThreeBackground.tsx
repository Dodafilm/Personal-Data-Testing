'use client';

import { useRef, useEffect } from 'react';
import type { DayRecord } from '@/lib/types';
import type { SceneManager as SceneManagerType } from './scene-manager';
import { ParticleField } from './backgrounds/particle-field';
import { WaveSurface } from './backgrounds/wave-surface';

interface ThreeBackgroundProps {
  effect: string;
  data: DayRecord[];
}

export default function ThreeBackground({ effect, data }: ThreeBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const managerRef = useRef<SceneManagerType | null>(null);
  const effectRef = useRef(effect);
  const dataRef = useRef(data);
  effectRef.current = effect;
  dataRef.current = data;

  useEffect(() => {
    if (!canvasRef.current) return;

    import('./scene-manager').then(({ SceneManager }) => {
      if (!canvasRef.current) return;
      const manager = new SceneManager(canvasRef.current);
      managerRef.current = manager;
      applyEffect(manager, effectRef.current);
      manager.updateData(dataRef.current);
      manager.start();
    });

    return () => {
      if (managerRef.current) {
        managerRef.current.dispose();
        managerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (managerRef.current) {
      applyEffect(managerRef.current, effect);
    }
  }, [effect]);

  useEffect(() => {
    if (managerRef.current) {
      managerRef.current.updateData(data);
    }
  }, [data]);

  return <canvas ref={canvasRef} className="bg-canvas" />;
}

function applyEffect(manager: SceneManagerType, effect: string) {
  switch (effect) {
    case 'particles':
      manager.setEffect(new ParticleField());
      break;
    case 'waves':
      manager.setEffect(new WaveSurface());
      break;
    case 'none':
      manager.setEffect(null);
      break;
  }
}
