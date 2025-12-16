const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const dataStore = require('../utils/dataStore');

const BOT_CREATOR_ID = '1088020702583603270';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-roles')
    .setDescription('チケット通知先のロールを設定します（bot作成者のみ）')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('通知先ロールを追加')
        .addRoleOption(option =>
          option.setName('role')
            .setDescription('追加するロール')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('通知先ロールを削除')
        .addRoleOption(option =>
          option.setName('role')
            .setDescription('削除するロール')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('現在の通知先ロール一覧を表示')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('set')
        .setDescription('通知先ロールを一括設定（既存の設定は上書きされます）')
        .addStringOption(option =>
          option.setName('role_ids')
            .setDescription('ロールIDをスペース区切りで指定（例: 123456789 987654321）')
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

      if (subcommand === 'add') {
        const role = interaction.options.getRole('role');
        
        if (ticketRoles.includes(role.id)) {
          await interaction.reply({ 
            content: `⚠️ ロール <@&${role.id}> は既に通知先に登録されています。`, 
            flags: 64 
          });
          return;
        }

        ticketRoles.push(role.id);
        saveTicketRoles(ticketRoles);

        await interaction.reply({ 
          content: `✅ ロール <@&${role.id}> を通知先に追加しました。\n現在の通知先: ${ticketRoles.length}個`, 
          flags: 64 
        });

      } else if (subcommand === 'remove') {
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

      } else if (subcommand === 'list') {
        if (ticketRoles.length === 0) {
          await interaction.reply({ 
            content: '📋 現在、通知先ロールは設定されていません。', 
            flags: 64 
          });
          return;
        }

        const roleList = ticketRoles.map((id, index) => `${index + 1}. <@&${id}> (ID: ${id})`).join('\n');
        await interaction.reply({ 
          content: `📋 **現在の通知先ロール** (${ticketRoles.length}個)\n\n${roleList}`, 
          flags: 64 
        });

      } else if (subcommand === 'set') {
        const roleIdsStr = interaction.options.getString('role_ids');
        const roleIds = roleIdsStr.trim().split(/\s+/);

        // ロールIDの妥当性チェック
        const invalidIds = roleIds.filter(id => !/^\d+$/.test(id));
        if (invalidIds.length > 0) {
          await interaction.reply({ 
            content: `⚠️ 無効なロールIDが含まれています: ${invalidIds.join(', ')}\nロールIDは数字のみで指定してください。`, 
            flags: 64 
          });
          return;
        }

        // 重複を除去
        const uniqueRoleIds = [...new Set(roleIds)];
        saveTicketRoles(uniqueRoleIds);

        const roleList = uniqueRoleIds.map((id, index) => `${index + 1}. <@&${id}>`).join('\n');
        await interaction.reply({ 
          content: `✅ 通知先ロールを一括設定しました (${uniqueRoleIds.length}個)\n\n${roleList}`, 
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
