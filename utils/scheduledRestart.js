const cron = require('node-cron');

/**
 * スケジュールされた再起動を設定
 * 日本時間の5時、12時、17時に再起動を実行
 */
function setupScheduledRestart() {
  console.log('✓ スケジュール再起動を設定しました (JST 5:00, 12:00, 17:00)');

  // 日本時間5時に再起動 (UTC 20:00前日、JST = UTC+9)
  cron.schedule('0 20 * * *', () => {
    console.log('🔄 スケジュール再起動を実行します (JST 5:00)');
    performRestart();
  }, {
    timezone: "Asia/Tokyo"
  });

  // 日本時間12時に再起動 (UTC 3:00)
  cron.schedule('0 3 * * *', () => {
    console.log('🔄 スケジュール再起動を実行します (JST 12:00)');
    performRestart();
  }, {
    timezone: "Asia/Tokyo"
  });

  // 日本時間17時に再起動 (UTC 8:00)
  cron.schedule('0 8 * * *', () => {
    console.log('🔄 スケジュール再起動を実行します (JST 17:00)');
    performRestart();
  }, {
    timezone: "Asia/Tokyo"
  });
}

/**
 * 再起動を実行
 */
function performRestart() {
  console.log('Botを再起動しています...');
  process.exit(0); // プロセスを終了（PM2などのプロセスマネージャーが自動再起動します）
}

module.exports = { setupScheduledRestart };
