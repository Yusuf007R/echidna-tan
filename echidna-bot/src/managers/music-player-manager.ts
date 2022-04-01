import { Collection } from 'discord.js';
import MusicPlayer from '../structures/music-player';

export default class MusicPlayerManager extends Collection<string, MusicPlayer> {
  constructor() {
    super();
  }

  getOrCreate(guildId: string): MusicPlayer {
    return this.get(guildId) ?? this.create(guildId);
  }

  create(guildId: string): MusicPlayer {
    const player = new MusicPlayer();
    this.set(guildId, player);
    return player;
  }
}
