import {baseAPI} from '@Utils/request';
import wait from '@Utils/wait';
import {
  AttachmentBuilder,
  CacheType,
  Collection,
  CommandInteraction,
  EmbedType,
  Message,
} from 'discord.js';
import {Readable, Stream} from 'stream';
import z, {ZodError} from 'zod';

import ffmpegStatic from 'ffmpeg-static';
import Ffmpeg from 'fluent-ffmpeg';

if (ffmpegStatic === null) throw new Error('ffmpeg-static path not found');

Ffmpeg.setFfmpegPath(ffmpegStatic);

type gifType = 'gif' | 'mp4';

type gifTypeContent = {
  url: string;
  type: gifType;
  aspectRatio: number;
};

type gifResizeOptions = {
  width: number;
  height?: number;
};

export default class GifResize {
  constructor() {}

  async manageInteraction(
    interaction: CommandInteraction<CacheType>,
    options: gifResizeOptions,
  ) {
    interaction.reply('Please provide a gif to resize');

    const dmChannel = await interaction.user.createDM();

    try {
      const collected = await dmChannel?.awaitMessages({
        max: 1,
        time: 60000,
        errors: ['time'],
        filter: m => m.author.id === interaction.user.id,
      });
      const message = collected.first();
      if (!message) throw new Error('Internal error, try again later.');

      const gif = await this.getGifUrl(message, 0);

      if (!gif) throw new Error('Gif Not Found');
      dmChannel.sendTyping();

      const gifBuffer = await this.resize(gif, options);

      const file = new AttachmentBuilder(gifBuffer, {
        name: 'resized.gif',
      });

      dmChannel.send({files: [file]});
    } catch (error) {
      if (error instanceof ZodError) {
        throw new Error('Not a valid GIF');
      }

      if (error instanceof Collection) {
        throw new Error('You took too long to send the GIF max 60 seconds');
      }

      throw new Error('Internal error, try again later.');
    }
  }

  async getGifUrl(
    message: Message<boolean>,
    deepness: number,
  ): Promise<gifTypeContent | undefined> {
    if (deepness > 4) return undefined;

    const attachment = message.attachments.first();
    if (attachment && attachment.contentType === 'image/gif') {
      return {
        url: attachment.proxyURL,
        type: 'gif',
        aspectRatio: (attachment.height ?? 1) / (attachment.width ?? 1),
      };
    }

    if (!z.string().url().parse(message.content)) return undefined;

    const embed = message?.embeds?.at(0);
    if (embed) {
      const type = embed.data.type?.toString() as EmbedType | undefined;

      if (!type) return undefined;

      const validTypes: `${EmbedType}`[] = ['gifv', 'image'];

      if (!validTypes.includes(type)) return undefined;

      if (type === 'image' && embed.data.thumbnail?.proxy_url) {
        const {proxy_url, height, width} = embed.data.thumbnail;
        return {
          url: proxy_url,
          type: 'gif',
          aspectRatio: (height ?? 1) / (width ?? 1),
        };
      }
      if (type === 'gifv' && embed.data.video?.proxy_url) {
        const {proxy_url, height, width} = embed.data.video;
        return {
          url: proxy_url,
          type: 'mp4',
          aspectRatio: (height ?? 1) / (width ?? 1),
        };
      }

      return undefined;
    }
    await wait(200);
    const newMsg = await message.fetch(true);

    return this.getGifUrl(newMsg, deepness + 1);
  }

  async resize(gif: gifTypeContent, options: gifResizeOptions) {
    const gifBuffer = await this.getBufferFromUrl(gif.url);
    const readebleStream = Readable.from(gifBuffer);
    const bufferStream = new Stream.PassThrough();

    const {width} = options;
    const height = options.height ?? Math.floor(width * gif.aspectRatio);

    return new Promise((resolve, _) => {
      Ffmpeg(readebleStream)
        .complexFilter(
          ` [0:v] scale=${width}:${height}:flags=lanczos,split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse`,
        )
        .toFormat('gif')
        .writeToStream(bufferStream);

      const buffers: any[] = [];

      bufferStream.on('data', function (buf) {
        buffers.push(buf);
      });

      bufferStream.on('end', function () {
        resolve(Buffer.concat(buffers));
        bufferStream.destroy();
      });
    }) as Promise<Buffer>;
  }

  async getBufferFromUrl(url: string) {
    const res = await baseAPI.get<Buffer>(url, undefined, {
      responseType: 'arraybuffer',
    });

    if (!res.data) throw new Error('Internal error, try again later.');
    return res.data;
  }
}
