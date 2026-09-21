import { useEffect } from 'react';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';

const SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

export default function useOrderSound() {
  const player = useAudioPlayer({ uri: SOUND_URL });

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
    });
  }, []);

  const playOrderSound = () => {
    try {
      player.seekTo(0);
      player.play();
    } catch (e) {
      console.log('Sound play error:', e);
    }
  };

  return { playOrderSound };
}
