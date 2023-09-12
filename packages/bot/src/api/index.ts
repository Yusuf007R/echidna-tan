import createContext from '@Api/context';
import {router} from '@Api/trpc';
import authrouter from '@ApiRouters/auth-router';
import musicRouter from '@ApiRouters/music-router';
import {createHTTPServer} from '@trpc/server/adapters/standalone';
import cors from 'cors';

const appRouter = router({
  music: musicRouter,
  auth: authrouter,
});

const server = createHTTPServer({
  middleware: cors(),
  router: appRouter,
  createContext,
});

// const wss = new ws.Server({
//   port: 3066,
// });
// const handler = applyWSSHandler({wss, router: appRouter});

// wss.on('connection', ws => {
//   console.log(`➕➕ Connection (${wss.clients.size})`);
//   ws.once('close', () => {
//     console.log(`➖➖ Connection (${wss.clients.size})`);
//   });
// });
// console.log('✅ WebSocket Server listening on ws://localhost:3066');

process.on('SIGTERM', () => {
  console.log('SIGTERM');
  // handler.broadcastReconnectNotification();
  // wss.close();
});

server.listen(3069);

export type AppRouter = typeof appRouter;
