const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { ensureAllowed } = require('../utils/roleGuard');
const activityManager = require('../utils/activityManager');
const voiceActivityManager = require('../utils/voiceActivityManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('activity')
    .setDescription('サーバーのアクティビティランキングを表示します')
    .addSubcommand(subcommand =>
      subcommand
        .setName('ranking')
        .setDescription('メッセージ＋ボイスの総合アクティビティランキングを表示')
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
        .setName('message')
        .setDescription('メッセージ数のランキングを表示')
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
        .setName('voice')
        .setDescription('ボイス参加時間のランキングを表示')
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

  async execute(interaction) {
    const client = interaction.client;
    
    // ロールチェック
    if (!(await ensureAllowed(interaction))) return;

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'ranking') {
      await handleTotalRanking(interaction);
    } else if (subcommand === 'message') {
      await handleMessageRanking(interaction);
    } else if (subcommand === 'voice') {
      await handleVoiceRanking(interaction);
    } else if (subcommand === 'user') {
      await handleUser(interaction);
    } else if (subcommand === 'reset') {
      await handleReset(interaction);
    }
  },
};

/**
 * 総合ランキング表示処理（メッセージ＋ボイス）
 */
async function handleTotalRanking(interaction) {
  const limit = interaction.options.getInteger('limit') || 10;
  
  // メッセージとボイスのデータを取得
  const messageRanking = activityManager.getActivityRanking(interaction.guild.id, 1000);
  const voiceRanking = voiceActivityManager.getVoiceActivityRanking(interaction.guild.id, 1000);
  
  // ユーザーごとにスコアを統合
  const userScores = new Map();
  
  // メッセージポイント（1メッセージ = 1ポイント）
  messageRanking.forEach(user => {
    userScores.set(user.userId, {
      userId: user.userId,
      username: user.username,
      messageCount: user.messageCount,
      voiceTime: 0,
      totalScore: user.messageCount
    });
  });
  
  // ボイスポイント（1分 = 1ポイント）
  voiceRanking.forEach(user => {
    const existing = userScores.get(user.userId);
    const voicePoints = Math.floor(user.totalTime / 60); // 秒を分に変換
    
    if (existing) {
      existing.voiceTime = user.totalTime;
      existing.totalScore += voicePoints;
    } else {
      userScores.set(user.userId, {
        userId: user.userId,
        username: user.username,
        messageCount: 0,
        voiceTime: user.totalTime,
        totalScore: voicePoints
      });
    }
  });
  
  // スコアでソートしてランキング作成
  const ranking = Array.from(userScores.values())
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, limit);
  
  if (ranking.length === 0) {
    await interaction.reply({
      content: 'まだアクティビティデータがありません。',
      ephemeral: true
    });
    return;
  }
  
  // ランキング用のEmbed作成
  const embed = new EmbedBuilder()
    .setColor('#FF6B6B')
    .setTitle('🏆 総合アクティビティランキング')
    .setDescription('メッセージ＋ボイス参加時間の総合ランキング')
    .setTimestamp();
  
  // ランクごとにメダルを表示
  const medals = ['🥇', '🥈', '🥉'];
  
  let description = '';
  for (let i = 0; i < ranking.length; i++) {
    const user = ranking[i];
    const medal = i < 3 ? medals[i] : `**${i + 1}位**`;
    const voiceFormatted = user.voiceTime > 0 
      ? voiceActivityManager.formatDuration(user.voiceTime)
      : '0分';
    
    description += `${medal} <@${user.userId}>\n`;
    description += `└ スコア: **${user.totalScore}pt** (💬${user.messageCount} 🎤${voiceFormatted})\n\n`;
  }
  
  embed.setDescription(description);
  embed.setFooter({ text: '💬1メッセージ=1pt / 🎤1分=1pt' });
  
  await interaction.reply({ embeds: [embed] });
}

/**
 * メッセージランキング表示処理
 */
async function handleMessageRanking(interaction) {
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
    .setTitle('📊 メッセージアクティビティランキング')
    .setTimestamp();

  // ランクごとにメダルを表示
  const medals = ['🥇', '🥈', '🥉'];
  
  let description = '';
  for (let i = 0; i < ranking.length; i++) {
    const user = ranking[i];
    const medal = i < 3 ? medals[i] : `**${i + 1}位**`;
    
    description += `${medal} <@${user.userId}>\n`;
    description += `└ メッセージ数: **${user.messageCount}**\n\n`;
  }

  embed.setDescription(description);

  await interaction.reply({ embeds: [embed] });
}

/**
 * ボイスランキング表示処理
 */
async function handleVoiceRanking(interaction) {
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
    description += `└ 通話時間: **${duration}**\n\n`;
  }

  embed.setDescription(description);

  await interaction.reply({ embeds: [embed] });
}

/**
 * 個別ユーザーのアクティビティ表示処理
 */
async function handleUser(interaction) {
  const targetUser = interaction.options.getUser('target') || interaction.user;
  const messageActivity = activityManager.getUserActivity(interaction.guild.id, targetUser.id);
  const voiceActivity = voiceActivityManager.getUserVoiceActivity(interaction.guild.id, targetUser.id);

  if (!messageActivity && !voiceActivity) {
    await interaction.reply({
      content: `${targetUser.username} のアクティビティデータがまだありません。`,
      ephemeral: true
    });
    return;
  }

  // スコア計算
  const messageCount = messageActivity ? messageActivity.messageCount : 0;
  const voiceTime = voiceActivity ? voiceActivity.totalTime : 0;
  const voicePoints = Math.floor(voiceTime / 60);
  const totalScore = messageCount + voicePoints;
  
  // 総合ランキングでの順位を計算
  const messageRanking = activityManager.getActivityRanking(interaction.guild.id, 1000);
  const voiceRanking = voiceActivityManager.getVoiceActivityRanking(interaction.guild.id, 1000);
  
  const userScores = new Map();
  messageRanking.forEach(user => {
    userScores.set(user.userId, user.messageCount);
  });
  voiceRanking.forEach(user => {
    const existing = userScores.get(user.userId) || 0;
    userScores.set(user.userId, existing + Math.floor(user.totalTime / 60));
  });
  
  const allScores = Array.from(userScores.entries())
    .map(([userId, score]) => ({ userId, score }))
    .sort((a, b) => b.score - a.score);
  
  const rank = allScores.findIndex(u => u.userId === targetUser.id) + 1;
  const voiceFormatted = voiceTime > 0 
    ? voiceActivityManager.formatDuration(voiceTime)
    : '0分';

  const embed = new EmbedBuilder()
    .setColor('#5865F2')
    .setTitle(`📈 ${targetUser.username} のアクティビティ`)
    .addFields(
      { name: '総合スコア', value: `${totalScore} pt`, inline: true },
      { name: 'サーバー内順位', value: `${rank} 位`, inline: true },
      { name: '\u200b', value: '\u200b', inline: true },
      { name: '💬 メッセージ数', value: `${messageCount} 件`, inline: true },
      { name: '🎤 通話時間', value: voiceFormatted, inline: true },
      { name: '\u200b', value: '\u200b', inline: true }
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
