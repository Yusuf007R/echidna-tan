import {useEffect, useState} from 'react';
import logo from './logo.svg';
import './App.css';
import {Button} from '@mantine/core';
import {io, Socket} from 'socket.io-client';
const socket = io('localhost:3000');
function App() {
  const [isPause, setisPause] = useState(false);

  useEffect(() => {
    socket.emit('joinGuild', import.meta.env.VITE_GUILD_ID);
    socket.on('pause', () => {
      setisPause(true);
    });
    socket.on('resume', () => {
      setisPause(false);
    });
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>Hello Vite + React!</p>
        <p>
          <Button
            disabled={isPause}
            onClick={() => {
              socket.emit('pause');
              setisPause(true);
            }}>
            pause
          </Button>
          <Button
            disabled={!isPause}
            onClick={() => {
              socket.emit('resume');
              setisPause(false);
            }}>
            resume
          </Button>
        </p>
        <p>
          Edit <code>App.tsx</code> and save to test HMR updates.
        </p>
        <p>
          <a
            className="App-link"
            href="https://reactjs.org"
            target="_blank"
            rel="noopener noreferrer">
            Learn React
          </a>
          {' | '}
          <a
            className="App-link"
            href="https://vitejs.dev/guide/features.html"
            target="_blank"
            rel="noopener noreferrer">
            Vite Docs
          </a>
        </p>
      </header>
    </div>
  );
}

export default App;
