const { Events } = require('discord.js');
const dataStore = require('../utils/dataStore');

module.exports = {
  name: Events.MessageDelete,
  once: false,
  async execute(message) {
    try {
      const mapping = dataStore.getMapping(message.id);
      if (!mapping) return;

      // 既に削除済みフラグがあれば何もしない
      if (mapping.deleted) {
        console.log(`[Image Copy] 元メッセージ ${message.id} は既に削除済みとしてマークされています`);
        return;
      }

      const client = message.client;
      const copiedChannelId = mapping.copiedChannelId || mapping.copiedChannelId;

      if (!mapping.copiedMessageIds || mapping.copiedMessageIds.length === 0) {
        console.log('[Image Copy] コピー先メッセージ情報がありません:', message.id);
        // マークだけしておく
        dataStore.markDeleted(message.id);
        return;
      }

      const notice = '🗑️ 元のメディアは削除されました。';

      for (const copiedMessageId of mapping.copiedMessageIds) {
        try {
          const channel = await client.channels.fetch(copiedChannelId).catch(() => null);
          if (!channel) {
            console.log('[Image Copy] コピー先チャンネルが見つかりません:', copiedChannelId);
            continue;
          }

          const copied = await channel.messages.fetch(copiedMessageId).catch(() => null);
          if (!copied) {
            console.log('[Image Copy] コピー先メッセージが見つかりません:', copiedMessageId);
            continue;
          }

          // 既に通知があるか確認してから編集
          const existing = copied.content || '';
          if (existing.includes(notice)) {
            console.log(`[Image Copy] コピー先メッセージ ${copiedMessageId} は既に削除通知があります`);
            continue;
          }

          const newContent = notice + '\n' + existing;
          await copied.edit({ content: newContent }).catch(err => {
            console.error('[Image Copy] コピー先メッセージの編集に失敗しました:', err);
          });
          console.log(`[Image Copy] コピー先メッセージを編集しました: ${copiedMessageId}`);
        } catch (err) {
          console.error('[Image Copy] コピー先メッセージ処理中にエラー:', err);
        }
      }

      dataStore.markDeleted(message.id);
      console.log(`[Image Copy] 元メッセージ削除を反映しました: ${message.id}`);
    } catch (err) {
      console.error('[Image Copy] messageDelete ハンドラーでエラー:', err);
    }
  }
};
