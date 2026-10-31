import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateBomSummary } from '../src/modules/kit-templates/kit-templates.service.js';

describe('Kit Template Margin Calculation (Stage A1)', () => {
  it('correctly calculates BOM cost, sell total, and margin percentage', () => {
    const mockItems = [
      {
        quantity: 6,
        product: { costPrice: 10000, sellPrice: 15000 },
      },
      {
        quantity: 1,
        product: { costPrice: 35000, sellPrice: 50000 },
      },
    ];

    // cost = (6 * 10000) + (1 * 35000) = 60000 + 35000 = 95000
    // bomSell = (6 * 15000) + (1 * 50000) = 90000 + 50000 = 140000
    // basePrice = 150000 (overridden base price)
    // margin = (150000 - 95000) / 150000 = 55000 / 150000 = 36.67%
    const summary = calculateBomSummary(mockItems, 150000);

    assert.equal(summary.totalCost, 95000);
    assert.equal(summary.bomSellTotal, 140000);
    assert.equal(summary.basePrice, 150000);
    assert.equal(summary.marginPercent, 36.67);
  });

  it('falls back to bomSellTotal when basePrice is 0 or omitted', () => {
    const mockItems = [
      {
        quantity: 2,
        product: { costPrice: 2000, sellPrice: 3000 },
      },
    ];

    // cost = 4000, sell = 6000, margin = (6000 - 4000) / 6000 = 33.33%
    const summary = calculateBomSummary(mockItems, 0);

    assert.equal(summary.totalCost, 4000);
    assert.equal(summary.bomSellTotal, 6000);
    assert.equal(summary.marginPercent, 33.33);
  });
});

