import {
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
} from '@chakra-ui/react';
import {useEffect, useRef} from 'react';

import {useAppActions, useAppState} from '../../stores/store';

export default function MusicProgressBar() {
  const interval = useRef<NodeJS.Timer | null>(null);
  const musicProgressValue = useAppState(
    state => state.musicPlayer.musicProgressValue,
  );
  const seek = useAppActions(actions => actions.musicPlayer.seek);

  const isPlaying = useAppState(state => state.musicPlayer.isPlaying);
  const incrementMusicProgress = useAppActions(
    actions => actions.musicPlayer.incrementCurrentTime,
  );

  useEffect(() => {
    if (!isPlaying) return;
    interval.current = setInterval(() => {
      incrementMusicProgress(0.5);
    }, 500);

    return () => {
      if (interval.current) {
        clearInterval(interval.current);
      }
    };
  }, [isPlaying]);
  return (
    <Slider
      onChange={value => {
        seek(value);
      }}
      value={musicProgressValue}>
      <SliderTrack>
        <SliderFilledTrack />
      </SliderTrack>
      <SliderThumb />
    </Slider>
  );
}
