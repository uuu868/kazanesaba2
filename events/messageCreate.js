const { Events } = require('discord.js');
const pinMessageCommand = require('../commands/pin-message.js');
const config = require('../config.json');
const dataStore = require('../utils/dataStore');
const activityManager = require('../utils/activityManager');

module.exports = {
  name: Events.MessageCreate,
  once: false,
  async execute(message) {
    // ユーザーのアクティビティを記録（ボット以外）
    if (message.guild && !message.author.bot) {
      activityManager.recordMessage(
        message.guild.id,
        message.author.id,
        message.author.username
      );
    }

    try {
      // ログチャンネルでは全ての処理をスキップ
      if (message.channel.id === config.logChannelId) {
        return;
      }

      // 画像コピーチャンネルからのボットメッセージもスキップ
      if (message.author.bot && message.channel.id === config.imageChannelId) {
        return;
      }

      // ボットメッセージは画像コピー処理をスキップ
      if (message.author.bot) {
        console.log(`[Message] ボットメッセージをスキップ: ${message.author.username}`);
        return;
      }

      console.log(`[Pin Message] ユーザーメッセージ受信: ${message.author.username} (チャンネル: ${message.channel.name})`);

      // チャンネルに固定メッセージがある場合、最新に保つ（ユーザーメッセージのみ）
      try {
        const pinnedMessageId = await pinMessageCommand.getPinnedMessageInfo(message.channel);
        
        if (pinnedMessageId) {
          console.log(`[Pin Message] 固定メッセージID: ${pinnedMessageId}`);

          // 固定メッセージを最新に保つ（削除して再送信）
          const newPinnedId = await pinMessageCommand.bringPinnedToTop(message.channel, pinnedMessageId);

          if (newPinnedId) {
            console.log(`[Pin Message] 固定メッセージを更新しました（新ID: ${newPinnedId}）`);
          } else {
            console.log('[Pin Message] 固定メッセージの更新に失敗しました');
          }
        }
      } catch (pinErr) {
        console.error('[Pin Message] 固定メッセージ処理エラー:', pinErr.message);
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
            if (existing && existing.copiedMessageId) {
              // 既にコピー済み、または処理中の場合はスキップ
              console.log(`[Image Copy] このメディアは既にコピー済みまたは処理中です（状態: ${existing.copiedMessageId}）。スキップします`);
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
            
            // 重複チェック: 10秒後に同じ画像リンクがないか確認
            setTimeout(async () => {
              try {
                // 画像チャンネルの最近のメッセージを取得（送信から10秒後）
                const recentMessages = await imageChannel.messages.fetch({ limit: 20 });
                const sameUrlMessages = [];
                
                // 同じ元メッセージURLを持つメッセージを検索
                for (const [msgId, msg] of recentMessages) {
                  if (msg.content.includes(message.url)) {
                    sameUrlMessages.push(msg);
                  }
                }
                
                // 2つ以上ある場合のみ重複削除処理
                if (sameUrlMessages.length >= 2) {
                  console.log(`[Image Copy] 重複検出: ${sameUrlMessages.length}件 (元URL: ${message.url})`);
                  
                  // タイムスタンプでソート（古い順）
                  sameUrlMessages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
                  
                  // 最初のメッセージIDを記録
                  const keepMessageId = sameUrlMessages[0].id;
                  console.log(`[Image Copy] 保持: ${keepMessageId}`);
                  
                  // 2番目以降を削除
                  for (let i = 1; i < sameUrlMessages.length; i++) {
                    const duplicate = sameUrlMessages[i];
                    try {
                      await duplicate.delete();
                      console.log(`[Image Copy] 削除: ${duplicate.id}`);
                    } catch (delErr) {
                      console.error(`[Image Copy] 削除失敗 ${duplicate.id}:`, delErr.message);
                    }
                  }
                  
                  console.log(`[Image Copy] 重複削除完了: ${keepMessageId}を保持`);
                }
              } catch (err) {
                console.error('[Image Copy] 重複チェックエラー:', err.message);
              }
            }, 10000); // 10秒待機
            
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
