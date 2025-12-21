const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('音楽を再生します')
    .addStringOption(option =>
      option
        .setName('query')
        .setDescription('曲名またはURL')
        .setRequired(true)
    ),

  async execute(interaction) {
    // 即座にdeferReplyを呼び出してタイムアウトを防ぐ
    await interaction.deferReply();

    const query = interaction.options.getString('query');
    const member = interaction.member;

    // ボイスチャンネルにいるかチェック
    if (!member.voice.channel) {
      return await interaction.editReply({
        content: '❌ ボイスチャンネルに接続してください。'
      });
    }

    try {
      const { track } = await interaction.client.player.play(member.voice.channel, query, {
        nodeOptions: {
          metadata: {
            channel: interaction.channel,
            requestedBy: interaction.user
          }
        }
      });

      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('🎵 再生開始')
        .setDescription(`**${track.title}**`)
        .addFields(
          { name: '長さ', value: track.duration, inline: true },
          { name: 'リクエスト', value: interaction.user.username, inline: true }
        )
        .setThumbnail(track.thumbnail);

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('[Play] エラー:', error);
      await interaction.editReply({
        content: `❌ エラーが発生しました: ${error.message}`
      });
    }
  },
};
