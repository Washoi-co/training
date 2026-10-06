/**
 * A-PUSH 単語トレーニング：ニックネームでの記録の保存（Google スプレッドシート）
 *
 * 使い方（設定手順は words/sync/README.md）
 *   1. 新しいスプレッドシート →［拡張機能］→［Apps Script］に、このファイルを丸ごと貼り付けて保存
 *   2. ［デプロイ］→［新しいデプロイ］→ 種類「ウェブアプリ」
 *      実行するユーザー：自分　／　アクセスできるユーザー：全員
 *   3. 表示された「ウェブアプリの URL」を、words/index.html の SYNC_URL に入れる
 *
 * 保存するのは「ニックネーム＋自動の4ケタ番号（ID）」と「単語の学習記録」だけです。
 * メールアドレスや本名は受け取りません。
 */

var SHEET = 'records';
var HEAD = ['ID', 'ニックネーム', '作成日時', '最終更新', '覚えた単語', '習得', 'コース', 'データ（JSON）'];
var MAX_DATA = 45000;   // セル1つに入る文字数（5万字）の手前で止める

function sheet_() {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(SHEET);
  if (!sh) {
    sh = ss.insertSheet(SHEET);
    sh.appendRow(HEAD);
    sh.setFrozenRows(1);
    sh.getRange('A:B').setNumberFormat('@');   // ID・ニックネームは文字として扱う
  }
  return sh;
}

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function rowOf_(sh, id) {
  var n = sh.getLastRow() - 1;
  if (n < 1) return 0;
  var ids = sh.getRange(2, 1, n, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === id) return i + 2;
  return 0;
}

// ニックネーム：前後の空白を取り、12文字まで。数式として読まれないよう、先頭の = + - @ と # は外す
function cleanNick_(s) {
  return String(s || '').replace(/[#\u0000-\u001f]/g, '').trim().replace(/^[=+\-@]+/, '').slice(0, 12);
}

/** 記録を読む：GET ?id=たろう%234821 */
function doGet(e) {
  var id = String((e && e.parameter && e.parameter.id) || '').trim();
  if (!id) return out_({ ok: false, error: 'no_id' });
  var sh = sheet_();
  var r = rowOf_(sh, id);
  if (!r) return out_({ ok: false, error: 'not_found' });
  var row = sh.getRange(r, 1, 1, HEAD.length).getValues()[0];
  var data = null;
  try { data = row[7] ? JSON.parse(row[7]) : null; } catch (x) {}
  return out_({ ok: true, id: id, data: data });
}

/** 登録・保存：POST（本文は JSON） */
function doPost(e) {
  var b;
  try { b = JSON.parse(e.postData.contents); } catch (x) { return out_({ ok: false, error: 'bad_json' }); }
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sh = sheet_();

    // 新しく登録：ニックネームに4ケタの番号をつけた ID を返す
    if (b.action === 'create') {
      var nick = cleanNick_(b.nickname);
      if (!nick) return out_({ ok: false, error: 'no_nickname' });
      var id = '';
      for (var k = 0; k < 30; k++) {
        var c = nick + '#' + String(Math.floor(1000 + Math.random() * 9000));
        if (!rowOf_(sh, c)) { id = c; break; }
      }
      if (!id) return out_({ ok: false, error: 'busy' });
      var now = new Date();
      sh.appendRow([id, nick, now, now, 0, 0, String(b.course || ''), '']);
      return out_({ ok: true, id: id });
    }

    // 記録を保存（上書き）
    if (b.action === 'save') {
      var r = rowOf_(sh, String(b.id || ''));
      if (!r) return out_({ ok: false, error: 'not_found' });
      var d = JSON.stringify(b.data || {});
      if (d.length > MAX_DATA) return out_({ ok: false, error: 'too_large' });
      sh.getRange(r, 4, 1, 5).setValues([[new Date(), Number(b.learned) || 0, Number(b.mastered) || 0, String(b.course || ''), d]]);
      return out_({ ok: true });
    }

    return out_({ ok: false, error: 'unknown_action' });
  } finally {
    lock.releaseLock();
  }
}
