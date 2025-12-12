const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder, StringSelectMenuBuilder } = require('discord.js');
const { ensureAllowed } = require('../utils/roleGuard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-panel')
    .setDescription('チケット作成パネルを指定チャンネルに送信します')
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

      const embed = new EmbedBuilder()
        .setTitle('お問い合わせのチケット発行はこちら')
        .setDescription('📛 該当項目がない場合は「その他」を選択してください。\n\n用件を選択してチケットを発行すると「ticket-◯◯」というあなた専用のチャンネルが作成されます。\n作成されたチャンネル内でお問い合わせ内容の記載をお願いします。\n運営の確認次第、順次返信いたします。')
        .setColor(0x5865F2);

      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('ticket_select')
          .setPlaceholder('用件を選択してください')
          .addOptions([
            {
              label: '質問・相談',
              description: '一般的な質問や相談',
              value: 'question',
              emoji: '❓'
            },
            {
              label: '不具合報告',
              description: 'バグや問題の報告',
              value: 'bug',
              emoji: '🐛'
            },
            {
              label: '提案・要望',
              description: '新機能の提案や要望',
              value: 'suggestion',
              emoji: '💡'
            },
            {
              label: 'その他',
              description: '上記以外のお問い合わせ',
              value: 'other',
              emoji: '📋'
            }
          ])
      );

      await targetChannel.send({
        embeds: [embed],
        components: [row]
      });

      await interaction.reply({
        content: `✅ チケットパネルを送信しました: ${targetChannel}`,
        flags: 64
      });
    } catch (err) {
      console.error('[Ticket Panel] error:', err);
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({ content: 'エラーが発生しました。' });
        } else {
          await interaction.reply({ content: 'エラーが発生しました。', flags: 64 });
        }
      } catch (e) {
        console.error('[Ticket Panel] reply error:', e);
      }
    }
  }
};
