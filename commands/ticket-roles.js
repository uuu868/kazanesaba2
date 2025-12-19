const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const dataStore = require('../utils/dataStore');

const BOT_CREATOR_ID = '1088020702583603270';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-roles')
    .setDescription('チケット通知先のロールを設定します（bot作成者のみ）')
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('通知先ロールを削除')
        .addRoleOption(option =>
          option.setName('role')
            .setDescription('削除するロール')
            .setRequired(true)
        )
    ),

  async execute(client, interaction) {
    try {
      // bot作成者チェック
      if (interaction.user.id !== BOT_CREATOR_ID) {
        await interaction.reply({ 
          content: '❌ このコマンドはbot作成者のみ使用できます。', 
          flags: 64 
        });
        return;
      }

      const subcommand = interaction.options.getSubcommand();

      // 現在の設定を取得（デフォルト値も含む）
      let ticketRoles = getTicketRoles();

      if (subcommand === 'remove') {
        const role = interaction.options.getRole('role');
        
        if (!ticketRoles.includes(role.id)) {
          await interaction.reply({ 
            content: `⚠️ ロール <@&${role.id}> は通知先に登録されていません。`, 
            flags: 64 
          });
          return;
        }

        ticketRoles = ticketRoles.filter(id => id !== role.id);
        saveTicketRoles(ticketRoles);

        await interaction.reply({ 
          content: `✅ ロール <@&${role.id}> を通知先から削除しました。\n現在の通知先: ${ticketRoles.length}個`, 
          flags: 64 
        });
      }

    } catch (err) {
      console.error('[Ticket Roles] error:', err);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ 
          content: 'エラーが発生しました。', 
          flags: 64 
        }).catch(() => {});
      }
    }
  }
};

/**
 * チケット通知先ロールを取得
 */
function getTicketRoles() {
  const saved = dataStore.getMapping('ticket_roles');
  if (saved && Array.isArray(saved.roleIds)) {
    return saved.roleIds;
  }
  // デフォルト値（現在のroleGuard.jsの値）
  return [
    '1129344788387348598',
    '1425781220419309699',
    '1129344788387348597',
    '1321112240291577887',
    '1432590712662130729'
  ];
}

/**
 * チケット通知先ロールを保存
 */
function saveTicketRoles(roleIds) {
  dataStore.saveMapping('ticket_roles', {
    roleIds: roleIds,
    updatedAt: new Date().toISOString()
  });
}

// 外部から取得できるようにエクスポート
module.exports.getTicketRoles = getTicketRoles;
