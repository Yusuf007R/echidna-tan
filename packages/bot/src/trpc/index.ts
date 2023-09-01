import {createHTTPServer} from '@trpc/server/adapters/standalone';
import {applyWSSHandler} from '@trpc/server/adapters/ws';
import {observable} from '@trpc/server/observable';
import ws from 'ws';

import cors from 'cors';
import {z} from 'zod';
import {playerData} from '../structures/custom-player';
import EchidnaSingleton from '../structures/echidna-singleton';
import {publicProcedure, router} from './trpc';

const appRouter = router({
  mutate: publicProcedure
    .input(
      z.union([
        z.object({
          name: z.literal('play'),
          input: z.undefined(),
        }),
        z.object({
          name: z.literal('pause'),
          input: z.boolean().optional(),
        }),
        z.object({
          name: z.literal('stop'),
          input: z.undefined(),
        }),
        z.object({
          name: z.literal('seekTo'),
          input: z.number(),
        }),
        z.object({
          name: z.literal('setVolume'),
          input: z.number(),
        }),
        z.object({
          name: z.literal('setLoop'),
          input: z.union([
            z.literal('NONE'),
            z.literal('TRACK'),
            z.literal('QUEUE'),
          ]),
        }),
      ]),
    )
    .mutation(({ctx, input}) => {
      return EchidnaSingleton.echidna.musicPlayer
        .get('')
        .callMethod(input.name, input?.input);
    }),
  data: publicProcedure.subscription(({ctx}) => {
    console.log('subscribed');
    return observable<playerData>(emit => {
      console.log('subscribed');
      emit.next(EchidnaSingleton.echidna.musicPlayer.get('').getPlayerData());
    });
  }),
});

const server = createHTTPServer({
  middleware: cors(),
  router: appRouter,
});

const wss = new ws.Server({
  port: 3066,
});
const handler = applyWSSHandler({wss, router: appRouter});

wss.on('connection', ws => {
  console.log(`➕➕ Connection (${wss.clients.size})`);
  ws.once('close', () => {
    console.log(`➖➖ Connection (${wss.clients.size})`);
  });
});
console.log('✅ WebSocket Server listening on ws://localhost:3066');

server.listen(3069);

export type AppRouter = typeof appRouter;
