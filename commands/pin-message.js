const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { ensureAllowed } = require('../utils/roleGuard');
const pinnedMessageStore = require('../utils/pinnedMessageStore');

// メモリキャッシュ（パフォーマンス向上のため）
const pinnedMessages = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pin-message')
    .setDescription('固定メッセージをチャンネルに設定します。新規メッセージが来ても常に最新に保ちます。')
    .addSubcommand(subcommand =>
      subcommand.setName('set')
        .setDescription('固定メッセージを設定します')
        .addStringOption(option =>
          option.setName('title')
            .setDescription('埋め込みメッセージのタイトル')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('content')
            .setDescription('埋め込みメッセージの内容（最大2000文字）')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand.setName('remove')
        .setDescription('固定メッセージを削除します')
    ),

  async execute(interaction) {
    try {
      // ロールチェック
      if (!(await ensureAllowed(interaction))) return;

      const subcommand = interaction.options.getSubcommand();
      const channel = interaction.channel;

      if (subcommand === 'set') {
        const title = interaction.options.getString('title');
        const content = interaction.options.getString('content');

        await setPinnedMessage(channel, title, content, interaction);

      } else if (subcommand === 'remove') {
        await removePinnedMessage(channel, interaction);
      }

    } catch (err) {
      console.error('pin-message error:', err);
      await interaction.reply({ content: 'エラーが発生しました。', flags: 64 }).catch(e => console.error(e));
    }
  }
};

// ======== 固定メッセージ設定 ========
async function setPinnedMessage(channel, title, content, interaction) {
  try {
    // まず最初にインタラクションに応答
    await interaction.deferReply({ flags: 64 }).catch(err => console.error('defer error:', err));

    // ストアから既存の固定メッセージIDを取得
    const storedData = pinnedMessageStore.getPinnedMessage(channel.id);
    let pinnedMessageId = storedData ? storedData.messageId : null;
    
    // キャッシュも更新
    if (pinnedMessageId) {
      pinnedMessages.set(channel.id, pinnedMessageId);
    }

    if (pinnedMessageId) {
      try {
        // 既存メッセージを更新
        const existingMessage = await channel.messages.fetch(pinnedMessageId).catch(() => null);
        if (existingMessage) {
          const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(content)
            .setColor(0x0099ff)
            .setTimestamp();
          
          await existingMessage.edit({ embeds: [embed] }).catch(err => {
            console.error('メッセージ編集エラー:', err.message);
            throw err;
          });
          
          // ストアとキャッシュを更新
          pinnedMessageStore.savePinnedMessage(channel.id, pinnedMessageId, title, content);
          pinnedMessages.set(channel.id, pinnedMessageId);
          
          await interaction.editReply({ content: '✅ 固定メッセージを更新しました。' }).catch(err => console.error(err));
          return;
        }
      } catch (err) {
        console.log('既存メッセージが見つかりません。新規作成します。');
        pinnedMessages.delete(channel.id);
        pinnedMessageStore.deletePinnedMessage(channel.id);
      }
    }

    // 新規固定メッセージを送信
    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(content)
      .setColor(0x0099ff)
      .setTimestamp();
    
    const pinnedMsg = await channel.send({ embeds: [embed] });
    
    // ストアとキャッシュに保存
    pinnedMessageStore.savePinnedMessage(channel.id, pinnedMsg.id, title, content);
    pinnedMessages.set(channel.id, pinnedMsg.id);
    console.log(`[Pin Message] 固定メッセージを保存: チャンネル ${channel.id} => メッセージ ${pinnedMsg.id}`);

    await interaction.editReply({ content: '✅ 固定メッセージを設定しました。' }).catch(err => console.error(err));

  } catch (err) {
    console.error('setPinnedMessage error:', err);
    await interaction.reply({ content: 'メッセージの設定に失敗しました。', flags: 64 }).catch(e => console.error(e));
  }
}

// ======== 固定メッセージ削除 ========
async function removePinnedMessage(channel, interaction) {
  try {
    // まず最初にインタラクションに応答
    await interaction.deferReply({ flags: 64 }).catch(err => console.error('defer error:', err));

    // ストアから取得
    const storedData = pinnedMessageStore.getPinnedMessage(channel.id);
    const pinnedMessageId = storedData ? storedData.messageId : null;

    if (!pinnedMessageId) {
      await interaction.editReply({ content: 'このチャンネルに固定メッセージはありません。' }).catch(err => console.error(err));
      return;
    }

    try {
      const message = await channel.messages.fetch(pinnedMessageId).catch(() => null);
      if (message) {
        await message.delete().catch(err => console.log('メッセージ削除エラー:', err.message));
      }
    } catch (err) {
      console.log('固定メッセージの削除に失敗（既に削除済みの可能性）');
    }

    // ストアとキャッシュから削除
    pinnedMessageStore.deletePinnedMessage(channel.id);
    pinnedMessages.delete(channel.id);

    await interaction.editReply({ content: '✅ 固定メッセージを削除しました。' }).catch(err => console.error(err));

  } catch (err) {
    console.error('removePinnedMessage error:', err);
    await interaction.reply({ content: 'メッセージの削除に失敗しました。', flags: 64 }).catch(e => console.error(e));
  }
}

// ======== ヘルパー関数 ========
// 起動時にストアからすべての固定メッセージをロード（存在確認付き）
module.exports.loadAllPinnedMessages = async function(client) {
  try {
    const allPinnedMessages = pinnedMessageStore.getAllPinnedMessages();
    let count = 0;
    let cleanedCount = 0;
    
    for (const [channelId, data] of Object.entries(allPinnedMessages)) {
      if (data && data.messageId) {
        // メッセージが実際に存在するか確認
        try {
          const channel = await client.channels.fetch(channelId).catch(() => null);
          if (channel && channel.isTextBased()) {
            const message = await channel.messages.fetch(data.messageId).catch(() => null);
            if (message) {
              // メッセージが存在する場合のみキャッシュに追加
              pinnedMessages.set(channelId, data.messageId);
              count++;
            } else {
              // メッセージが存在しない場合は削除
              console.log(`[Pin Message] 存在しない固定メッセージを削除: チャンネル ${channelId}`);
              pinnedMessageStore.deletePinnedMessage(channelId);
              cleanedCount++;
            }
          } else {
            // チャンネルが存在しない場合も削除
            console.log(`[Pin Message] 存在しないチャンネルの固定メッセージを削除: ${channelId}`);
            pinnedMessageStore.deletePinnedMessage(channelId);
            cleanedCount++;
          }
        } catch (err) {
          console.error(`[Pin Message] チャンネル ${channelId} の確認中にエラー:`, err.message);
        }
      }
    }
    
    console.log(`[Pin Message] ${count}件の固定メッセージをロードしました${cleanedCount > 0 ? `（${cleanedCount}件削除）` : ''}`);
    return count;
  } catch (err) {
    console.error('[Pin Message] loadAllPinnedMessages error:', err);
    return 0;
  }
};

module.exports.getPinnedMessageInfo = async function(channel) {
  try {
    // キャッシュから取得を試行
    let msgId = pinnedMessages.get(channel.id);
    if (msgId) {
      console.log(`[Pin Message] キャッシュから取得: ${msgId}`);
      return msgId;
    }
    
    // キャッシュになければストアから取得
    const storedData = pinnedMessageStore.getPinnedMessage(channel.id);
    if (storedData && storedData.messageId) {
      msgId = storedData.messageId;
      // キャッシュを更新
      pinnedMessages.set(channel.id, msgId);
      console.log(`[Pin Message] ストアから取得: ${msgId}`);
      return msgId;
    }
    
    console.log('[Pin Message] 固定メッセージIDが見つかりません');
    return null;
  } catch (err) {
    console.error('[Pin Message] getPinnedMessageInfo error:', err);
    return null;
  }
};

module.exports.bringPinnedToTop = async function(channel, pinnedMessageId) {
  try {
    if (!pinnedMessageId) {
      console.log('[Pin Message] メッセージIDが無効です');
      return null;
    }

    console.log(`[Pin Message] メッセージを取得します (ID: ${pinnedMessageId})`);
    const message = await channel.messages.fetch(pinnedMessageId).catch(err => {
      console.log(`[Pin Message] メッセージ取得失敗: ${err.message}`);
      return null;
    });

    if (!message) {
      console.log('[Pin Message] メッセージが見つかりません。');
      // ストアとキャッシュから削除
      pinnedMessageStore.deletePinnedMessage(channel.id);
      pinnedMessages.delete(channel.id);
      return null;
    }

    console.log('[Pin Message] メッセージが見つかりました。削除して再送信します');

    // メッセージを削除して再送信（最新にする）
    const embeds = message.embeds || [];
    const content = message.content || '';

    await message.delete().catch(err => console.log('[Pin Message] メッセージ削除エラー:', err.message));
    console.log('[Pin Message] メッセージを削除しました');

    let newMsg;
    if (embeds.length > 0) {
      newMsg = await channel.send({ embeds });
      console.log('[Pin Message] 埋め込みメッセージを再送信しました');
    } else {
      newMsg = await channel.send(content || '（固定メッセージ）');
      console.log('[Pin Message] テキストメッセージを再送信しました');
    }
    
    console.log(`[Pin Message] 新規メッセージID: ${newMsg.id}`);

    // ストアから元の情報を取得してタイトル・コンテンツを保持
    const storedData = pinnedMessageStore.getPinnedMessage(channel.id);
    const title = (embeds.length > 0 && embeds[0].title) ? embeds[0].title : '（固定メッセージ）';
    const contentText = (embeds.length > 0 && embeds[0].description) ? embeds[0].description : content;
    
    // ストアとキャッシュを更新
    pinnedMessageStore.savePinnedMessage(channel.id, newMsg.id, title, contentText);
    pinnedMessages.set(channel.id, newMsg.id);
    console.log(`[Pin Message] 固定メッセージを更新: ${newMsg.id}`);
    
    // 重複削除チェック: 2秒後に同じembedを持つメッセージがないか確認（このチャンネル内のみ）
    setTimeout(async () => {
      try {
        const recentMessages = await channel.messages.fetch({ limit: 20 });
        const samePinnedMessages = [];
        
        // 同じタイトルとコンテンツを持つボットメッセージを検索（より厳密なチェック）
        const embedTitle = embeds.length > 0 && embeds[0].title ? embeds[0].title : null;
        const embedDescription = embeds.length > 0 && embeds[0].description ? embeds[0].description : null;
        
        for (const [msgId, msg] of recentMessages) {
          // このBotのメッセージのみチェック
          if (msg.author.id === newMsg.author.id) {
            if (embedTitle && msg.embeds.length > 0) {
              // タイトルとコンテンツ両方が一致する場合のみ重複とみなす
              if (msg.embeds[0].title === embedTitle && msg.embeds[0].description === embedDescription) {
                samePinnedMessages.push(msg);
              }
            } else if (!embedTitle && msg.content === content && content) {
              samePinnedMessages.push(msg);
            }
          }
        }
        
        console.log(`[Pin Message] チャンネル ${channel.name} 内の同じ固定メッセージ数: ${samePinnedMessages.length}`);
        
        // 2つ以上ある場合のみ処理
        if (samePinnedMessages.length >= 2) {
          console.log(`[Pin Message] チャンネル ${channel.name} で重複固定メッセージを検出: ${samePinnedMessages.length}件`);
          
          // タイムスタンプでソート（古い順）
          samePinnedMessages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
          
          // 最初のメッセージIDを記録
          const keepMessageId = samePinnedMessages[0].id;
          console.log(`[Pin Message] 保持する固定メッセージID: ${keepMessageId}`);
          
          // ストアから情報を取得
          const storedData = pinnedMessageStore.getPinnedMessage(channel.id);
          const titleToKeep = (embeds.length > 0 && embeds[0].title) ? embeds[0].title : '（固定メッセージ）';
          const contentToKeep = (embeds.length > 0 && embeds[0].description) ? embeds[0].description : content;
          
          // ストアとキャッシュを最初のメッセージに更新
          pinnedMessageStore.savePinnedMessage(channel.id, keepMessageId, titleToKeep, contentToKeep);
          pinnedMessages.set(channel.id, keepMessageId);
          
          // 2番目以降のメッセージのみを削除（エラーハンドリング付き）
          for (let i = 1; i < samePinnedMessages.length; i++) {
            const duplicate = samePinnedMessages[i];
            if (duplicate.id !== keepMessageId) {
              try {
                await duplicate.delete();
                console.log(`[Pin Message] 重複固定メッセージを削除: ${duplicate.id}`);
              } catch (delErr) {
                // 既に削除されている場合はスキップ
                if (delErr.code === 10008) {
                  console.log(`[Pin Message] メッセージは既に削除済み: ${duplicate.id}`);
                } else {
                  console.error(`[Pin Message] 削除エラー: ${delErr.message}`);
                }
              }
            }
          }
          console.log(`[Pin Message] 最初の固定メッセージを保持しました: ${keepMessageId}`);
        }
      } catch (err) {
        console.error('[Pin Message] 重複チェックに失敗:', err);
      }
    }, 2000);
    
    return newMsg.id;
  } catch (err) {
    console.error('[Pin Message] bringPinnedToTop error:', err.message);
    return null;
  }
};
