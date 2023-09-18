import isGuild from '@ApiMiddlewares/is-guild';
import isValidJWT from '@ApiMiddlewares/is-valid-jwt';
import {t} from './trpc';

export const refreshProcedure = t.procedure.use(isValidJWT('refresh'));
export const protectedProcedure = t.procedure.use(isValidJWT('access'));
export const publicProcedure = t.procedure;
export const guildProcedure = t.procedure.use(isGuild);
