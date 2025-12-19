const { Events } = require('discord.js');
const voiceActivityManager = require('../utils/voiceActivityManager');

module.exports = {
  name: Events.VoiceStateUpdate,
  once: false,
  async execute(oldState, newState) {
    const userId = newState.id;
    const username = newState.member.user.username;
    const guildId = newState.guild.id;

    // ボットは無視
    if (newState.member.user.bot) {
      return;
    }

    // ボイスチャンネルに参加した場合
    if (!oldState.channelId && newState.channelId) {
      console.log(`[VoiceActivity] ${username} がボイスチャンネルに参加: ${newState.channel.name}`);
      voiceActivityManager.startVoiceSession(guildId, userId, username);
    }
    
    // ボイスチャンネルから退出した場合
    else if (oldState.channelId && !newState.channelId) {
      console.log(`[VoiceActivity] ${username} がボイスチャンネルから退出: ${oldState.channel.name}`);
      voiceActivityManager.endVoiceSession(guildId, userId);
    }
    
    // チャンネル移動の場合は何もしない（セッション継続）
    else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
      console.log(`[VoiceActivity] ${username} がチャンネル移動: ${oldState.channel.name} → ${newState.channel.name}`);
    }
  }
};
