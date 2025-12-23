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
// 起動時にストアからすべての固定メッセージをロード（存在確認付き、自動再作成機能付き）
module.exports.loadAllPinnedMessages = async function(client) {
  try {
    const allPinnedMessages = pinnedMessageStore.getAllPinnedMessages();
    let count = 0;
    let recreatedCount = 0;
    let cleanedCount = 0;
    
    for (const [channelId, data] of Object.entries(allPinnedMessages)) {
      if (data && data.messageId && data.title && data.content) {
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
              // メッセージが存在しない場合は設定を使って再作成
              console.log(`[Pin Message] 固定メッセージが見つかりません。再作成します: チャンネル ${channel.name}`);
              try {
                // まず、チャンネル内の古い固定メッセージを削除
                try {
                  const recentMessages = await channel.messages.fetch({ limit: 50 }).catch(() => new Map());
                  let deletedCount = 0;
                  
                  for (const [msgId, msg] of recentMessages) {
                    // このBotのメッセージで、同じタイトルとコンテンツを持つ埋め込みメッセージを削除
                    if (msg.author.id === client.user.id && msg.embeds.length > 0) {
                      const embed = msg.embeds[0];
                      if (embed.title === data.title && embed.description === data.content) {
                        await msg.delete().catch(err => console.log(`[Pin Message] 削除失敗: ${err.message}`));
                        deletedCount++;
                        console.log(`[Pin Message] 古い固定メッセージを削除: ${msgId}`);
                      }
                    }
                  }
                  
                  if (deletedCount > 0) {
                    console.log(`[Pin Message] ${deletedCount}件の古い固定メッセージを削除しました`);
                  }
                } catch (cleanupErr) {
                  console.log(`[Pin Message] 古いメッセージの削除をスキップ: ${cleanupErr.message}`);
                }
                
                // 新しい固定メッセージを作成
                const embed = new EmbedBuilder()
                  .setTitle(data.title)
                  .setDescription(data.content)
                  .setColor(0x0099ff)
                  .setTimestamp();
                
                const newMsg = await channel.send({ embeds: [embed] });
                
                // ストアとキャッシュを更新
                pinnedMessageStore.savePinnedMessage(channelId, newMsg.id, data.title, data.content);
                pinnedMessages.set(channelId, newMsg.id);
                
                console.log(`[Pin Message] 固定メッセージを再作成しました: ${newMsg.id}`);
                recreatedCount++;
                count++;
              } catch (recreateErr) {
                console.error(`[Pin Message] 再作成に失敗: ${recreateErr.message}`);
              }
            }
          } else {
            // チャンネルが存在しない場合は削除
            console.log(`[Pin Message] 存在しないチャンネルの固定メッセージを削除: ${channelId}`);
            pinnedMessageStore.deletePinnedMessage(channelId);
            cleanedCount++;
          }
        } catch (err) {
          console.error(`[Pin Message] チャンネル ${channelId} の確認中にエラー:`, err.message);
        }
      }
    }
    
    console.log(`[Pin Message] ${count}件の固定メッセージをロードしました${recreatedCount > 0 ? `（${recreatedCount}件再作成）` : ''}${cleanedCount > 0 ? `（${cleanedCount}件削除）` : ''}`);
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
      return msgId;
    }
    
    // キャッシュになければストアから取得
    const storedData = pinnedMessageStore.getPinnedMessage(channel.id);
    if (storedData && storedData.messageId) {
      msgId = storedData.messageId;
      // キャッシュを更新
      pinnedMessages.set(channel.id, msgId);
      return msgId;
    }
    
    return null;
  } catch (err) {
    console.error('[Pin Message] getPinnedMessageInfo error:', err);
    return null;
  }
};

module.exports.bringPinnedToTop = async function(channel, pinnedMessageId) {
  try {
    if (!pinnedMessageId || !channel || !channel.isTextBased()) {
      return null;
    }

    const message = await channel.messages.fetch(pinnedMessageId).catch(() => null);

    if (!message) {
      // ストアから設定を取得
      const storedData = pinnedMessageStore.getPinnedMessage(channel.id);
      if (storedData && storedData.title && storedData.content) {
        try {
          // 設定を使って固定メッセージを再作成
          const embed = new EmbedBuilder()
            .setTitle(storedData.title)
            .setDescription(storedData.content)
            .setColor(0x0099ff)
            .setTimestamp();
          
          const newMsg = await channel.send({ embeds: [embed] });
          
          // ストアとキャッシュを更新
          pinnedMessageStore.savePinnedMessage(channel.id, newMsg.id, storedData.title, storedData.content);
          pinnedMessages.set(channel.id, newMsg.id);
          
          return newMsg.id;
        } catch (recreateErr) {
          console.error('[Pin Message] 再作成失敗:', recreateErr.message);
          return null;
        }
      } else {
        // 設定情報が不完全な場合のみ削除
        pinnedMessageStore.deletePinnedMessage(channel.id);
        pinnedMessages.delete(channel.id);
        return null;
      }
    }

    // メッセージが存在する場合は、最新の5件にあるかチェック
    const recentMessages = await channel.messages.fetch({ limit: 5 }).catch(() => new Map());
    const messageIds = Array.from(recentMessages.keys());
    
    // 固定メッセージが最新の5件の中にない場合のみ再送信
    if (!messageIds.includes(pinnedMessageId)) {
      // メッセージを削除して再送信（最新にする）
      const embeds = message.embeds || [];
      const content = message.content || '';

      await message.delete().catch(() => {});

      let newMsg;
      if (embeds.length > 0) {
        newMsg = await channel.send({ embeds });
      } else {
        newMsg = await channel.send(content || '（固定メッセージ）');
      }

      // ストアから元の情報を取得してタイトル・コンテンツを保持
      const title = (embeds.length > 0 && embeds[0].title) ? embeds[0].title : '（固定メッセージ）';
      const contentText = (embeds.length > 0 && embeds[0].description) ? embeds[0].description : content;
      
      // ストアとキャッシュを更新
      pinnedMessageStore.savePinnedMessage(channel.id, newMsg.id, title, contentText);
      pinnedMessages.set(channel.id, newMsg.id);
      
      return newMsg.id;
    }
    
    // 既に最新なので何もしない
    return pinnedMessageId;
    
  } catch (err) {
    console.error('[Pin Message] エラー:', err.message);
    return null;
  }
};
