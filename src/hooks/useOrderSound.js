import { useEffect, useRef } from 'react';
import { Audio } from 'expo-av';

const SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

export default function useOrderSound() {
  const soundRef = useRef(null);

  useEffect(() => {
    // Load sound on mount
    const load = async () => {
      try {
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

  const playOrderSound = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.replayAsync();
      }
    } catch (e) {
      console.log('Sound play error:', e);
    }
  };

  return { playOrderSound };
}