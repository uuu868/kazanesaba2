const { Events, ChannelType, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { allowedRoleIds } = require('../utils/roleGuard');
const ticketCounter = require('../utils/ticketCounter');

// 処理中のインタラクションを追跡
const processingInteractions = new Set();

module.exports = {
  name: Events.InteractionCreate,
  once: false,
  async execute(interaction) {
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_select') {
      // 既に処理中の場合はスキップ
      if (processingInteractions.has(interaction.id)) {
        return;
      }
      
      processingInteractions.add(interaction.id);
      
      try {
        await handleTicketCreate(interaction);
      } catch (err) {
        console.error('[Ticket] create error:', err);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: 'チケット作成に失敗しました。', flags: 64 }).catch(() => {});
        }
      } finally {
        // 処理完了後、一定時間後にクリーンアップ
        setTimeout(() => {
          processingInteractions.delete(interaction.id);
        }, 5000);
      }
    }
    
    // チケット閉じるボタンの処理
    if (interaction.isButton() && interaction.customId === 'ticket_close') {
      try {
        await handleTicketClose(interaction);
      } catch (err) {
        console.error('[Ticket] close error:', err);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: 'チケットを閉じる際にエラーが発生しました。', flags: 64 }).catch(() => {});
        }
      }
    }
  }
};

async function handleTicketCreate(interaction) {
  // 最初に応答を遅延させて重複実行を防ぐ
  await interaction.deferReply({ flags: 64 });

  if (!interaction.guild) {
    await interaction.editReply({ content: 'サーバー内でのみ使用できます。' });
    return;
  }

  const guild = interaction.guild;
  const categoryId = interaction.channel?.parentId || null;
  const ticketType = interaction.values[0]; // 選択された用件のタイプ

  // デバック用は特定のユーザーのみ選択可能
  const ALLOWED_DEBUG_USER_ID = '1088020702583603270';
  if (ticketType === 'debug' && interaction.user.id !== ALLOWED_DEBUG_USER_ID) {
    await interaction.editReply({ content: '❌ デバック用チケットはbot作成者のみ選択できます。' });
    return;
  }

  // 用件タイプの日本語名を取得
  const typeNames = {
    'question': '質問',
    'bug': '不具合',
    'suggestion': '提案',
    'event': 'イベント',
    'report': '報告',
    'application': '申請',
    'debug': 'デバック',
    'other': 'その他'
  };
  const typeName = typeNames[ticketType] || 'ticket';

  // チケット番号を取得
  const ticketNumber = ticketCounter.getNextNumber();
  const paddedNumber = String(ticketNumber).padStart(4, '0'); // 0000形式

  const ticketName = `ticket-${paddedNumber}`.toLowerCase();

  const overwrites = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionsBitField.Flags.ViewChannel]
    },
    {
      id: interaction.user.id,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory,
        PermissionsBitField.Flags.AttachFiles,
        PermissionsBitField.Flags.EmbedLinks
      ]
    },
    {
      id: interaction.client.user.id,
      allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels]
    }
  ];

  // スタッフロールを追加
  for (const roleId of allowedRoleIds) {
    overwrites.push({
      id: roleId,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory,
        PermissionsBitField.Flags.AttachFiles,
        PermissionsBitField.Flags.EmbedLinks
      ]
    });
  }

  const channel = await guild.channels.create({
    name: ticketName,
    type: ChannelType.GuildText,
    parent: categoryId,
    permissionOverwrites: overwrites
  });

  const staffPing = allowedRoleIds.map(id => `<@&${id}>`).join(' ');
  
  // 閉じるボタンを作成
  const closeButton = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_close')
      .setLabel('チケットを閉じる')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🔒')
  );

  // 埋め込みメッセージを作成
  const embed = new EmbedBuilder()
    .setDescription('相談内容をご記入の上、管理者の対応をお待ちください。\n誤って作成した場合や、問題が解決した場合を除きチケットを勝手に閉じないで下さい。')
    .setColor(0x5865F2);

  // デバック用の場合は特別な処理
  if (ticketType === 'debug') {
    await channel.send({
      content: `${interaction.user.toString()}さん専用チャットです。\n他の方には表示されません。\n${staffPing}`,
      embeds: [embed],
      components: [closeButton]
    });
  } else {
    await channel.send({
      content: `${interaction.user.toString()}さん専用チャットです。\n他の方には表示されません。\n${staffPing}\n📌 **用件:** ${typeNames[ticketType]}`,
      embeds: [embed],
      components: [closeButton]
    });
  }

  await interaction.editReply({ content: `✅ チャンネルを作成しました: ${channel}` });
}

async function handleTicketClose(interaction) {
  const channel = interaction.channel;
  
  // チケットチャンネルかどうかを確認
  if (!channel.name.startsWith('ticket-')) {
    await interaction.reply({ content: 'このチャンネルはチケットではありません。', flags: 64 });
    return;
  }

  await interaction.reply({ content: '🔒 チケットを閉じています...', flags: 64 });
  
  // 3秒待ってからチャンネルを削除
  setTimeout(async () => {
    try {
      await channel.delete('チケットクローズ');
    } catch (err) {
      console.error('[Ticket] delete error:', err);
    }
  }, 3000);
}
