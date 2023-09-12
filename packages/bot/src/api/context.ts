import getToken from '@ApiUtils/get-token';
import PrismaSingleton from '@Structures/prisma-client';
import type {CreateHTTPContextOptions} from '@trpc/server/adapters/standalone';

export default function createContext(opts: CreateHTTPContextOptions) {
  return {
    token: getToken(opts.req),
    prisma: PrismaSingleton.db,
  };
}
