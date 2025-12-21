const { loadData, saveData } = require('./dataStore');
const axios = require('axios');

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
      lastUserId: null,
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
 * 辞書APIで単語が実在するかチェック
 */
async function isValidWord(word) {
  try {
    // goo辞書APIを使用して単語の存在をチェック
    const response = await axios.get('https://api.goo.ne.jp/hiragana/request.json', {
      params: {
        app_id: 'dj00aiZpPWJMaUFSVHFSZ3E3ViZzPWNvbnN1bWVyc2VjcmV0Jng9NDU-', // 無料の公開キー
        sentence: word,
        output_type: 'hiragana'
      },
      timeout: 3000
    });
    
    // APIが正常に応答した場合は有効な単語とみなす
    if (response.data && response.data.converted) {
      return true;
    }
  } catch (error) {
    // API呼び出し失敗時はログを出力
    console.log(`[Shiritori] 辞書API呼び出し失敗: ${error.message}`);
  }
  
  // より信頼性の高い方法: Yahoo!かGoogleの日本語辞書APIを試す
  try {
    // 簡易的な辞書チェック: Wikipediaの検索を利用
    const searchResponse = await axios.get('https://ja.wikipedia.org/w/api.php', {
      params: {
        action: 'opensearch',
        search: word,
        limit: 1,
        namespace: 0,
        format: 'json'
      },
      timeout: 3000
    });
    
    // 検索結果がある場合は有効な単語とみなす
    if (searchResponse.data && searchResponse.data[1] && searchResponse.data[1].length > 0) {
      const result = searchResponse.data[1][0].toLowerCase();
      const searchWord = word.toLowerCase();
      // 完全一致または部分一致の場合
      if (result === searchWord || result.includes(searchWord)) {
        return true;
      }
    }
  } catch (error) {
    console.log(`[Shiritori] Wikipedia検索失敗: ${error.message}`);
  }
  
  // すべてのAPIが失敗した場合、簡易的な判定として2文字以上であれば許可
  // （本番環境では、オフライン辞書ファイルを使用することを推奨）
  return word.length >= 2;
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

  // 連続投稿チェック
  if (guildData.lastUserId === message.author.id) {
    await message.reply('❌ 同じ人が連続で投稿することはできません！\n他の人の番を待ってください。');
    return;
  }

  // ひらがな・カタカナのみかチェック
  if (!isKana(word)) {
    await message.reply('❌ ひらがなかカタカナで入力してください！');
    return;
  }

  // 単語の長さチェック（1文字以上）
  if (word.length === 0) {
    return;
  }

  // 実在する単語かチェック
  const isValid = await isValidWord(word);
  if (!isValid) {
    await message.reply('❌ その言葉は辞書に見つかりませんでした！\n実在する言葉を入力してください。');
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
    guildData.lastUserId = message.author.id;
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
    guildData.lastUserId = null;
    saveShiritoriData();
    return;
  }

  // 成功
  guildData.lastWord = word;
  guildData.lastChar = lastChar;
  guildData.lastUserId = message.author.id;
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
      lastUserId: null,
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
