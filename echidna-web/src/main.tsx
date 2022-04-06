import React from 'react';
import ReactDOM from 'react-dom';

import {ChakraProvider} from '@chakra-ui/react';
import {StoreProvider} from 'easy-peasy';
import App from './App';
import {store} from './stores/store';

ReactDOM.render(
  <React.StrictMode>
    <ChakraProvider>
      <StoreProvider store={store}>
        <App />
      </StoreProvider>
    </ChakraProvider>
  </React.StrictMode>,
  document.getElementById('root'),
);
