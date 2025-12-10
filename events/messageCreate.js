const { Events } = require('discord.js');
const pinMessageCommand = require('../commands/pin-message.js');
const config = require('../config.json');
const dataStore = require('../utils/dataStore');

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
      } else {
        console.log(`[Pin Message] 固定メッセージID: ${pinnedMessageId}`);

        // 固定メッセージを最新に保つ（削除して再送信）
        const newPinnedId = await pinMessageCommand.bringPinnedToTop(message.channel, pinnedMessageId);

        if (newPinnedId) {
          console.log(`[Pin Message] 固定メッセージを更新しました（新ID: ${newPinnedId}）`);
        } else {
          console.log('[Pin Message] 固定メッセージの更新に失敗しました');
        }
      }

      // 画像と動画をコピーする機能
      if (message.attachments.size > 0) {
        console.log(`[Image Copy] 添付ファイル検出: ${message.attachments.size}個`);
        
        const mediaAttachments = message.attachments.filter(attachment => 
          attachment.contentType && (
            attachment.contentType.startsWith('image/') || 
            attachment.contentType.startsWith('video/')
          )
        );

        console.log(`[Image Copy] メディアファイル: ${mediaAttachments.size}個`);

        if (mediaAttachments.size > 0) {
          try {
            console.log(`[Image Copy] チャンネルID: ${config.imageChannelId}`);
            const imageChannel = await message.guild.channels.fetch(config.imageChannelId);
            
            if (!imageChannel) {
              console.log('[Image Copy] 指定されたチャンネルが見つかりません');
              return;
            }

            console.log(`[Image Copy] チャンネル取得成功: ${imageChannel.name}`);

            // 画像と動画をコピー先チャンネルに送信
            const files = [];
            let content = `📸 **元のメッセージ**: [ジャンプ](${message.url})\n👤 **作成者**: ${message.author}\n📍 **元のチャンネル**: <#${message.channel.id}>`;

            for (const attachment of mediaAttachments.values()) {
              console.log(`[Image Copy] ファイル処理: ${attachment.name} (${attachment.contentType})`);
              files.push(attachment.url);
            }

            const sent = await imageChannel.send({ 
              content: content,
              files: files
            });

            // マッピングを保存（元メッセージID -> コピー先メッセージ）
            try {
              dataStore.saveMapping(message.id, {
                guildId: message.guild.id,
                originalChannelId: message.channel.id,
                copiedChannelId: imageChannel.id,
                copiedMessageId: sent.id,
                attachmentCount: mediaAttachments.size,
                createdAt: new Date().toISOString()
              });
            } catch (e) {
              console.error('[Image Copy] マッピング保存に失敗しました:', e);
            }

            console.log(`[Image Copy] メディアをコピーしました (チャンネル: ${imageChannel.name}, 枚数: ${mediaAttachments.size})`);
            
          } catch (error) {
            console.error('[Image Copy] メディアのコピーに失敗しました:', error);
          }
        }
      }

    } catch (err) {
      console.error('[Pin Message] メッセージハンドラーエラー:', err);
    }
  }
};
