// BuzzIt 課金計算の回帰テスト（依存なし: node --test --experimental-strip-types）
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeMonthlyTotal,
  computeAccountMonthlyTotal,
  canAddStore,
  canAddStaff,
  canAddPersona,
  PLAN_BASE_MONTHLY,
  MAX_STORES_BY_PLAN,
  EXTRA_ACCOUNT_SEAT_MONTHLY,
  EXTRA_SNS_ACCOUNT_MONTHLY,
} from '../../buzzit/api/src/services/billing.ts';

test('店舗0件は0円', () => {
  assert.equal(computeMonthlyTotal('pro', 0), 0);
});

test('1店舗目は基本料のみ', () => {
  assert.equal(computeMonthlyTotal('starter', 1), 4980);
  assert.equal(computeMonthlyTotal('pro', 1), 9800);
});

test('2店舗目以降は20%OFF', () => {
  // pro: 9800 + 9800*0.8 = 17640
  assert.equal(computeMonthlyTotal('pro', 2), 17640);
  // growth: 24800 + 4 * 24800 * 0.8 = 104160
  assert.equal(computeMonthlyTotal('growth', 5), 104160);
});

test('freeは店舗数に関わらず0円（追加ペルソナ枠のみ加算）', () => {
  assert.equal(computeMonthlyTotal('free', 1), 0);
  assert.equal(computeMonthlyTotal('free', 1, 2), 2 * EXTRA_SNS_ACCOUNT_MONTHLY);
});

test('追加ペルソナ枠は負数を無視する', () => {
  assert.equal(computeMonthlyTotal('starter', 1, -3), 4980);
});

test('全プランで基本料が負にならず、店舗数が増えると単調に増える', () => {
  for (const [plan, base] of Object.entries(PLAN_BASE_MONTHLY)) {
    assert.ok(base >= 0, plan);
    const max = Math.min(MAX_STORES_BY_PLAN[plan], 5);
    let prev = 0;
    for (let n = 1; n <= max; n++) {
      const v = computeMonthlyTotal(plan, n);
      assert.ok(v >= prev, `${plan} n=${n}`);
      prev = v;
    }
  }
});

test('店舗・スタッフ・ペルソナの上限判定', () => {
  assert.equal(canAddStore('free', 0), true);
  assert.equal(canAddStore('free', 1), false);
  assert.equal(canAddStore('pro', 1), true);
  assert.equal(canAddStore('pro', 2), false);

  assert.equal(canAddStaff('free', 1), false); // オーナーのみで上限
  assert.equal(canAddStaff('line_pro', 2), true); // 3人まで
  assert.equal(canAddStaff('line_pro', 2, 1), false); // 招待中を含めると超過
  assert.equal(canAddStaff('growth', 999), true); // 無制限

  assert.equal(canAddPersona('starter', 1), false);
  assert.equal(canAddPersona('starter', 1, 1), true);
});

const baseAccount = {
  id: 'a1',
  accountType: 'individual',
  billingStatus: 'active',
  plan: 'starter',
  includedSeats: 1,
  seatCount: 1,
};

test('アカウント月額: 課金中の個人は基本料', () => {
  assert.equal(computeAccountMonthlyTotal(baseAccount, 1), 4980);
});

test('アカウント月額: 法人は追加席を加算', () => {
  const acc = { ...baseAccount, accountType: 'business', includedSeats: 1, seatCount: 3 };
  assert.equal(computeAccountMonthlyTotal(acc, 1), 4980 + 2 * EXTRA_ACCOUNT_SEAT_MONTHLY);
});

test('アカウント月額: 課金対象外ステータスは0円', () => {
  for (const s of ['monitor', 'trial', 'cancelled']) {
    assert.equal(computeAccountMonthlyTotal({ ...baseAccount, billingStatus: s }, 1), 0, s);
  }
  assert.equal(computeAccountMonthlyTotal({ ...baseAccount, billingStatus: 'past_due' }, 1), 4980);
});

test('アカウント月額: 課金免除は常に0円', () => {
  assert.equal(computeAccountMonthlyTotal({ ...baseAccount, billingExempt: true }, 1), 0);
  const future = new Date(Date.now() + 86400_000).toISOString();
  assert.equal(
    computeAccountMonthlyTotal({ ...baseAccount, billingExemptExpiresAt: future }, 1),
    0,
  );
  const past = new Date(Date.now() - 86400_000).toISOString();
  assert.equal(
    computeAccountMonthlyTotal({ ...baseAccount, billingExemptExpiresAt: past }, 1),
    4980,
  );
});
