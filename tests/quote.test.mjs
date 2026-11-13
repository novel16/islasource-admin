import assert from "node:assert/strict";
import test from "node:test";
import { calculateQuote, initialData, migrateDemoBrand } from "../lib/data.ts";

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

test("existing demo edits survive the IslaSource brand migration", () => {
  const saved = structuredClone(initialData);
  saved.settings.business = "Bantayan Seafoods";
  saved.settings.email = "hello@bantayanseafoods.com";
  saved.settings.deposit = 60;
  saved.products[0].meta_title = "Dried squid | Bantayan Seafoods";
  saved.products[0].description = "My edited product description.";
  saved.rfqs[0].notes = ["Keep my supplier note."];

  const migrated = migrateDemoBrand(saved);
  assert.equal(migrated.settings.business, "IslaSource Seafoods");
  assert.equal(migrated.settings.email, initialData.settings.email);
  assert.equal(migrated.settings.deposit, 60);
  assert.equal(
    migrated.products[0].meta_title,
    "Dried squid | IslaSource Seafoods",
  );
  assert.equal(
    migrated.products[0].description,
    "My edited product description.",
  );
  assert.deepEqual(migrated.rfqs, saved.rfqs);
  assert.deepEqual(migrated.quotes, saved.quotes);
  assert.deepEqual(migrated.orders, saved.orders);
  assert.equal(saved.settings.business, "Bantayan Seafoods");

  saved.settings.email = "my-business@example.com";
  assert.equal(
    migrateDemoBrand(saved).settings.email,
    "my-business@example.com",
  );
});
