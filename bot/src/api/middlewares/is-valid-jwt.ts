import config from '@Configs';
import {TRPCError} from '@trpc/server';
import * as jwt from 'jsonwebtoken';
import {AccessTokenType, RefreshTokenType} from '../interfaces/jwt';
import {middleware} from '../trpc';

export default function isValidJWT<T extends 'access' | 'refresh'>(type: T) {
  return middleware(({ctx, next}) => {
    try {
      const token = ctx.token;
      if (!token)
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'No token provided',
        });

      const decodedJwt = jwt.verify(
        token,
        type === 'access' ? config.jwtSecretAccess : config.jwtSecretRefresh,
      ) as T extends 'access' ? AccessTokenType : RefreshTokenType;
      return next({
        ctx: {
          ...ctx,
          decodedJwt,
          token,
        },
      });
    } catch (error) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Invalid token',
      });
    }
  });
}
