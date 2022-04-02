import Track from '../structures/track';

export default async function queueToSocketQueue(queue: Track[]) {
  return await Promise.all([...queue.map(async (track) => await track.toSocketTrack())]);
}
