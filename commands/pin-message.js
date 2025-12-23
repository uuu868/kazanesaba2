const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { ensureAllowed } = require('../utils/roleGuard');
const pinnedMessageStore = require('../utils/pinnedMessageStore');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pin-message')
    .setDescription('チャンネルに固定メッセージを設定・管理します')
    .addSubcommand(subcommand =>
      subcommand.setName('create')
        .setDescription('新しい固定メッセージを作成します')
        .addStringOption(option =>
          option.setName('title')
            .setDescription('メッセージのタイトル')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('content')
            .setDescription('メッセージの内容')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('color')
            .setDescription('埋め込みの色（デフォルト: 青）')
            .setRequired(false)
            .addChoices(
              { name: '青', value: '0099FF' },
              { name: '赤', value: 'FF0000' },
              { name: '緑', value: '00FF00' },
              { name: '黄色', value: 'FFFF00' },
              { name: '紫', value: '9B59B6' },
              { name: 'オレンジ', value: 'FF9900' }
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand.setName('update')
        .setDescription('固定メッセージの内容を更新します')
        .addStringOption(option =>
          option.setName('title')
            .setDescription('新しいタイトル（空欄で変更なし）')
            .setRequired(false)
        )
        .addStringOption(option =>
          option.setName('content')
            .setDescription('新しい内容（空欄で変更なし）')
            .setRequired(false)
        )
        .addStringOption(option =>
          option.setName('color')
            .setDescription('新しい色（空欄で変更なし）')
            .setRequired(false)
            .addChoices(
              { name: '青', value: '0099FF' },
              { name: '赤', value: 'FF0000' },
              { name: '緑', value: '00FF00' },
              { name: '黄色', value: 'FFFF00' },
              { name: '紫', value: '9B59B6' },
              { name: 'オレンジ', value: 'FF9900' }
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand.setName('remove')
        .setDescription('固定メッセージを削除します')
    )
    .addSubcommand(subcommand =>
      subcommand.setName('refresh')
        .setDescription('固定メッセージを最新の位置に移動します')
    )
    .addSubcommand(subcommand =>
      subcommand.setName('info')
        .setDescription('現在の固定メッセージの情報を表示します')
    ),

  async execute(interaction) {
    try {
      // 権限チェック
      if (!(await ensureAllowed(interaction))) return;

      const subcommand = interaction.options.getSubcommand();
      const channel = interaction.channel;

      switch (subcommand) {
        case 'create':
          await createPinnedMessage(interaction, channel);
          break;
        case 'update':
          await updatePinnedMessage(interaction, channel);
          break;
        case 'remove':
          await removePinnedMessage(interaction, channel);
          break;
        case 'refresh':
          await refreshPinnedMessage(interaction, channel);
          break;
        case 'info':
          await showPinnedInfo(interaction, channel);
          break;
      }

    } catch (err) {
      console.error('[Pin Message] コマンドエラー:', err);
      const reply = { content: '❌ エラーが発生しました。', flags: 64 };
      if (interaction.deferred) {
        await interaction.editReply(reply).catch(() => {});
      } else {
        await interaction.reply(reply).catch(() => {});
      }
    }
  }
};

// ======== 固定メッセージ作成 ========
async function createPinnedMessage(interaction, channel) {
  await interaction.deferReply({ flags: 64 });

  // 既存の固定メッセージをチェック
  const existing = pinnedMessageStore.getPinnedMessage(channel.id);
  if (existing) {
    await interaction.editReply({ 
      content: '⚠️ このチャンネルには既に固定メッセージが存在します。\n`/pin-message update` で更新するか、`/pin-message remove` で削除してください。' 
    });
    return;
  }

  const title = interaction.options.getString('title');
  const content = interaction.options.getString('content');
  const color = interaction.options.getString('color') || '0099FF';

  // Embedメッセージを作成
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(content)
    .setColor(parseInt(color, 16))
    .setTimestamp()
    .setFooter({ text: '固定メッセージ' });

  const message = await channel.send({ embeds: [embed] });

  // データベースに保存
  pinnedMessageStore.savePinnedMessage(channel.id, {
    messageId: message.id,
    title,
    content,
    color,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  await interaction.editReply({ 
    content: `✅ 固定メッセージを作成しました！\nメッセージID: ${message.id}` 
  });

  console.log(`[Pin Message] 作成: チャンネル ${channel.name} (${channel.id})`);
}

// ======== 固定メッセージ更新 ========
async function updatePinnedMessage(interaction, channel) {
  await interaction.deferReply({ flags: 64 });

  const data = pinnedMessageStore.getPinnedMessage(channel.id);
  if (!data) {
    await interaction.editReply({ 
      content: '⚠️ このチャンネルに固定メッセージはありません。\n`/pin-message create` で作成してください。' 
    });
    return;
  }

  const newTitle = interaction.options.getString('title');
  const newContent = interaction.options.getString('content');
  const newColor = interaction.options.getString('color');

  // 新しい値がない場合は既存の値を使用
  const title = newTitle || data.title;
  const content = newContent || data.content;
  const color = newColor || data.color;

  // メッセージを取得して更新
  try {
    const message = await channel.messages.fetch(data.messageId);

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(content)
      .setColor(parseInt(color, 16))
      .setTimestamp()
      .setFooter({ text: '固定メッセージ' });

    await message.edit({ embeds: [embed] });

    // データベースを更新
    pinnedMessageStore.savePinnedMessage(channel.id, {
      messageId: data.messageId,
      title,
      content,
      color,
      createdAt: data.createdAt,
      updatedAt: new Date().toISOString()
    });

    await interaction.editReply({ 
      content: '✅ 固定メッセージを更新しました！' 
    });

    console.log(`[Pin Message] 更新: チャンネル ${channel.name} (${channel.id})`);

  } catch (err) {
    console.error('[Pin Message] メッセージが見つかりません:', err.message);
    
    // メッセージが削除されている場合は再作成
    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(content)
      .setColor(parseInt(color, 16))
      .setTimestamp()
      .setFooter({ text: '固定メッセージ' });

    const newMessage = await channel.send({ embeds: [embed] });

    pinnedMessageStore.savePinnedMessage(channel.id, {
      messageId: newMessage.id,
      title,
      content,
      color,
      createdAt: data.createdAt,
      updatedAt: new Date().toISOString()
    });

    await interaction.editReply({ 
      content: '⚠️ 既存のメッセージが見つからなかったため、新しく作成しました。' 
    });
  }
}

// ======== 固定メッセージ削除 ========
async function removePinnedMessage(interaction, channel) {
  await interaction.deferReply({ flags: 64 });

  const data = pinnedMessageStore.getPinnedMessage(channel.id);
  if (!data) {
    await interaction.editReply({ 
      content: '⚠️ このチャンネルに固定メッセージはありません。' 
    });
    return;
  }

  // メッセージを削除
  try {
    const message = await channel.messages.fetch(data.messageId);
    await message.delete();
  } catch (err) {
    console.log('[Pin Message] メッセージは既に削除されています');
  }

  // データベースから削除
  pinnedMessageStore.deletePinnedMessage(channel.id);

  await interaction.editReply({ 
    content: '✅ 固定メッセージを削除しました。' 
  });

  console.log(`[Pin Message] 削除: チャンネル ${channel.name} (${channel.id})`);
}

// ======== 固定メッセージ最新化 ========
async function refreshPinnedMessage(interaction, channel) {
  await interaction.deferReply({ flags: 64 });

  const data = pinnedMessageStore.getPinnedMessage(channel.id);
  if (!data) {
    await interaction.editReply({ 
      content: '⚠️ このチャンネルに固定メッセージはありません。' 
    });
    return;
  }

  try {
    // 既存のメッセージを削除
    try {
      const oldMessage = await channel.messages.fetch(data.messageId);
      await oldMessage.delete();
    } catch (err) {
      console.log('[Pin Message] 既存メッセージの削除をスキップ');
    }

    // 新しいメッセージを送信
    const embed = new EmbedBuilder()
      .setTitle(data.title)
      .setDescription(data.content)
      .setColor(parseInt(data.color, 16))
      .setTimestamp()
      .setFooter({ text: '固定メッセージ' });

    const newMessage = await channel.send({ embeds: [embed] });

    // データベースを更新
    pinnedMessageStore.savePinnedMessage(channel.id, {
      messageId: newMessage.id,
      title: data.title,
      content: data.content,
      color: data.color,
      createdAt: data.createdAt,
      updatedAt: new Date().toISOString()
    });

    await interaction.editReply({ 
      content: '✅ 固定メッセージを最新の位置に移動しました！' 
    });

    console.log(`[Pin Message] リフレッシュ: チャンネル ${channel.name} (${channel.id})`);

  } catch (err) {
    console.error('[Pin Message] リフレッシュエラー:', err);
    await interaction.editReply({ 
      content: '❌ メッセージの更新に失敗しました。' 
    });
  }
}

// ======== 固定メッセージ情報表示 ========
async function showPinnedInfo(interaction, channel) {
  await interaction.deferReply({ flags: 64 });

  const data = pinnedMessageStore.getPinnedMessage(channel.id);
  if (!data) {
    await interaction.editReply({ 
      content: '⚠️ このチャンネルに固定メッセージはありません。' 
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('📌 固定メッセージ情報')
    .addFields(
      { name: 'メッセージID', value: data.messageId, inline: true },
      { name: '色', value: `#${data.color}`, inline: true },
      { name: '\u200B', value: '\u200B', inline: true },
      { name: 'タイトル', value: data.title || 'なし', inline: false },
      { name: '内容', value: data.content.substring(0, 1000) + (data.content.length > 1000 ? '...' : ''), inline: false },
      { name: '作成日時', value: `<t:${Math.floor(new Date(data.createdAt).getTime() / 1000)}:F>`, inline: true },
      { name: '更新日時', value: `<t:${Math.floor(new Date(data.updatedAt).getTime() / 1000)}:F>`, inline: true }
    )
    .setColor(parseInt(data.color, 16))
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

// ======== ユーティリティ関数（外部から呼び出し可能） ========

/**
 * Bot起動時にすべての固定メッセージをロード・検証
 */
module.exports.loadAllPinnedMessages = async function(client) {
  try {
    const allData = pinnedMessageStore.getAllPinnedMessages();
    let loadedCount = 0;
    let recreatedCount = 0;
    let removedCount = 0;

    for (const [channelId, data] of Object.entries(allData)) {
      try {
        const channel = await client.channels.fetch(channelId).catch(() => null);
        
        if (!channel || !channel.isTextBased()) {
          // チャンネルが存在しない場合は削除
          pinnedMessageStore.deletePinnedMessage(channelId);
          removedCount++;
          console.log(`[Pin Message] チャンネルが見つからないため削除: ${channelId}`);
          continue;
        }

        // メッセージが存在するか確認
        const message = await channel.messages.fetch(data.messageId).catch(() => null);
        
        if (message) {
          loadedCount++;
        } else {
          // メッセージが存在しない場合は再作成
          console.log(`[Pin Message] メッセージが見つからないため再作成: ${channel.name}`);
          
          const embed = new EmbedBuilder()
            .setTitle(data.title)
            .setDescription(data.content)
            .setColor(parseInt(data.color, 16))
            .setTimestamp()
            .setFooter({ text: '固定メッセージ' });

          const newMessage = await channel.send({ embeds: [embed] });

          pinnedMessageStore.savePinnedMessage(channelId, {
            messageId: newMessage.id,
            title: data.title,
            content: data.content,
            color: data.color,
            createdAt: data.createdAt,
            updatedAt: new Date().toISOString()
          });

          recreatedCount++;
          loadedCount++;
        }

      } catch (err) {
        console.error(`[Pin Message] チャンネル ${channelId} の処理中にエラー:`, err.message);
      }
    }

    console.log(`[Pin Message] ロード完了: ${loadedCount}件 (再作成: ${recreatedCount}件, 削除: ${removedCount}件)`);
    return loadedCount;

  } catch (err) {
    console.error('[Pin Message] ロードエラー:', err);
    return 0;
  }
};

/**
 * 新しいメッセージが投稿されたときに固定メッセージを最新に保つ
 */
module.exports.keepPinnedMessageOnTop = async function(channel) {
  try {
    const data = pinnedMessageStore.getPinnedMessage(channel.id);
    if (!data) return;

    // 最新の5件のメッセージを取得
    const recentMessages = await channel.messages.fetch({ limit: 5 });
    const messageIds = Array.from(recentMessages.keys());

    // 固定メッセージが最新5件に含まれていない場合のみ再送信
    if (!messageIds.includes(data.messageId)) {
      // 既存のメッセージを削除
      try {
        const oldMessage = await channel.messages.fetch(data.messageId);
        await oldMessage.delete();
      } catch (err) {
        // 削除失敗は無視
      }

      // 新しいメッセージを送信
      const embed = new EmbedBuilder()
        .setTitle(data.title)
        .setDescription(data.content)
        .setColor(parseInt(data.color, 16))
        .setTimestamp()
        .setFooter({ text: '固定メッセージ' });

      const newMessage = await channel.send({ embeds: [embed] });

      // データベースを更新
      pinnedMessageStore.savePinnedMessage(channel.id, {
        messageId: newMessage.id,
        title: data.title,
        content: data.content,
        color: data.color,
        createdAt: data.createdAt,
        updatedAt: new Date().toISOString()
      });

      console.log(`[Pin Message] 自動リフレッシュ: ${channel.name}`);
    }

  } catch (err) {
    console.error('[Pin Message] 自動リフレッシュエラー:', err.message);
  }
};
