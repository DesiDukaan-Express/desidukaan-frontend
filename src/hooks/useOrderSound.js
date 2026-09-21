import { useEffect, useRef } from 'react';

const SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

export default function useOrderSound() {
  const player = useAudioPlayer({ uri: SOUND_URL });

  useEffect(() => {
    // Load sound on mount
    const load = async () => {
      try {
        const { Audio } = require('expo-av');
        if (!Audio || !Audio.setAudioModeAsync) return;
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });
        const { sound } = await Audio.Sound.createAsync(
          { uri: SOUND_URL },
          { shouldPlay: false }
        );
        soundRef.current = sound;
      } catch (e) {
        console.log('Sound load error:', e);
      }
    };
    load();

    // Unload on unmount
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
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
