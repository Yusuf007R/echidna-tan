import {
  Box,
  Button,
  Flex,
  Icon,
  IconButton,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
} from '@chakra-ui/react';
import {useEffect, useRef} from 'react';

import {
  MdLoop,
  MdPause,
  MdPlayArrow,
  MdSkipNext,
  MdSkipPrevious,
  MdVolumeUp,
} from 'react-icons/md';
import {LoopState} from '../../../../common/DTOs/music-player-socket';

import {useAppActions, useAppState} from '../../stores/store';
import MusicProgressBar from '../music-progress-bar';
import VolumeControl from '../volume-control';

export default function BottomBar() {
  const isPaused = useAppState(state => state.musicPlayer.isPaused);

  const loopState = useAppState(state => state.musicPlayer.data?.loop);

  const togglePause = useAppActions(actions => actions.musicPlayer.togglePause);

  const loop = useAppActions(actions => actions.musicPlayer.loop);

  return (
    <Flex w="100%" position="fixed" bottom="0" flexDirection="column" h="95px">
      <Box position="relative" top="15px">
        <MusicProgressBar />
      </Box>
      <Flex
        w="100%"
        h="70px"
        bg="gray.900"
        px={5}
        justifyContent="space-between"
        align="center">
        <Box />
        <Flex justifyContent="space-between">
          <IconButton
            fontSize="2xl"
            mx="4"
            icon={<MdSkipPrevious />}
            aria-label="back"
          />
          <IconButton
            fontSize="2xl"
            mx="4"
            onClick={() => togglePause()}
            icon={isPaused ? <MdPlayArrow /> : <MdPause />}
            aria-label="pause"
          />
          <IconButton
            mx="4"
            fontSize="2xl"
            icon={<MdSkipNext />}
            aria-label="forward"
          />
        </Flex>
        <Flex>
          <VolumeControl />
          <IconButton
            onClick={() => loop()}
            aria-label="Loop mode"
            fontSize="2xl"
            color={loopState !== LoopState.None ? 'white' : 'gray.600'}
            icon={
              <Box>
                <MdLoop />
                {loopState === LoopState.Single && (
                  <Box
                    top={0}
                    right={0}
                    w="35%"
                    h="35%"
                    display="flex"
                    justifyContent="center"
                    alignItems="center"
                    fontSize="60%"
                    pos="absolute">
                    1
                  </Box>
                )}
              </Box>
            }
          />
        </Flex>
      </Flex>
    </Flex>
  );
}
