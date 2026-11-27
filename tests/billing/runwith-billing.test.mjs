// RunWith 課金計算の回帰テスト（依存なし: node --test --experimental-strip-types）
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeMonthlyTotal,
  computeSeatUsage,
  canAddSeat,
  inviteAddsExtraSeatCharge,
  INCLUDED_SEATS,
  EXTRA_SEAT_MONTHLY,
  MEDICAL_ADDON_MONTHLY,
} from '../../runwith/app/src/lib/billing.ts';

test('基本料（2人まで含む）', () => {
  assert.equal(computeMonthlyTotal('free', 2, false), 0);
  assert.equal(computeMonthlyTotal('growth', 2, false), 2980);
  assert.equal(computeMonthlyTotal('pro', 1, false), 9800);
});

test('3人目以降は1席980円', () => {
  assert.equal(computeMonthlyTotal('growth', 5, false), 2980 + 3 * EXTRA_SEAT_MONTHLY);
});

test('医療モードはfreeでは加算されない', () => {
  assert.equal(computeMonthlyTotal('free', 2, true), 0);
  assert.equal(computeMonthlyTotal('growth', 2, true), 2980 + MEDICAL_ADDON_MONTHLY);
  assert.equal(computeMonthlyTotal('pro', 4, true), 9800 + 2 * EXTRA_SEAT_MONTHLY + MEDICAL_ADDON_MONTHLY);
});

test('席数の集計（招待中も席として数える）', () => {
  const u = computeSeatUsage(2, 1, 'growth');
  assert.equal(u.occupiedSeats, 3);
  assert.equal(u.extraSeats, 1);
  assert.equal(u.includedSeats, INCLUDED_SEATS);
  assert.equal(u.maxSeatsWithoutUpgrade, Number.POSITIVE_INFINITY);
  assert.equal(computeSeatUsage(1, 0, 'free').maxSeatsWithoutUpgrade, INCLUDED_SEATS);
});

test('freeは2席まで、有料は無制限', () => {
  assert.equal(canAddSeat('free', 1), true);
  assert.equal(canAddSeat('free', 2), false);
  assert.equal(canAddSeat('growth', 100), true);
});

test('3人目の招待で追加料金が発生する', () => {
  assert.equal(inviteAddsExtraSeatCharge(1), false);
  assert.equal(inviteAddsExtraSeatCharge(2), true);
});
