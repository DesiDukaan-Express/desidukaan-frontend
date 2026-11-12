import { useEffect } from 'react';
import {
  useAudioPlayer,
  setAudioModeAsync,
} from 'expo-audio';

const SOUND_URL =
  'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

export default function useOrderSound() {
  const player = useAudioPlayer(SOUND_URL);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
    }).catch((error) => {
      console.log('Audio mode error:', error);
    });
  }, []);

  const playOrderSound = async () => {
    try {
      await player.seekTo(0);
      player.play();
    } catch (error) {
      console.log('Sound play error:', error);
    }
  };

  return { playOrderSound };
}