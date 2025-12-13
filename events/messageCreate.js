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
      // コピー先チャンネルに投稿された内容を再コピーしない
      if (message.channel.id === config.imageChannelId) {
        return;
      }
      console.log(`[Pin Message] ユーザーメッセージ受信: ${message.author.username} (チャンネル: ${message.channel.name}, メッセージID: ${message.id})`);

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
        console.log(`[Image Copy] 添付ファイル検出: ${message.attachments.size}個 (メッセージID: ${message.id})`);
        
        const mediaAttachments = message.attachments.filter(attachment => 
          attachment.contentType && (
            attachment.contentType.startsWith('image/') || 
            attachment.contentType.startsWith('video/')
          )
        );

        console.log(`[Image Copy] メディアファイル: ${mediaAttachments.size}個`);

        if (mediaAttachments.size > 0) {
          try {
            // 添付ファイルのURLで重複チェック（フォローされたメッセージでも同じURLを使う）
            const attachmentUrls = Array.from(mediaAttachments.values()).map(a => a.url).sort().join('|');
            const existing = dataStore.getMapping(`url:${attachmentUrls}`);
            if (existing && existing.copiedMessageId && existing.copiedMessageId !== 'processing') {
              console.log(`[Image Copy] このメディアは既にコピー済みです（コピー先メッセージID: ${existing.copiedMessageId}）。スキップします`);
              return;
            }

            // 処理中フラグを保存（URL based）
            dataStore.saveMapping(`url:${attachmentUrls}`, {
              copiedMessageId: 'processing',
              createdAt: new Date().toISOString()
            });

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

            // ファイルURLの重複を除去（同一URLが複数ある場合に備える）
            const uniqueFiles = Array.from(new Set(files));
            // Discord の添付ファイル上限（通常 10）を超えないように切り詰め
            const cappedFiles = uniqueFiles.slice(0, 10);

            const sent = await imageChannel.send({ 
              content: content,
              files: cappedFiles
            });

            // マッピングを保存（URL based + message based）
            try {
              const attachmentUrls = Array.from(mediaAttachments.values()).map(a => a.url).sort().join('|');
              dataStore.saveMapping(`url:${attachmentUrls}`, {
                guildId: message.guild.id,
                originalChannelId: message.channel.id,
                copiedChannelId: imageChannel.id,
                copiedMessageId: sent.id,
                attachmentCount: mediaAttachments.size,
                createdAt: new Date().toISOString()
              });
              
              // 元のメッセージIDでも保存（削除時のため）
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
