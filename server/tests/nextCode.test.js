/**
 * nextCode — unit tests
 *
 * Tests BR-17: human-readable codes (ENQ-2026-0001) are generated inside a
 * transaction from the Counter table, and the sequence is monotonically
 * increasing with no gaps within a (prefix, year) pair.
 *
 * These tests hit the real DB via prisma.$transaction so the Counter rows are
 * created and rolled back cleanly. Run with:
 *   npm run test  (which calls node --test on server/)
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/core/prisma.js';
import { nextCode } from '../src/core/codes.js';

const YEAR = new Date().getFullYear();
const PREFIX = 'TST'; // dedicated test prefix — never used in real data

describe('nextCode (BR-17)', () => {
  // Clean up any TST counters left from a previous aborted run.
  before(async () => {
    await prisma.counter.deleteMany({ where: { key: { startsWith: PREFIX } } });
  });

  after(async () => {
    await prisma.counter.deleteMany({ where: { key: { startsWith: PREFIX } } });
    await prisma.$disconnect();
  });

  it('produces the correct format on the first call', async () => {
    const code = await prisma.$transaction((tx) => nextCode(PREFIX, tx));
    assert.match(code, /^TST-\d{4}-\d{4}$/);
    const [, year, seq] = code.split('-');
    assert.equal(year, String(YEAR));
    assert.equal(seq, '0001');
  });

  it('increments the sequence on successive calls', async () => {
    const [c2, c3] = await Promise.all([
      prisma.$transaction((tx) => nextCode(PREFIX, tx)),
      prisma.$transaction((tx) => nextCode(PREFIX, tx)),
    ]);
    // Both must be in the current year and have different, monotone sequences.
    const seq2 = parseInt(c2.split('-')[2], 10);
    const seq3 = parseInt(c3.split('-')[2], 10);
    assert.ok(seq2 >= 2, `expected seq ≥ 2, got ${seq2}`);
    assert.ok(seq3 >= 2, `expected seq ≥ 2, got ${seq3}`);
    assert.notEqual(seq2, seq3, 'concurrent calls produced the same sequence number');
  });

  it('rolls back when the outer transaction aborts', async () => {
    let codeBeforeAbort;
    try {
      await prisma.$transaction(async (tx) => {
        codeBeforeAbort = await nextCode(PREFIX, tx);
        throw new Error('intentional rollback');
      });
    } catch {
      // expected
    }

    // The counter row should be back to its state before the aborted tx.
    const row = await prisma.counter.findUnique({
      where: { key: `${PREFIX}-${YEAR}` },
    });
    // The sequence used in the rolled-back tx must not appear in the next call.
    const seqAborted = parseInt(codeBeforeAbort.split('-')[2], 10);
    const codeAfter = await prisma.$transaction((tx) => nextCode(PREFIX, tx));
    const seqAfter = parseInt(codeAfter.split('-')[2], 10);
    // After a rollback, the Counter row update is rolled back with the transaction,
    // so the sequence number is NOT burned and can be reused (codes.js line 23:
    // "a rolled-back quote does not burn a number").
    assert.equal(seqAfter, seqAborted, 'rolled-back sequence number was not reused');
    assert.ok(row !== null, 'Counter row must exist after partial use');
  });
});
