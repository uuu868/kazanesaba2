const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { ensureAllowed } = require('../utils/roleGuard');
const voiceActivityManager = require('../utils/voiceActivityManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('voice-activity')
    .setDescription('ボイスチャットのアクティビティランキングを表示します')
    .addSubcommand(subcommand =>
      subcommand
        .setName('ranking')
        .setDescription('ボイスチャット参加時間のランキングを表示')
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
        .setDescription('特定ユーザーのボイスアクティビティを表示')
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
        .setDescription('このサーバーのボイスアクティビティデータをリセットします（管理者のみ）')
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
  const ranking = voiceActivityManager.getVoiceActivityRanking(interaction.guild.id, limit);

  if (ranking.length === 0) {
    await interaction.reply({
      content: 'まだボイスアクティビティデータがありません。',
      ephemeral: true
    });
    return;
  }

  // ランキング用のEmbed作成
  const embed = new EmbedBuilder()
    .setColor('#9B59B6')
    .setTitle('🎤 ボイスアクティビティランキング')
    .setTimestamp();

  // ランクごとにメダルを表示
  const medals = ['🥇', '🥈', '🥉'];
  
  let description = '';
  for (let i = 0; i < ranking.length; i++) {
    const user = ranking[i];
    const medal = i < 3 ? medals[i] : `**${i + 1}位**`;
    const duration = voiceActivityManager.formatDuration(user.totalTime);
    
    description += `${medal} <@${user.userId}>\n`;
    description += `└ 通話時間: **${duration}** (${user.sessionCount}回)\n\n`;
  }

  embed.setDescription(description);

  await interaction.reply({ embeds: [embed] });
}

/**
 * 個別ユーザーのボイスアクティビティ表示処理
 */
async function handleUser(interaction) {
  const targetUser = interaction.options.getUser('target') || interaction.user;
  const activity = voiceActivityManager.getUserVoiceActivity(interaction.guild.id, targetUser.id);

  if (!activity) {
    await interaction.reply({
      content: `${targetUser.username} のボイスアクティビティデータがまだありません。`,
      ephemeral: true
    });
    return;
  }

  // 全体のランキングを取得して順位を計算
  const allRanking = voiceActivityManager.getVoiceActivityRanking(interaction.guild.id, 1000);
  const rank = allRanking.findIndex(u => u.userId === targetUser.id) + 1;

  const duration = voiceActivityManager.formatDuration(activity.totalTime);
  const status = activity.isInVoice ? '🔴 通話中' : '⚪ オフライン';

  const embed = new EmbedBuilder()
    .setColor('#9B59B6')
    .setTitle(`🎤 ${activity.username} のボイスアクティビティ`)
    .addFields(
      { name: '通話時間', value: duration, inline: true },
      { name: 'サーバー内順位', value: `${rank} 位`, inline: true },
      { name: 'セッション回数', value: `${activity.sessionCount} 回`, inline: true },
      { name: 'ステータス', value: status, inline: true }
    )
    .setThumbnail(targetUser.displayAvatarURL())
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

/**
 * ボイスアクティビティデータリセット処理（管理者のみ）
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

  const success = voiceActivityManager.resetVoiceActivity(interaction.guild.id);

  if (success) {
    await interaction.reply({
      content: '✅ このサーバーのボイスアクティビティデータをリセットしました。',
      ephemeral: true
    });
  } else {
    await interaction.reply({
      content: 'リセットするデータがありませんでした。',
      ephemeral: true
    });
  }
}
