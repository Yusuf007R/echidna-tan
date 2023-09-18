import {middleware} from '@Api/trpc';
import {TRPCError} from '@trpc/server';

export default middleware(({ctx, next}) => {
  if (!ctx.guildId)
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'No guild id provided',
    });
  return next({
    ctx: {
      ...ctx,
      guildId: ctx.guildId,
    },
  });
});
