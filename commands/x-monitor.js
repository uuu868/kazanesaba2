const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const dataStore = require('../utils/dataStore');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('x-monitor')
    .setDescription('Xアカウントの監視設定を管理します（Bot作成者のみ）')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('監視するXアカウントを追加')
        .addStringOption(option =>
          option.setName('username')
            .setDescription('Xのユーザー名（@なし）')
            .setRequired(true))
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('投稿先のDiscordチャンネル')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('監視を停止するXアカウントを削除')
        .addStringOption(option =>
          option.setName('username')
            .setDescription('Xのユーザー名（@なし）')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('監視中のXアカウント一覧を表示'))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(client, interaction) {
    // Bot作成者のみ実行可能
    const botCreatorId = '1088020702583603270';
    if (interaction.user.id !== botCreatorId) {
      await interaction.reply({ 
        content: '❌ このコマンドはBot作成者のみ使用できます。', 
        flags: 64 
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'add') {
      const username = interaction.options.getString('username').replace('@', '');
      const channel = interaction.options.getChannel('channel');

      // 既存の監視リストを取得
      const monitors = dataStore.getMapping('x_monitors') || [];

      // 重複チェック
      const existing = monitors.find(m => m.username.toLowerCase() === username.toLowerCase());
      if (existing) {
        await interaction.reply({
          content: `⚠️ @${username} は既に監視対象です。`,
          flags: 64
        });
        return;
      }

      // 新しい監視対象を追加
      monitors.push({
        username: username,
        channelId: channel.id,
        lastTweetId: null,
        addedAt: new Date().toISOString(),
        addedBy: interaction.user.id
      });

      dataStore.saveMapping('x_monitors', monitors);

      await interaction.reply({
        content: `✅ @${username} の監視を開始しました。\n投稿先: ${channel}`,
        flags: 64
      });

    } else if (subcommand === 'remove') {
      const username = interaction.options.getString('username').replace('@', '');

      // 既存の監視リストを取得
      const monitors = dataStore.getMapping('x_monitors') || [];

      // 削除対象を検索
      const index = monitors.findIndex(m => m.username.toLowerCase() === username.toLowerCase());
      if (index === -1) {
        await interaction.reply({
          content: `⚠️ @${username} は監視対象に登録されていません。`,
          flags: 64
        });
        return;
      }

      // 削除
      monitors.splice(index, 1);
      dataStore.saveMapping('x_monitors', monitors);

      await interaction.reply({
        content: `✅ @${username} の監視を停止しました。`,
        flags: 64
      });

    } else if (subcommand === 'list') {
      const monitors = dataStore.getMapping('x_monitors') || [];

      if (monitors.length === 0) {
        await interaction.reply({
          content: '📋 現在監視中のXアカウントはありません。',
          flags: 64
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('📋 監視中のXアカウント')
        .setColor(0x1DA1F2)
        .setDescription(monitors.map((m, i) => {
          const channel = interaction.guild.channels.cache.get(m.channelId);
          return `${i + 1}. **@${m.username}**\n   └ 投稿先: ${channel || `ID: ${m.channelId}`}`;
        }).join('\n\n'))
        .setFooter({ text: `合計: ${monitors.length}アカウント` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], flags: 64 });
    }
  }
};
