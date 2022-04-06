import {io, Socket} from 'socket.io-client';
import {
  ClientToServerEvents,
  ServerToClientEvents,
} from '../../../common/DTOs/music-player-socket';
import config from '../configs';

const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
  config.url,
);

socket.emit('joinGuild', config.guildId);

export default socket;
