const { Events } = require('discord.js');
const pinMessageCommand = require('../commands/pin-message.js');

module.exports = {
  name: Events.MessageCreate,
  once: false,
  async execute(message) {
    // ボットのメッセージは無視
    if (message.author.bot) {
      console.log('[Pin Message] ボットメッセージを無視します');
      return;
    }

    try {
      console.log(`[Pin Message] ユーザーメッセージ受信: ${message.author.username} (チャンネル: ${message.channel.name})`);

      // チャンネルの固定メッセージ情報を取得
      const pinnedMessageId = await pinMessageCommand.getPinnedMessageInfo(message.channel);

      if (!pinnedMessageId) {
        // 固定メッセージがない
        console.log('[Pin Message] 固定メッセージはありません');
        return;
      }

      console.log(`[Pin Message] 固定メッセージID: ${pinnedMessageId}`);

      // 固定メッセージを最新に保つ（削除して再送信）
      const newPinnedId = await pinMessageCommand.bringPinnedToTop(message.channel, pinnedMessageId);

      if (newPinnedId) {
        console.log(`[Pin Message] 固定メッセージを更新しました（新ID: ${newPinnedId}）`);
      } else {
        console.log('[Pin Message] 固定メッセージの更新に失敗しました');
      }

    } catch (err) {
      console.error('[Pin Message] メッセージハンドラーエラー:', err);
    }
  }
};
