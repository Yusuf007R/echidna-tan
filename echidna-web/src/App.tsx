import {Box, Flex} from '@chakra-ui/react';

import NavBar from './components/nav-bar';
import BottomBar from './components/bottom-bar';

import useSocketListeners from './hooks/use-socket-listeners';

function App() {
  const listeners = useSocketListeners();
  return (
    <Box>
      <NavBar />
      <Flex
        h="calc(100vh - 65px - 95px)"
        justifyContent="space-between"
        flexDirection="column">
        <BottomBar />
      </Flex>
    </Box>
  );
}

export default App;
