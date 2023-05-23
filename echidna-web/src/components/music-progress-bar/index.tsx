import {
  keyframes,
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

  const key = keyframes`
    0%{background-position:32% 0%}
    50%{background-position:69% 100%}
    100%{background-position:32% 0%}
  `;

  return (
    <Slider
      onChange={value => {
        seek(value);
      }}
      value={musicProgressValue}>
      <SliderTrack h="5px">
        <SliderFilledTrack
          sx={{
            backgroundSize: '600% 600%',
            animationPlayState: isPlaying ? 'running' : 'paused',
          }}
          bgGradient="linear(to-r, pink.700, pink.400, purple.400, purple.700)"
          animation={`${key} infinite 4s linear`}
        />
      </SliderTrack>
      <SliderThumb w="12px" h="12px" />
    </Slider>
  );
}
