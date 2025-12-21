const { loadData, saveData } = require('./dataStore');

// しりとりチャンネルID
const SHIRITORI_CHANNEL_ID = '1452411641428705462';

// 各サーバーのしりとりデータ
let shiritoriData = {};

/**
 * データをロード
 */
function loadShiritoriData() {
  shiritoriData = loadData('shiritori', {});
}

/**
 * データを保存
 */
function saveShiritoriData() {
  saveData('shiritori', shiritoriData);
}

/**
 * サーバーのしりとりデータを取得
 */
function getGuildData(guildId) {
  if (!shiritoriData[guildId]) {
    shiritoriData[guildId] = {
      usedWords: [],
      lastWord: null,
      lastChar: null,
      gameActive: true
    };
  }
  return shiritoriData[guildId];
}

/**
 * ひらがなに変換（簡易版）
 */
function toHiragana(str) {
  return str.replace(/[\u30a1-\u30f6]/g, match => {
    const chr = match.charCodeAt(0) - 0x60;
    return String.fromCharCode(chr);
  });
}

/**
 * 単語の最後の文字を取得（小文字を考慮）
 */
function getLastChar(word) {
  const hiragana = toHiragana(word);
  let lastChar = hiragana.charAt(hiragana.length - 1);
  
  // 小文字（ぁ、ぃ、ぅ、ぇ、ぉ、ゃ、ゅ、ょ、ゎ、っ）で終わる場合は前の文字を使う
  const smallChars = ['ぁ', 'ぃ', 'ぅ', 'ぇ', 'ぉ', 'ゃ', 'ゅ', 'ょ', 'ゎ', 'っ'];
  if (smallChars.includes(lastChar) && hiragana.length > 1) {
    lastChar = hiragana.charAt(hiragana.length - 2);
  }
  
  // 長音記号「ー」で終わる場合は前の文字を使う
  if (lastChar === 'ー' && hiragana.length > 1) {
    lastChar = hiragana.charAt(hiragana.length - 2);
  }
  
  return lastChar;
}

/**
 * 単語の最初の文字を取得
 */
function getFirstChar(word) {
  const hiragana = toHiragana(word);
  return hiragana.charAt(0);
}

/**
 * ひらがな・カタカナのみかチェック
 */
function isKana(str) {
  return /^[\u3040-\u309F\u30A0-\u30FF\u30FC]+$/.test(str);
}

/**
 * しりとりのメッセージを処理
 */
async function processShiritoriMessage(message) {
  if (message.channel.id !== SHIRITORI_CHANNEL_ID) {
    return;
  }

  const guildData = getGuildData(message.guild.id);
  const word = message.content.trim();

  // ひらがな・カタカナのみかチェック
  if (!isKana(word)) {
    await message.reply('❌ ひらがなかカタカナで入力してください！');
    return;
  }

  // 単語の長さチェック（1文字以上）
  if (word.length === 0) {
    return;
  }

  // 最初の単語の場合
  if (!guildData.lastChar) {
    const lastChar = getLastChar(word);
    
    if (lastChar === 'ん') {
      await message.reply('❌ 「ん」で終わっています！ゲームオーバー！\n新しくスタートしてください。');
      guildData.usedWords = [];
      guildData.lastWord = null;
      guildData.lastChar = null;
      saveShiritoriData();
      return;
    }
    
    guildData.lastWord = word;
    guildData.lastChar = lastChar;
    guildData.usedWords.push(word);
    saveShiritoriData();
    
    await message.reply(`✅ しりとりスタート！\n次は「**${lastChar}**」から始まる言葉です！`);
    return;
  }

  // 前の単語の最後の文字で始まっているかチェック
  const firstChar = getFirstChar(word);
  if (firstChar !== guildData.lastChar) {
    await message.reply(`❌ 「**${guildData.lastChar}**」から始まる言葉を入力してください！`);
    return;
  }

  // 既出の単語かチェック
  if (guildData.usedWords.includes(word)) {
    await message.reply('❌ その言葉はもう使われています！');
    return;
  }

  // 「ん」で終わっているかチェック
  const lastChar = getLastChar(word);
  if (lastChar === 'ん') {
    await message.reply(`❌ 「ん」で終わっています！ゲームオーバー！\n**${message.author.username}** の負けです！\n\n📊 使用単語数: ${guildData.usedWords.length}個\n新しくスタートしてください。`);
    guildData.usedWords = [];
    guildData.lastWord = null;
    guildData.lastChar = null;
    saveShiritoriData();
    return;
  }

  // 成功
  guildData.lastWord = word;
  guildData.lastChar = lastChar;
  guildData.usedWords.push(word);
  saveShiritoriData();

  await message.reply(`✅ 正解！（${guildData.usedWords.length}個目）\n次は「**${lastChar}**」から始まる言葉です！`);
}

/**
 * しりとりをリセット
 */
function resetShiritori(guildId) {
  if (shiritoriData[guildId]) {
    shiritoriData[guildId] = {
      usedWords: [],
      lastWord: null,
      lastChar: null,
      gameActive: true
    };
    saveShiritoriData();
  }
}

/**
 * しりとりの状態を取得
 */
function getShiritoriStatus(guildId) {
  const guildData = getGuildData(guildId);
  return {
    wordCount: guildData.usedWords.length,
    lastWord: guildData.lastWord,
    lastChar: guildData.lastChar,
    recentWords: guildData.usedWords.slice(-10) // 最新10個
  };
}

// 起動時にデータをロード
loadShiritoriData();

module.exports = {
  processShiritoriMessage,
  resetShiritori,
  getShiritoriStatus,
  SHIRITORI_CHANNEL_ID
};
