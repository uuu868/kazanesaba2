const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const { ensureAllowed } = require('../utils/roleGuard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-panel')
    .setDescription('チケット作成ボタンを指定チャンネルに送信します')
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('パネルを送信するテキストチャンネル')
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
    ),

  async execute(client, interaction) {
    try {
      if (!(await ensureAllowed(interaction))) return;

      const targetChannel = interaction.options.getChannel('channel');

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('ticket_create')
          .setLabel('チケットを作成')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🎫')
      );

      await targetChannel.send({
        content: 'サポートが必要な方は下のボタンを押してチケットを作成してください。',
        components: [row]
      });

      await interaction.reply({
        content: `✅ チケットパネルを送信しました: ${targetChannel}`,
        ephemeral: true
      });
    } catch (err) {
      console.error('[Ticket Panel] error:', err);
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({ content: 'エラーが発生しました。' });
        } else {
          await interaction.reply({ content: 'エラーが発生しました。', ephemeral: true });
        }
      } catch (e) {
        console.error('[Ticket Panel] reply error:', e);
      }
    }
  }
};
