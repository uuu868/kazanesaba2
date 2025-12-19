const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { ensureAllowed } = require('../utils/roleGuard');
const activityManager = require('../utils/activityManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('activity')
    .setDescription('サーバーのアクティビティランキングを表示します')
    .addSubcommand(subcommand =>
      subcommand
        .setName('ranking')
        .setDescription('アクティブなユーザーのランキングを表示')
        .addIntegerOption(option =>
          option
            .setName('limit')
            .setDescription('表示する人数（デフォルト: 10）')
            .setMinValue(1)
            .setMaxValue(25)
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('user')
        .setDescription('特定ユーザーのアクティビティを表示')
        .addUserOption(option =>
          option
            .setName('target')
            .setDescription('確認するユーザー')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('reset')
        .setDescription('このサーバーのアクティビティデータをリセットします（管理者のみ）')
    ),

  async execute(client, interaction) {
    // ロールチェック
    if (!(await ensureAllowed(interaction))) return;

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'ranking') {
      await handleRanking(interaction);
    } else if (subcommand === 'user') {
      await handleUser(interaction);
    } else if (subcommand === 'reset') {
      await handleReset(interaction);
    }
  },
};

/**
 * ランキング表示処理
 */
async function handleRanking(interaction) {
  const limit = interaction.options.getInteger('limit') || 10;
  const ranking = activityManager.getActivityRanking(interaction.guild.id, limit);

  if (ranking.length === 0) {
    await interaction.reply({
      content: 'まだアクティビティデータがありません。',
      ephemeral: true
    });
    return;
  }

  // ランキング用のEmbed作成
  const embed = new EmbedBuilder()
    .setColor('#FFD700')
    .setTitle('📊 アクティビティランキング')
    .setDescription(`${interaction.guild.name} で最もアクティブなユーザートップ${Math.min(limit, ranking.length)}`)
    .setTimestamp();

  // ランクごとにメダルを表示
  const medals = ['🥇', '🥈', '🥉'];
  
  let description = '';
  for (let i = 0; i < ranking.length; i++) {
    const user = ranking[i];
    const medal = i < 3 ? medals[i] : `**${i + 1}位**`;
    const lastActive = user.lastMessageAt 
      ? `最終: <t:${Math.floor(new Date(user.lastMessageAt).getTime() / 1000)}:R>`
      : '';
    
    description += `${medal} <@${user.userId}>\n`;
    description += `└ メッセージ数: **${user.messageCount}** ${lastActive}\n\n`;
  }

  embed.setDescription(description);

  await interaction.reply({ embeds: [embed] });
}

/**
 * 個別ユーザーのアクティビティ表示処理
 */
async function handleUser(interaction) {
  const targetUser = interaction.options.getUser('target') || interaction.user;
  const activity = activityManager.getUserActivity(interaction.guild.id, targetUser.id);

  if (!activity) {
    await interaction.reply({
      content: `${targetUser.username} のアクティビティデータがまだありません。`,
      ephemeral: true
    });
    return;
  }

  // 全体のランキングを取得して順位を計算
  const allRanking = activityManager.getActivityRanking(interaction.guild.id, 1000);
  const rank = allRanking.findIndex(u => u.userId === targetUser.id) + 1;

  const embed = new EmbedBuilder()
    .setColor('#5865F2')
    .setTitle(`📈 ${activity.username} のアクティビティ`)
    .addFields(
      { name: 'メッセージ数', value: `${activity.messageCount} 件`, inline: true },
      { name: 'サーバー内順位', value: `${rank} 位`, inline: true },
      { 
        name: '最終メッセージ', 
        value: activity.lastMessageAt 
          ? `<t:${Math.floor(new Date(activity.lastMessageAt).getTime() / 1000)}:R>` 
          : '不明',
        inline: true 
      }
    )
    .setThumbnail(targetUser.displayAvatarURL())
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

/**
 * アクティビティデータリセット処理（管理者のみ）
 */
async function handleReset(interaction) {
  // 管理者権限チェック
  if (!interaction.member.permissions.has('Administrator')) {
    await interaction.reply({
      content: 'このコマンドは管理者のみが使用できます。',
      ephemeral: true
    });
    return;
  }

  const success = activityManager.resetActivity(interaction.guild.id);

  if (success) {
    await interaction.reply({
      content: '✅ このサーバーのアクティビティデータをリセットしました。',
      ephemeral: true
    });
  } else {
    await interaction.reply({
      content: 'リセットするデータがありませんでした。',
      ephemeral: true
    });
  }
}
