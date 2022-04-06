import { AudioResource, createAudioResource, StreamType } from '@discordjs/voice';
import {
  FFmpeg, opus, VolumeTransformer, opus as Opus,
} from 'prism-media';

import internal from 'stream';
import ytdl from 'ytdl-core';
import { socketTrack } from '../../../common/DTOs/music-player-socket';
import createYtStream from '../utils/create-yt-stream';

export default class Track {
  public url: string;

  private trackData: ytdl.videoInfo['videoDetails'] | null = null;

  private ytstream: internal.PassThrough | null = null;

  private transcoder: FFmpeg | null = null;

  volumenTransformer: VolumeTransformer | null = null;

  private stream: opus.Encoder | null = null;

  AudioResource: AudioResource<null> | null = null;

  private trackinfo: ytdl.videoInfo | null = null;

  beginTime = 0;

  constructor(url: string) {
    this.url = url;
  }

  async getInfo() {
    if (this.trackData) return this.trackData;
    this.trackData = (await ytdl.getBasicInfo(this.url)).videoDetails;
    return this.trackData;
  }

  async getStream(seek = 0, volume = 1) {
    this.beginTime = seek;
    if (!this.trackinfo) this.trackinfo = await ytdl.getInfo(this.url);
    const filteredFormats = this.trackinfo.formats
      .filter((item) => !!item.audioBitrate)
      .sort((a, b) => {
        if (!a.audioBitrate || !b.audioBitrate) return 1;
        return b.audioBitrate - a.audioBitrate;
      });
    if (!filteredFormats.length) throw new Error('no audio formats after filtering');
    const format = filteredFormats[0];

    this.ytstream = createYtStream(this.trackinfo, format, {});

    this.transcoder = new FFmpeg({
      args: [
        '-ss',
        seek.toString(),
        '-reconnect',
        '1',
        '-reconnect_streamed',
        '1',
        '-reconnect_delay_max',
        '5',
        '-analyzeduration',
        '0',
        '-loglevel',
        '0',
        '-f',
        's16le',
        '-ar',
        '48000',
        '-ac',
        '2',
      ],
      shell: false,
    });

    this.volumenTransformer = this.ytstream
      .pipe(this.transcoder)
      .pipe(new VolumeTransformer({ type: 's16le', volume }));

    this.stream = this.volumenTransformer.pipe(
      new Opus.Encoder({
        rate: 48000,
        channels: 2,
        frameSize: 960,
      }),
    );

    this.AudioResource = createAudioResource(this.stream, {
      inputType: StreamType.Opus,
    });
    this.AudioResource.playbackDuration;

    return this.AudioResource;
  }

  async toSocketTrack(): Promise<socketTrack> {
    const data = await this.getInfo();
    const thumbnails = [...data.thumbnails];
    thumbnails.sort((a, b) => b.width + b.height - (a.width + a.height));
    return {
      duration: Number(data.lengthSeconds),
      id: data.videoId,
      title: data.title,
      url: this.url,
      thumbnail: thumbnails.length ? thumbnails[0].url : undefined,
    };
  }

  getCurrentTime() {
    const time = this.AudioResource?.playbackDuration;
    const begin = this.beginTime;
    return (time ?? 0) / 1000 + (begin ?? 0);
  }
}
