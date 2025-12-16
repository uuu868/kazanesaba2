const dataStore = require('./dataStore');

// デフォルトのロールID（初期値）
const defaultRoleIds = [
  '1129344788387348598',
  '1425781220419309699',
  '1129344788387348597',
  '1321112240291577887',
  '1432590712662130729'
];

/**
 * 現在の許可ロールIDを取得（動的に読み込み）
 */
function getAllowedRoleIds() {
  const saved = dataStore.getMapping('ticket_roles');
  if (saved && Array.isArray(saved.roleIds)) {
    return saved.roleIds;
  }
  return defaultRoleIds;
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
  const currentIds = getAllowedRoleIds();
  return currentIds.some(id => member.roles.cache.has(id));
}

async function ensureAllowed(interaction) {
  if (!hasAllowedRole(interaction.member)) {
    await interaction.reply({ content: 'このコマンドを使用できるロールではありません。', flags: 64 }).catch(() => {});
    return false;
  }
  return true;
}

module.exports = {
  allowedRoleIds,
  getAllowedRoleIds,
  hasAllowedRole,
  ensureAllowed
};
