import {protectedProcedure, router} from '@Api/trpc';
import {playerData} from '@Structures/custom-player';
import EchidnaSingleton from '@Structures/echidna-singleton';
import {observable} from '@trpc/server/observable';
import {z} from 'zod';

export default router({
  mutate: protectedProcedure
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
  data: protectedProcedure.subscription(({ctx}) => {
    console.log('subscribed');
    return observable<playerData>(emit => {
      console.log('subscribed');
      emit.next(EchidnaSingleton.echidna.musicPlayer.get('').getPlayerData());
    });
  }),
});
