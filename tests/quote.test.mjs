import assert from "node:assert/strict";
import test from "node:test";
import { calculateQuote } from "../lib/data.ts";

const sample = {
  quantity: 5,
  unitCost: 50_000,
  handling: 20_000,
  markup: 20,
  delivery: 35_000,
  deposit: 50,
};

test("5kg quotation uses markup on cost plus handling, all in centavos", () => {
  assert.deepEqual(calculateQuote(sample), {
    cost: 250_000,
    markup: 54_000,
    subtotal: 324_000,
    total: 359_000,
    deposit: 179_500,
    balance: 179_500,
  });
  const rounded = calculateQuote({
    ...sample,
    quantity: 1.25,
    unitCost: 10_001,
    handling: 1,
    delivery: 0,
    markup: 12.5,
    deposit: 33,
  });
  assert.equal(rounded.total, 14_065);
  assert.equal(rounded.deposit + rounded.balance, rounded.total);
});

test("invalid quantities, costs and percentages are rejected", () => {
  for (const invalid of [
    { quantity: 0 },
    { quantity: -1 },
    { quantity: NaN },
    { quantity: Infinity },
    { unitCost: -1 },
    { unitCost: 1.5 },
    { handling: -10 },
    { delivery: Infinity },
    { markup: -1 },
    { markup: 1001 },
    { deposit: -1 },
    { deposit: 101 },
  ]) {
    assert.throws(() => calculateQuote({ ...sample, ...invalid }), RangeError);
  }
});
