const allowedRoleIds = [
  '1432590712662130729',
  '1321112240291577887',
  '1129344788387348597',
  '1425781220419309699',
  '1129344788387348598'
];

function hasAllowedRole(member) {
  if (!member || !member.roles) return false;
  return allowedRoleIds.some(id => member.roles.cache.has(id));
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
  hasAllowedRole,
  ensureAllowed
};
