import {publicProcedure, refreshProcedure, router} from '@Api/trpc';
import {AccessTokenType} from '@ApiInterfaces/jwt';
import config from '@Configs';
import DiscordAPI from '@Structures/discord-api';
import {Prisma} from '@prisma/client';
import {TRPCError} from '@trpc/server';
import {sign} from 'jsonwebtoken';
import {z} from 'zod';

// Auth router
export default router({
  login: publicProcedure
    .input(
      z.object({
        access_token: z.string(),
        refresh_token: z.string(),
        expires_in: z.number(),
        token_type: z.string(),
      }),
    )
    .mutation(async ({ctx, input}) => {
      const user = await new DiscordAPI()
        .setToken(input.access_token)
        .getUserInfo();

      if (!user)
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid token',
        });

      const temp: Prisma.UserCreateInput = {
        discordId: user.id,
        username: user.username,
        globalName: user.global_name,
        accent_color: user.accent_color,
        avatar: user.avatar,
        email: user.email,
      };

      const dbUser = await ctx.prisma.user.upsert({
        where: {
          discordId: user.id,
        },
        create: temp,
        update: temp,
      });

      const jwtPayload: AccessTokenType = {
        dcToken: input.access_token,
        displayName: user.global_name || user.username,
        userId: dbUser.id,
        username: user.username,
      };

      const token = sign(jwtPayload, config.jwtSecretAccess, {
        expiresIn: '5m',
      });

      const refreshToken = sign(jwtPayload, config.jwtSecretRefresh);

      await ctx.prisma.token.create({
        data: {
          discordToken: input.access_token,
          token: refreshToken,
          userId: dbUser.id,
        },
      });

      return {
        accessToken: token,
        refreshToken: refreshToken,
        expiresIn: 300,
      };
    }),
  refreshTokens: refreshProcedure.mutation(async ({ctx}) => {
    const user = await ctx.prisma.user.findUnique({
      where: {
        id: ctx.decodedJwt.userId,
      },
      include: {
        tokens: {where: {token: ctx.token}},
      },
    });
    const userToken = user?.tokens?.at(0);
    if (!user || !userToken)
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Invalid token',
      });

    const jwtPayload: AccessTokenType = {
      dcToken: userToken.discordToken,
      displayName: user.globalName || user.username,
      userId: user.id,
      username: user.username,
    };

    const token = sign(jwtPayload, config.jwtSecretAccess, {
      expiresIn: '5m',
    });

    return {
      accessToken: token,
      expiresIn: 300,
    };
  }),
});
