import { useCallback, useEffect, useRef } from 'react';
import { Audio } from 'expo-av';

export function useClickSound() {
  const soundRef = useRef<Audio.Sound | null>(null);
  const readyRef = useRef(false);

  useEffect(() => {
    Audio.Sound.createAsync(require('../../assets/sounds/click.wav')).then(({ sound }) => {
      soundRef.current = sound;
      readyRef.current = true;
    });
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  const play = useCallback(() => {
    if (readyRef.current && soundRef.current) {
      soundRef.current.replayAsync();
    }
  }, []);

  return play;
}
