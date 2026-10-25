/****************************************************
 * X自動投稿 スケジューラ（5分おき実行＋週次レポート）
 * - スケジュール表から該当タブを判定して Cloud Functions を叩く
 * - 実行ログを「ログ」シートに保存（ヒット時/エラー時のみ記録）
 * - 週次に集計メール送信
 * - 投稿時刻に “日ごと・タブごと” のランダムゆらぎ（ジッター）
 *   └ ジッターは 5分刻みに丸め、5分おきトリガーでも確実に当てる
 * - 同時実行ロック＆指数バックオフで安定化
 ****************************************************/

/* ===== 必要に応じて編集する設定 ===== */
var CONFIG = {
  // スプレッドシートID（URLの /d/ と /edit の間）
  SHEET_ID: '1nNYttrjVh8fIBgVqoccOIyvznl4bbEno8QZP5LiciYU',

  // Cloud Functions のエンドポイント（/tweet_from_sheet まで）
  CF_URL: 'https://asia-northeast1-x-tweet-generator.cloudfunctions.net/tweet-from-sheet',

  // 週次レポート送信先（カンマ区切り可）
  REPORT_TO: 'mappymap@hotmail.co.jp',

  // 週次レポートの曜日・時刻（JST）
  REPORT_WEEKDAY: ScriptApp.WeekDay.MONDAY,
  REPORT_HOUR: 9,
  REPORT_MINUTE: 0,

  // デバッグ：true で Cloud Functions に dryrun=1 を付与
  DRYRUN: false,

  // ▼投稿時刻の “ゆらぎ（ジッター）” 設定
  //   例）20 にすると遅延 0..20 分の範囲（delayモード）
  JITTER_MAX_MIN: 20,
  // 'delay'    ：0..JITTER の範囲で遅らせる（前倒しはしない）
  // 'plusminus'：-JITTER..+JITTER の範囲で前後に揺らす（※早出しを避けたいなら 'delay' 推奨）
  JITTER_MODE: 'delay',

  // ▼ジッターをこの分刻みに“丸める”（5分おきトリガーと整合）
  JITTER_STEP_MIN: 5,

  // ▼判定の許容ウィンドウ（分）…±3分
  TOLERANCE_MIN: 3
};
/* =================================== */

// 名前定義（重複定義エラー回避のため1か所に集約）
var TZ = 'Asia/Tokyo';
var NAMES = { SCHEDULE: 'スケジュール', LOG: 'ログ' };

/* ========== Book/Sheet ========== */
function openBook_() { return SpreadsheetApp.openById(CONFIG.SHEET_ID); }
function sheet_(name)  { return openBook_().getSheetByName(name); }

/* ========== 5分おきの本体（ロック＆バックオフ） ========== */
function runScheduler() {
  // 同時実行ロック（重複起動を防止）
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return; // 先行ジョブがあれば即終了

  try {
    var now = new Date();
    var jst = toJST_(now);

    var rows = readSchedule_();                          // [{tab, days, hhmm, take}, ...]
    var hits = rows.filter(function (r) {
      return shouldRunNow_(jst, r.days, r.hhmm, r.tab);  // ジッター適用版
    });

    var results = [];
    for (var i = 0; i < hits.length; i++) {
      var r = hits[i];
      var qs = { sheet: r.tab, take: r.take || 1, debug: 1 };  // ← これで理由がログに出ます
      if (CONFIG.DRYRUN) qs.dryrun = 1;

      var url = CONFIG.CF_URL + '?' + toQuery_(qs);
      var res = fetchWithRetry_(url, 3); // 3回リトライ
      results.push({ tab: r.tab, code: res.code, body: (res.body || '').slice(0, 300) });
    }

    // ★ヒット時だけ run ログを残す（空配列 [] の記録を回避してシート肥大化を防止）
    if (results.length) {
      log_(jst, 'run', JSON.stringify(results));
    }
  } catch (e) {
    // ★エラー時は必ず記録
    log_(new Date(), 'error', e.message);
    throw e;
  } finally {
    lock.releaseLock(); // ← 必ず残す
  }
}

/* ========== Cloud Functions 呼び出し（指数バックオフ） ========== */
function fetchWithRetry_(url, maxTry) {
  var wait = 500; // ms
  for (var i = 1; i <= maxTry; i++) {
    try {
      var r = UrlFetchApp.fetch(url, { method: 'get', muteHttpExceptions: true });
      return { code: r.getResponseCode(), body: r.getContentText() };
    } catch (err) {
      if (i === maxTry) return { code: 0, body: String(err) };
      Utilities.sleep(wait);
      wait *= 2;
    }
  }
  return { code: 0, body: 'unknown error' };
}

/* ========== 週次レポート ========== */
function sendWeeklyReport() {
  try {
    var sh = sheet_(NAMES.LOG) || openBook_().insertSheet(NAMES.LOG);
    var since = daysAgo_(7);
    var data = sh.getDataRange().getValues()
      .slice(1)
      .filter(function (r) { return r[0] && new Date(r[0]) >= since; });

    var byTab = {};
    var errors = [];

    data.forEach(function (r) {
      var kind = r[1];
      var note = r[2] || '';
      if (kind === 'run') {
        try {
          var arr = JSON.parse(note); // [{tab, code, body}, ...]
          arr.forEach(function (x) {
            var ok = String(x.code).startsWith('2') ? 1 : 0;
            byTab[x.tab] = (byTab[x.tab] || 0) + ok;
            if (!ok) errors.push(x.tab + ': ' + x.code + ' ' + x.body);
          });
        } catch (_) {}
      } else if (kind === 'error') {
        errors.push(note);
      }
    });

    var lines = [
      '【週次レポート】',
      Utilities.formatDate(new Date(), TZ, 'yyyy/MM/dd HH:mm'),
      '',
      '投稿成功件数（直近7日）：'
    ];
    Object.keys(byTab).sort().forEach(function (k) {
      lines.push('・' + k + ': ' + byTab[k] + '件');
    });
    if (errors.length) {
      lines.push('', 'エラー概略：');
      lines.push.apply(lines, errors.slice(0, 20));
    }

    MailApp.sendEmail(CONFIG.REPORT_TO, 'X自動投稿 週次レポート', lines.join('\n'));
  } catch (e) {
    log_(new Date(), 'error', 'report: ' + e.message);
    throw e;
  }
}

/* ========== スケジュール読み取り（時刻セルが Date でもOK） ========== */
function readSchedule_() {
  var sh = sheet_(NAMES.SCHEDULE);
  var v = sh.getDataRange().getValues();
  var header = v[0];
  var col = function (name) { return header.indexOf(name); };

  var ia = col('A:シート名(タブ名)');
  var ib = col('B:曜日');
  var ic = col('C:時刻(HH:MM)');
  var id = col('D:件数(take)');

  var out = [];
  for (var i = 1; i < v.length; i++) {
    var row = v[i];
    var tab  = (row[ia] || '').toString().trim();
    var days = (row[ib] || '').toString().trim();

    var hhmm;
    if (row[ic] instanceof Date) {
      hhmm = Utilities.formatDate(row[ic], TZ, 'H:mm'); // 例: 7:00, 21:05
    } else {
      hhmm = String(row[ic] || '').trim();
    }

    var take = Number(row[id] || 1) || 1;
    if (!tab || !days || !hhmm) continue;
    out.push({ tab: tab, days: days, hhmm: hhmm, take: take });
  }
  return out;
}

/* ========== 時刻マッチ（ジッター5分丸め＋±3分ウィンドウ） ========== */
// “同じ日・同じタブ”では同じだけずらす（翌日になれば別値）
function dailyJitterMinutes_(tab, date) {
  var max = Number(CONFIG.JITTER_MAX_MIN || 0);
  if (!max) return 0;

  var key = (tab || '') + Utilities.formatDate(date, TZ, 'yyyyMMdd');
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_1, key);
  var n = 0;
  for (var i = 0; i < 4; i++) n = (n << 8) + (bytes[i] & 0xff);

  var raw = (CONFIG.JITTER_MODE === 'delay')
    ? (n % (max + 1))               // 0..max
    : ((n % (max * 2 + 1)) - max);  // -max..+max

  // ★5分刻みに丸める（5分トリガーと整合）
  var step = Number(CONFIG.JITTER_STEP_MIN || 0);
  if (step > 0) raw = Math.round(raw / step) * step;

  return raw;
}

function shouldRunNow_(jst, dayExpr, hhmm, tab) {
  // --- 曜日マッチ ---
  var w = ['日','月','火','水','木','金','土'][jst.getDay()];
  var normalize = function (s) { return s.replace(/[・,\s]/g,'').replace('〜','~'); };
  var d = normalize(dayExpr);

  var okDay = false;
  if (d === '毎日') okDay = true;
  else if (d === '平日') okDay = /月|火|水|木|金/.test(w);
  else if (d === '土日') okDay = /土|日/.test(w);
  else if (/^[日月火水木金土]+$/.test(d)) okDay = d.indexOf(w) >= 0;
  else if (/^[日月火水木金土]~[日月火水木金土]$/.test(d)) {
    var order = '日月火水木金土';
    var si = order.indexOf(d[0]), ei = order.indexOf(d[2]), wi = order.indexOf(w);
    okDay = si <= ei ? (wi>=si && wi<=ei) : (wi>=si || wi<=ei);
  }
  if (!okDay) return false;

  // --- 時刻マッチ（ジッター適用＋許容窓） ---
  var m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return false;

  var hh = Number(m[1]), mm = Number(m[2]);
  var jitter = dailyJitterMinutes_(tab || '', jst); // 分
  var target = new Date(jst);
  target.setHours(hh, mm + jitter, 0, 0);

  var tol = Number(CONFIG.TOLERANCE_MIN || 2);
  var diff = Math.abs(jst.getTime() - target.getTime());
  return diff <= tol * 60 * 1000;
}

/* ========== ユーティリティ ========== */
function toJST_(d) { return new Date(Utilities.formatDate(d, TZ, 'yyyy/MM/dd HH:mm:ss')); }
function daysAgo_(n) { var dd = new Date(); dd.setDate(dd.getDate() - n); return dd; }
function toQuery_(obj) {
  var pairs = [];
  for (var k in obj) {
    if (obj.hasOwnProperty(k) && obj[k] !== undefined && obj[k] !== null) {
      pairs.push(encodeURIComponent(k) + '=' + encodeURIComponent(String(obj[k])));
    }
  }
  return pairs.join('&');
}
function log_(when, kind, note) {
  var sh = sheet_(NAMES.LOG) || openBook_().insertSheet(NAMES.LOG);
  sh.insertRows(2, 1);
  sh.getRange(2, 1, 1, 3)
    .setValues([[Utilities.formatDate(when, TZ, 'yyyy/MM/dd HH:mm:ss'), kind, note]]);
}

/* ========== セットアップ補助 ========== */
// シートIDにアクセスできるかチェック（初回の権限付与用）
function pingSheetId() {
  var ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  Logger.log('OK: ' + ss.getName());
}

// 5分おきトリガー + 週次レポートトリガーを作成
function installAllTriggers() {
  // 既存クリア
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });

  // 5分おき
  ScriptApp.newTrigger('runScheduler').timeBased().everyMinutes(5).create();

  // 週次
  ScriptApp.newTrigger('sendWeeklyReport')
    .timeBased()
    .onWeekDay(CONFIG.REPORT_WEEKDAY)
    .atHour(CONFIG.REPORT_HOUR)
    .nearMinute(CONFIG.REPORT_MINUTE)
    .create();
}

/* ========== デバッグ：1回だけ叩く（任意） ========== */
function debugCallOnce() {
  var url = CONFIG.CF_URL + '?' + toQuery_({
    sheet: 'A_論文',  // 存在するタブ名に変更
    take: 1,
    dryrun: CONFIG.DRYRUN ? 1 : 0
  });
  var res = fetchWithRetry_(url, 1);
  Logger.log('HTTP ' + res.code + '\n' + (res.body || '').slice(0, 800));
  log_(toJST_(new Date()), 'debugCall', JSON.stringify(res));
}
