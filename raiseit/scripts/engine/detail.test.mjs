import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyIntent } from './detail.mjs';

test('検索意図の簡易分類', () => {
  assert.equal(classifyIntent('メディトク', ['メディトク']), '指名');
  assert.equal(classifyIntent('外来データ提出 料金'), '行動(予約・導入・費用)');
  assert.equal(classifyIntent('提出支援ツール 比較'), '比較検討');
  assert.equal(classifyIntent('データ提出加算とは'), '疑問・情報収集');
  assert.equal(classifyIntent('あいうえお'), 'その他');
});
