import createContext from '@Api/context';
import isValidJWT from '@Api/middlewares/is-valid-jwt';
import {initTRPC} from '@trpc/server';

/**
 * Initialization of tRPC backend
 * Should be done only once per backend!
 */
const t = initTRPC.context<typeof createContext>().create();

/**
 * Export reusable router and procedure helpers
 * that can be used throughout the router
 */
export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(isValidJWT('access'));
export const refreshProcedure = t.procedure.use(isValidJWT('refresh'));
export const middleware = t.middleware;
