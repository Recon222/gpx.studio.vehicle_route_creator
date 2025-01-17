import { useEffect } from 'react';
import { useAnimation } from '../context/AnimationContext';
import type { InterpolatedPosition } from '../types';

export function useAnimationFrame(
  callback: (position: [number, number], heading?: number) => void
) {
  const { currentPosition } = useAnimation();

  useEffect(() => {
    if (!currentPosition) return;

    callback(
      [currentPosition.longitude, currentPosition.latitude],
      currentPosition.heading
    );
  }, [currentPosition, callback]);
}
