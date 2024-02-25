import {IncomingMessage} from 'http';

export default function getGuildId(req: IncomingMessage) {
  return req.headers['guild-id'] as string | undefined;
}
