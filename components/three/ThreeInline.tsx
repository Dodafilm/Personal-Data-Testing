'use client';

import { useRef, useEffect } from 'react';
import type { DayRecord } from '@/lib/types';
import { InlineSceneManager } from './scene-manager';
import type { SceneEffect } from './scene-manager';

interface ThreeInlineProps {
  data: DayRecord[];
  effectFactory: () => SceneEffect;
}

export default function ThreeInline({ data, effectFactory }: ThreeInlineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const managerRef = useRef<InlineSceneManager | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    if (!canvasRef.current) return;

    try {
      const manager = new InlineSceneManager(canvasRef.current);
      managerRef.current = manager;
      manager.setEffect(effectFactory());
      manager.start();
      manager.updateData(dataRef.current);
    } catch (err) {
      console.error('ThreeInline init error:', err);
    }

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
      managerRef.current.updateData(data);
    }
  }, [data]);

  return <canvas ref={canvasRef} className="viz-3d-canvas" />;
}
