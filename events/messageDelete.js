const { Events } = require('discord.js');
const dataStore = require('../utils/dataStore');

module.exports = {
  name: Events.MessageDelete,
  once: false,
  async execute(message) {
    try {
      const mapping = dataStore.getMapping(message.id);
      if (!mapping) return;

      const client = message.client;
      const copiedChannelId = mapping.copiedChannelId;
      const copiedMessageId = mapping.copiedMessageId;

      const channel = await client.channels.fetch(copiedChannelId).catch(() => null);
      if (!channel) {
        console.log('[Image Copy] コピー先チャンネルが見つかりません:', copiedChannelId);
        return;
      }

      const copied = await channel.messages.fetch(copiedMessageId).catch(() => null);
      if (!copied) {
        console.log('[Image Copy] コピー先メッセージが見つかりません:', copiedMessageId);
        return;
      }

      // 編集して「削除された」表示を追加
      const originalContent = copied.content || '';
      const notice = '🗑️ 元のメディアは削除されました。';
      let newContent = notice + '\n' + originalContent;

      await copied.edit({ content: newContent }).catch(err => {
        console.error('[Image Copy] コピー先メッセージの編集に失敗しました:', err);
      });

      dataStore.markDeleted(message.id);
      console.log(`[Image Copy] 元メッセージ削除を反映しました: ${message.id}`);
    } catch (err) {
      console.error('[Image Copy] messageDelete ハンドラーでエラー:', err);
    }
  }
};
