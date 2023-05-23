import {Box, Flex} from '@chakra-ui/react';

import NavBar from './components/nav-bar';
import BottomBar from './components/bottom-bar';

import useSocketListeners from './hooks/use-socket-listeners';
import {useAppState} from './stores/store';

function App() {
  useSocketListeners();

  const queue = useAppState(state => state.musicPlayer.data?.queue);
  return (
    <Box>
      <NavBar />
      <Flex
        h="calc(100vh - 65px - 70px)"
        justifyContent="space-between"
        flexDirection="row">
        <Box w="50%" h="full" />
        <Box w="50%" h="full" bg="red" />
        <BottomBar />
      </Flex>
    </Box>
  );
}

export default App;
