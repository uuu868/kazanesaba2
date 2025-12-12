const { Events, ChannelType, PermissionsBitField } = require('discord.js');
const { allowedRoleIds } = require('../utils/roleGuard');

module.exports = {
  name: Events.InteractionCreate,
  once: false,
  async execute(interaction) {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'ticket_create') {
      try {
        await handleTicketCreate(interaction);
      } catch (err) {
        console.error('[Ticket] create error:', err);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: 'チケット作成に失敗しました。', ephemeral: true }).catch(() => {});
        }
      }
    }
  }
};

async function handleTicketCreate(interaction) {
  if (!interaction.guild) {
    await interaction.reply({ content: 'サーバー内でのみ使用できます。', ephemeral: true });
    return;
  }

  const guild = interaction.guild;
  const categoryId = interaction.channel?.parentId || null;

  const ticketName = `ticket-${interaction.user.username}`.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase().slice(0, 90);

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
  const mentions = [interaction.user.toString(), staffPing].filter(Boolean).join(' ');

  await channel.send({
    content: `${mentions}\nチケットが作成されました。ご用件を記載してください。`
  });

  await interaction.reply({ content: `✅ チャンネルを作成しました: ${channel}`, ephemeral: true });
}
