import { socketTrack } from '../../../common/DTOs/music-player-socket';
import Track from '../structures/track';

export default async function queueToSocketQueue(queue: Track[]) {
  return (await Promise.allSettled([...queue.map(async (track) => await track.toSocketTrack())]))
    .map((element) => {
      if (element.status === 'fulfilled') {
        return element.value;
      }
      return null;
    })
    .filter((element) => element !== null) as socketTrack[];
}
