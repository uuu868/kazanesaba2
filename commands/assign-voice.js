const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const { ensureAllowed } = require('../utils/roleGuard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('assign-voice')
    .setDescription('通話参加者を1500/2000/2500/3000登録後、グループに割り振ります。')
    .addIntegerOption(option =>
      option.setName('groups')
        .setDescription('グループ数（2～10）')
        .setMinValue(2)
        .setMaxValue(10)
        .setRequired(true)
    ),

  async execute(client, interaction) {
    try {
      // ロールチェック
      if (!(await ensureAllowed(interaction))) return;

      const groupCount = interaction.options.getInteger('groups');

      // ユーザーが参加しているボイスチャンネルを取得
      const member = interaction.member;
      const voiceChannel = member?.voice?.channel;
      if (!voiceChannel) {
        await interaction.reply({ content: 'まずボイスチャンネルに参加してください。', flags: 64 });
        return;
      }

      // ボイスチャンネルのメンバー（botを除く）を配列に
      let members = Array.from(voiceChannel.members.values()).filter(m => !m.user.bot);

      if (members.length === 0) {
        await interaction.reply({ content: 'ボイスチャンネルに他の参加者がいません。', flags: 64 });
        return;
      }

      // メンバーのラベル登録（1500/2000/2500/3000）
      const memberLabels = new Map();
      members.forEach(m => memberLabels.set(m.id, null));

      // コマンド実行者のID（権限チェック用）
      const executorId = interaction.user.id;

      // タイムアウト時間
      const TIMEOUT = 300000; // 5分
      const startTime = Date.now();

      // 最初にインタラクションに応答
      await interaction.deferReply().catch(err => console.error('defer error:', err));

      // ラベル登録UIを作成して送信
      await labelRegistrationUI(interaction, members, memberLabels, groupCount, startTime, TIMEOUT, executorId);

    } catch (err) {
      console.error(err);
      await interaction.reply({ content: 'エラーが発生しました。', flags: 64 }).catch(e => console.error(e));
    }
  }
};

// ======== フェーズ1: ラベル登録UI ========
async function labelRegistrationUI(interaction, members, memberLabels, groupCount, startTime, TIMEOUT, executorId) {
  const now = Date.now();
  const elapsed = now - startTime;

  if (elapsed > TIMEOUT) {
    try {
      await interaction.editReply({
        content: 'セッションがタイムアウトしました。もう一度コマンドを実行してください。',
        components: []
      });
    } catch (e) {
      console.error('timeout editReply:', e);
    }
    return;
  }

  // 未登録のメンバー
  const unregisteredMembers = members.filter(m => memberLabels.get(m.id) === null);

  // セレクトメニューを作成
  const selectMenuRows = [];
  if (unregisteredMembers.length > 0) {
    const currentMember = unregisteredMembers[0];
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`label-select-${currentMember.id}-${Date.now()}`)
      .setPlaceholder(`${currentMember.displayName} のラベルを選択（1500/2000/2500/3000）`)
      .addOptions([
        { label: '1500', value: '1500', description: '1500を選択' },
        { label: '2000', value: '2000', description: '2000を選択' },
        { label: '2500', value: '2500', description: '2500を選択' },
        { label: '3000', value: '3000', description: '3000を選択' },
        { label: '無選択', value: 'unselected', description: '無選択として登録' }
      ]);
    selectMenuRows.push(new ActionRowBuilder().addComponents(selectMenu));
  }

  // 完了ボタン
  const completeButton = new ButtonBuilder()
    .setCustomId(`complete-labels-${Date.now()}`)
    .setLabel('ラベル登録完了')
    .setStyle(ButtonStyle.Success);

  const buttonRow = new ActionRowBuilder().addComponents(completeButton);

  // ステータス埋め込み
  const embed = new EmbedBuilder()
    .setTitle('📝 ラベル登録（1500/2000/2500/3000）')
    .setColor(0x0099ff)
    .addFields(
      { name: '合計メンバー', value: String(members.length), inline: true },
      { name: '未登録', value: String(unregisteredMembers.length), inline: true },
      { name: 'グループ数', value: String(groupCount), inline: true }
    );

  // ラベル登録状況を表示
  const labels = ['1500', '2000', '2500', '3000', 'unselected'];
  for (const label of labels) {
    const labelMembers = members.filter(m => memberLabels.get(m.id) === label);
    const displayLabel = label === 'unselected' ? '無選択' : label;
    const memberNames = labelMembers.length === 0 
      ? '（なし）' 
      : labelMembers.map(m => m.displayName).join(', ');
    embed.addFields({ name: `${displayLabel} (${labelMembers.length}人)`, value: memberNames, inline: false });
  }

  const components = selectMenuRows.length > 0 ? [...selectMenuRows, buttonRow] : [buttonRow];

  try {
    await interaction.editReply({ embeds: [embed], components });
  } catch (err) {
    console.error('editReply error:', err);
    return;
  }

  // イベントリスナー（コマンド実行者のみ）
  const filter = i => i.user.id === executorId;

  try {
    // メッセージのコンポーネントコレクターを使用（チャンネルではなく）
    const message = await interaction.fetchReply().catch(err => {
      console.error('fetchReply error:', err);
      return null;
    });

    if (!message) {
      console.error('メッセージが見つかりません');
      return;
    }

    const componentInteraction = await message.awaitMessageComponent({ filter, time: 30000 });

    if (componentInteraction.customId.startsWith('complete-labels')) {
      // グループ割り当てフェーズへ
      await componentInteraction.deferUpdate().catch(err => console.error('deferUpdate error:', err));
      await groupAssignmentPhase(interaction, members, memberLabels, groupCount, executorId);
      return;
    }

    if (componentInteraction.customId.startsWith('label-select-')) {
      const selectedLabel = componentInteraction.values[0];
      const customIdParts = componentInteraction.customId.split('-');
      const memberId = customIdParts[2];
      
      // ラベル選択を記録
      memberLabels.set(memberId, selectedLabel);
      console.log(`[assign-voice] ${memberId} に ${selectedLabel} を設定しました`);

      await componentInteraction.deferUpdate().catch(err => console.error('deferUpdate error:', err));
      
      // 再度UI表示（再帰呼び出し）
      await labelRegistrationUI(interaction, members, memberLabels, groupCount, startTime, TIMEOUT, executorId);
      return;
    }

  } catch (err) {
    if (err.code === 'InteractionCollectorError') {
      try {
        await interaction.editReply({
          content: '入力がタイムアウトしました。コマンドを再実行してください。',
          components: []
        });
      } catch (e) {
        console.error('timeout reply error:', e);
      }
    } else {
      console.error('labelRegistrationUI error:', err.message);
    }
  }
}

// ======== フェーズ2: グループ割り当て ========
async function groupAssignmentPhase(interaction, members, memberLabels, groupCount, executorId) {
  try {
    // ラベルごとのメンバー数を集計
    const labelCounts = {};
    const labelMembers = {};
    const labels = ['1500', '2000', '2500', '3000', 'unselected'];

    for (const label of labels) {
      labelMembers[label] = members.filter(m => memberLabels.get(m.id) === label);
      labelCounts[label] = labelMembers[label].length;
    }

    // 登録されたメンバー（ラベルあり）
    const registeredMembers = members.filter(m => memberLabels.get(m.id) !== null);
    // 未登録メンバー
    const unregisteredMembers = members.filter(m => memberLabels.get(m.id) === null);

    // グループに割り当てる
    const groupAssignments = new Map();
    members.forEach(m => groupAssignments.set(m.id, null));

    // 同じラベルのメンバーを異なるグループに分散
    for (const label of labels) {
      const membersWithLabel = labelMembers[label];
      if (membersWithLabel.length > 0) {
        const count = membersWithLabel.length;
        const groups = distributeMembers(count, groupCount);
        
        // 同じラベルのメンバーを指定グループに割り当て
        for (let i = 0; i < membersWithLabel.length; i++) {
          const groupIdx = groups[i] - 1;
          groupAssignments.set(membersWithLabel[i].id, groups[i]);
        }
      }
    }

    // 未登録メンバーをランダムに割り当て
    for (const m of unregisteredMembers) {
      const randomGroup = Math.floor(Math.random() * groupCount) + 1;
      groupAssignments.set(m.id, randomGroup);
    }

    // 最終結果を表示
    await showFinalResult(interaction, members, groupAssignments, groupCount, memberLabels);

  } catch (err) {
    console.error(err);
    await interaction.editReply({
      content: 'グループ割り当て中にエラーが発生しました。',
      components: []
    });
  }
}

// ======== ヘルパー関数: メンバー分散ロジック ========
function distributeMembers(count, groupCount) {
  // count人をgroupCount個のグループに分散
  // 同じラベルが複数の人数いる場合、異なるグループに割り当てる
  // 奇数の場合は2:1のように不均等に割り当て

  const result = [];
  
  if (count <= groupCount) {
    // メンバー数 ≤ グループ数 → 各メンバーを異なるグループに
    for (let i = 0; i < count; i++) {
      result.push((i % groupCount) + 1);
    }
  } else {
    // メンバー数 > グループ数 → グループ数だけ異なるグループに分散させて繰り返し
    const baseGroups = [];
    for (let i = 0; i < groupCount; i++) {
      baseGroups.push(i + 1);
    }

    // メンバー数分ローテーション
    for (let i = 0; i < count; i++) {
      result.push(baseGroups[i % groupCount]);
    }
  }

  return result;
}

// ======== 最終結果表示 ========
async function showFinalResult(interaction, members, groupAssignments, groupCount, memberLabels) {
  const resultEmbed = new EmbedBuilder()
    .setTitle('✅ グループ割り当て完了')
    .setColor(0x00ff00);

  for (let g = 1; g <= groupCount; g++) {
    const groupMembers = members.filter(m => groupAssignments.get(m.id) === g);
    const memberList = groupMembers.length === 0
      ? '（なし）'
      : groupMembers.map((m, idx) => {
          const label = memberLabels.get(m.id);
          let labelStr = '[未登録]';
          if (label === 'unselected') {
            labelStr = '[無選択]';
          } else if (label) {
            labelStr = `[${label}]`;
          }
          return `${idx + 1}. ${labelStr} <@${m.id}>`;
        }).join('\n');
    
    resultEmbed.addFields({ 
      name: `グループ ${g} (${groupMembers.length}人)`, 
      value: memberList, 
      inline: false 
    });
  }

  await interaction.editReply({
    embeds: [resultEmbed],
    components: []
  });
}
