import { EmbedBuilder } from '@discordjs/builders';
import { baseAPI } from '@Utils/request';
import { AttachmentBuilder, CacheType, CommandInteraction } from 'discord.js';
import { readFileSync } from 'fs';
import path from 'path';
import sharp from 'sharp';

export default class ValCrosshair {
  constructor() {}

  async getCrosshairImage(crosshairId: string) {
    return await baseAPI.get<Buffer>(
      'https://api.henrikdev.xyz/valorant/v1/crosshair/generate',
      { id: crosshairId },
      {
        responseType: 'arraybuffer'
      }
    );
  }

  async addBackgroundToCrosshair(crosshair: Buffer) {
    const crosshairBg = readFileSync(path.resolve(__dirname, '../../assets/crosshair-bg.webp'));
    return await sharp(crosshairBg)
      .composite([{ input: await sharp(crosshair).resize(256, 256).toBuffer() }])
      .toBuffer();
  }

  async getCrosshair(interaction: CommandInteraction<CacheType>, crosshairId: string) {
    const crosshair = await this.getCrosshairImage(crosshairId);
    if (!crosshair?.data) throw new Error('Internal error, try again later.');
    const crosshairWithBg = await this.addBackgroundToCrosshair(crosshair.data);
    const file = new AttachmentBuilder(crosshairWithBg, {
      name: 'crosshair.png'
    });

    const embed = new EmbedBuilder()
      .setTitle('Crosshair')
      .setDescription(`Crosshair ID: ${crosshairId}`)
      .setImage('attachment://crosshair.png')
      .setTimestamp()
      .setFooter({
        text: `Requested by ${interaction.user.username}`,
        iconURL: interaction.user.displayAvatarURL()
      });
    interaction.editReply({ embeds: [embed], files: [file] });
  }
}
