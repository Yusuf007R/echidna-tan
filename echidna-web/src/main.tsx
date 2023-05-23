import React from 'react';
import { createRoot } from 'react-dom/client';

import {ChakraProvider} from '@chakra-ui/react';
import {StoreProvider} from 'easy-peasy';
import App from './App';
import {store} from './stores/store';
import theme from './theme';


const container = document.getElementById('root')!;
const root = createRoot(container); 

root.render(
  <React.StrictMode>
    <ChakraProvider theme={theme}>
      <StoreProvider store={store}>
        <App />
      </StoreProvider>
    </ChakraProvider>
  </React.StrictMode>,
);
