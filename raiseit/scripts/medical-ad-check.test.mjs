import test from 'node:test';
import assert from 'node:assert/strict';
import { checkText } from './medical-ad-check.mjs';

test('体験談はblock', () => assert.equal(checkText('患者様の声: 治りました').verdict, 'block'));
test('断定・保証はblock', () => assert.equal(checkText('必ず治ります').verdict, 'block'));
test('最上級はreview', () => assert.equal(checkText('地域No.1の実績').verdict, 'review'));
test('口コミ特典はblock', () => assert.equal(checkText('口コミを投稿いただくと割引します').verdict, 'block'));
test('星5指定はblock', () => assert.equal(checkText('星5をお願いします').verdict, 'block'));
test('通常の案内文は指摘なし', () => assert.equal(checkText('当院は内科・胃腸科・外科の診療を行っています。診療時間は平日9時から18時です。').verdict, 'ok'));
test('自由診療で費用とリスクが無いとreview', () => {
  const r = checkText('ボトックス治療を行っています');
  assert.equal(r.verdict, 'review');
  assert.ok(r.findings.some((f) => f.rule === 'free-cost') && r.findings.some((f) => f.rule === 'free-risk'));
});
test('自由診療でも費用とリスクがあれば問題なし', () => assert.equal(checkText('ボトックス治療 税込33,000円。主なリスク: 内出血など').verdict, 'ok'));
