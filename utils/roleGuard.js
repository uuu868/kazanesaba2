const dataStore = require('./dataStore');

// デフォルトのロールID（初期値）- チケット用
const defaultTicketRoleIds = [
  '1129344788387348598',
  '1425781220419309699',
  '1129344788387348597',
  '1321112240291577887',
  '1432590712662130729'
];

// デフォルトのロールID（初期値）- リマインド用
const defaultReminderRoleIds = [
  '1129344788387348598',
  '1425781220419309699',
  '1129344788387348597',
  '1321112240291577887',
  '1432590712662130729'
];

// 許可されたユーザーID
const allowedUserIds = [
  '959816319568576582'
];

/**
 * 現在の許可ロールIDを取得（チケット用・動的に読み込み）
 */
function getAllowedRoleIds() {
  const saved = dataStore.getMapping('ticket_roles');
  if (saved && Array.isArray(saved.roleIds)) {
    return saved.roleIds;
  }
  return defaultTicketRoleIds;
}

/**
 * 現在の許可ロールIDを取得（リマインド用・動的に読み込み）
 */
function getReminderRoleIds() {
  const saved = dataStore.getMapping('reminder_roles');
  if (saved && Array.isArray(saved.roleIds)) {
    return saved.roleIds;
  }
  return defaultReminderRoleIds;
}

// 後方互換性のため、allowedRoleIdsをgetterとして提供
const allowedRoleIds = new Proxy([], {
  get(target, prop) {
    const currentIds = getAllowedRoleIds();
    if (prop === 'length') return currentIds.length;
    if (prop === 'map') return currentIds.map.bind(currentIds);
    if (prop === 'some') return currentIds.some.bind(currentIds);
    if (prop === 'includes') return currentIds.includes.bind(currentIds);
    if (prop === 'filter') return currentIds.filter.bind(currentIds);
    if (prop === 'push') return currentIds.push.bind(currentIds);
    if (!isNaN(prop)) return currentIds[prop];
    return currentIds[prop];
  }
});

function hasAllowedRole(member) {
  if (!member || !member.roles) return false;
  
  // ユーザーIDで許可されているかチェック
  if (allowedUserIds.includes(member.user.id)) return true;
  
  // ロールで許可されているかチェック
  const currentIds = getAllowedRoleIds();
  return currentIds.some(id => member.roles.cache.has(id));
}

function hasReminderRole(member) {
  if (!member || !member.roles) return false;
  
  // ユーザーIDで許可されているかチェック
  if (allowedUserIds.includes(member.user.id)) return true;
  
  // ロールで許可されているかチェック
  const currentIds = getReminderRoleIds();
  return currentIds.some(id => member.roles.cache.has(id));
}

async function ensureAllowed(interaction) {
  if (!hasAllowedRole(interaction.member)) {
    await interaction.reply({ content: 'このコマンドを使用できるロールではありません。', flags: 64 }).catch(() => {});
    return false;
  }
  return true;
}

async function ensureReminderAllowed(interaction) {
  if (!hasReminderRole(interaction.member)) {
    await interaction.reply({ content: 'このコマンドを使用できるロールではありません。', flags: 64 }).catch(() => {});
    return false;
  }
  return true;
}

module.exports = {
  allowedRoleIds,
  getAllowedRoleIds,
  getReminderRoleIds,
  hasAllowedRole,
  hasReminderRole,
  ensureAllowed,
  ensureReminderAllowed
};
