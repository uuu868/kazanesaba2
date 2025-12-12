const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { ensureAllowed } = require('../utils/roleGuard');

// グローバル固定メッセージID管理（チャンネルID => メッセージID）
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

  async execute(client, interaction) {
    try {
      // ロールチェック
      if (!(await ensureAllowed(interaction))) return;

      const subcommand = interaction.options.getSubcommand();
      const channel = interaction.channel;

      if (subcommand === 'set') {
        const title = interaction.options.getString('title');
        const content = interaction.options.getString('content');

        await setPinnedMessage(channel, title, content, client, interaction);

      } else if (subcommand === 'remove') {
        await removePinnedMessage(channel, client, interaction);
      }

    } catch (err) {
      console.error('pin-message error:', err);
      await interaction.reply({ content: 'エラーが発生しました。', flags: 64 }).catch(e => console.error(e));
    }
  }
};

// ======== 固定メッセージ設定 ========
async function setPinnedMessage(channel, title, content, client, interaction) {
  try {
    // まず最初にインタラクションに応答
    await interaction.deferReply({ flags: 64 }).catch(err => console.error('defer error:', err));

    // グローバル管理から既存の固定メッセージIDを取得
    let pinnedMessageId = pinnedMessages.get(channel.id);

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
          
          await interaction.editReply({ content: '✅ 固定メッセージを更新しました。' }).catch(err => console.error(err));
          return;
        }
      } catch (err) {
        console.log('既存メッセージが見つかりません。新規作成します。');
        pinnedMessages.delete(channel.id);
      }
    }

    // 新規固定メッセージを送信
    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(content)
      .setColor(0x0099ff)
      .setTimestamp();
    
    const pinnedMsg = await channel.send({ embeds: [embed] });
    
    // グローバル管理に保存
    pinnedMessages.set(channel.id, pinnedMsg.id);
    console.log(`[Pin Message] グローバル管理に保存: チャンネル ${channel.id} => メッセージ ${pinnedMsg.id}`);

    await interaction.editReply({ content: '✅ 固定メッセージを設定しました。' }).catch(err => console.error(err));

  } catch (err) {
    console.error('setPinnedMessage error:', err);
    await interaction.reply({ content: 'メッセージの設定に失敗しました。', flags: 64 }).catch(e => console.error(e));
  }
}

// ======== 固定メッセージ削除 ========
async function removePinnedMessage(channel, client, interaction) {
  try {
    // まず最初にインタラクションに応答
    await interaction.deferReply({ flags: 64 }).catch(err => console.error('defer error:', err));

    const pinnedMessageId = pinnedMessages.get(channel.id);

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

    // グローバル管理から削除
    pinnedMessages.delete(channel.id);

    await interaction.editReply({ content: '✅ 固定メッセージを削除しました。' }).catch(err => console.error(err));

  } catch (err) {
    console.error('removePinnedMessage error:', err);
    await interaction.reply({ content: 'メッセージの削除に失敗しました。', flags: 64 }).catch(e => console.error(e));
  }
}

// ======== ヘルパー関数 ========
module.exports.getPinnedMessageInfo = async function(channel) {
  try {
    // グローバル管理から取得
    const msgId = pinnedMessages.get(channel.id);
    if (msgId) {
      console.log(`[Pin Message] グローバル管理から取得: ${msgId}`);
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
      // グローバル管理から削除
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

    // グローバル管理を更新
    pinnedMessages.set(channel.id, newMsg.id);
    console.log(`[Pin Message] グローバル管理を更新: ${newMsg.id}`);
    
    return newMsg.id;
  } catch (err) {
    console.error('[Pin Message] bringPinnedToTop error:', err.message);
    return null;
  }
};
