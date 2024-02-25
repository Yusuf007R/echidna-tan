import {IncomingMessage} from 'http';

export default function getToken(req: IncomingMessage) {
  return req.headers.authorization?.split(' ')?.at(1);
}
