const { SlashCommandBuilder, ActivityType } = require('discord.js');

const ALLOWED_USER_ID = '1088020702583603270';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('BOTのステータスメッセージを変更します（bot作成者のみ）')
    .addStringOption(option =>
      option.setName('message')
        .setDescription('ステータスメッセージ')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('type')
        .setDescription('アクティビティの種類')
        .setRequired(false)
        .addChoices(
          { name: 'プレイ中', value: 'playing' },
          { name: '配信中', value: 'streaming' },
          { name: '聞いています', value: 'listening' },
          { name: '視聴中', value: 'watching' },
          { name: '競争中', value: 'competing' },
          { name: 'リセット', value: 'reset' }
        )
    ),

  async execute(client, interaction) {
    // ユーザーIDチェック
    if (interaction.user.id !== ALLOWED_USER_ID) {
      await interaction.reply({ 
        content: 'このコマンドを使用する権限がありません。', 
        ephemeral: true 
      });
      return;
    }

    const message = interaction.options.getString('message');
    const typeStr = interaction.options.getString('type') || 'playing';

    // リセットが選択された場合
    if (typeStr === 'reset') {
      try {
        client.user.setActivity(null);
        
        await interaction.reply({
          content: '✅ ステータスをリセットしました。',
          ephemeral: true
        });

        console.log('[Status] ステータスをリセットしました');
        return;
      } catch (error) {
        console.error('[Status] ステータスリセットエラー:', error);
        await interaction.reply({
          content: 'ステータスのリセットに失敗しました。',
          ephemeral: true
        });
        return;
      }
    }

    // メッセージが指定されていない場合
    if (!message) {
      await interaction.reply({
        content: 'メッセージを指定してください。',
        ephemeral: true
      });
      return;
    }

    // タイプをActivityTypeに変換
    const activityTypeMap = {
      'playing': ActivityType.Playing,
      'streaming': ActivityType.Streaming,
      'listening': ActivityType.Listening,
      'watching': ActivityType.Watching,
      'competing': ActivityType.Competing
    };

    const activityType = activityTypeMap[typeStr] || ActivityType.Playing;

    try {
      client.user.setActivity(message, { type: activityType });
      
      await interaction.reply({
        content: `✅ ステータスを変更しました: **${message}**`,
        ephemeral: true
      });

      console.log(`[Status] ステータスを変更: ${message} (タイプ: ${typeStr})`);
    } catch (error) {
      console.error('[Status] ステータス変更エラー:', error);
      await interaction.reply({
        content: 'ステータスの変更に失敗しました。',
        ephemeral: true
      });
    }
  }
};
