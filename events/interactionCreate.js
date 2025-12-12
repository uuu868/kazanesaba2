const { Events, ChannelType, PermissionsBitField } = require('discord.js');
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

  // デバック用の場合は特別な処理
  if (ticketType === 'debug') {
    await channel.send({
      content: `${interaction.user.toString()}\nデバックチャンネルです`
    });
  } else {
    const staffPing = allowedRoleIds.map(id => `<@&${id}>`).join(' ');
    const mentions = [interaction.user.toString(), staffPing].filter(Boolean).join(' ');

    await channel.send({
      content: `${mentions}\n📌 **用件:** ${typeNames[ticketType]}\nチケットが作成されました。ご用件を記載してください。`
    });
  }

  await interaction.editReply({ content: `✅ チャンネルを作成しました: ${channel}` });
}
