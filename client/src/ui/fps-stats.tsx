"use client"

import { useGameStore } from '../stores';

export function FPSStats() {
  const { fps } = useGameStore();

  // Color coding based on FPS performance
  const getFPSColor = (fps: number) => {
    if (fps >= 60) return 'text-green-400';
    if (fps >= 30) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-card/90 border border-border rounded-lg backdrop-blur-sm px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-xs font-medium">FPS</span>
        <span className={`text-sm font-bold ${getFPSColor(fps)}`}>
          {fps}
        </span>
      </div>
    </div>
  );
}

export default FPSStats;

