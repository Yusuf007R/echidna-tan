import {
  Popover,
  PopoverTrigger,
  IconButton,
  PopoverContent,
  PopoverArrow,
  PopoverBody,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
} from '@chakra-ui/react';

import {MdVolumeUp} from 'react-icons/md';
import {useAppActions, useAppState} from '../../stores/store';

export default function VolumeControl() {
  const volume = useAppState(state => state.musicPlayer.data?.volume);
  const setVolume = useAppActions(actions => actions.musicPlayer.volume);

  return (
    <Popover closeOnBlur={false} trigger="hover">
      <PopoverTrigger>
        <IconButton
          mx="4"
          fontSize="2xl"
          aria-label="change volume"
          icon={<MdVolumeUp />}
        />
      </PopoverTrigger>
      <PopoverContent w="40px" h="180px" py={1}>
        <PopoverArrow />
        <PopoverBody w="full" h="full">
          <Slider
            h="full"
            orientation="vertical"
            onChange={value => {
              setVolume(value);
            }}
            value={volume ?? 0}>
            <SliderTrack>
              <SliderFilledTrack />
            </SliderTrack>
            <SliderThumb />
          </Slider>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
}
