import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/core/prisma.js';
import registerInvoiceListeners from '../src/modules/invoices/invoices.listeners.js';
import { emitEvent } from '../src/core/events.js';

describe('Finance Layer (Stage A2)', () => {
  it('recalculates amountPaid and status when payments are recorded', async () => {
    // Register listeners for test
    registerInvoiceListeners();

    // Find any existing non-cancelled invoice with lines
    const invoice = await prisma.invoice.findFirst({
      where: { status: { not: 'CANCELLED' } },
    });
    assert.ok(invoice, 'Invoice must exist in seed data');

    const total = Number(invoice.total);
    const halfPayment = Number((total / 2).toFixed(2));

    // Simulate payment.recorded event
    const anyUser = await prisma.user.findFirst({ where: { isActive: true } });
    const dummyPayment = await prisma.payment.create({
      data: {
        customerId: invoice.customerId,
        projectId: invoice.projectId,
        invoiceId: invoice.id,
        amount: halfPayment,
        type: 'PARTIAL',
        mode: 'UPI',
        reference: `UPI-TEST-${Date.now()}`,
        receivedAt: new Date(),
        recordedById: anyUser.id,
      },
    });

    emitEvent('payment.recorded', {
      paymentId: dummyPayment.id,
      invoiceId: invoice.id,
      projectId: invoice.projectId,
    });

    // Allow event to process
    await new Promise((r) => setTimeout(r, 100));

    const refreshed = await prisma.invoice.findUnique({ where: { id: invoice.id } });
    assert.ok(Number(refreshed.amountPaid) > 0);
    assert.equal(refreshed.status, Number(refreshed.amountPaid) >= total ? 'PAID' : 'PARTIALLY_PAID');

    // Clean up dummy payment
    await prisma.payment.delete({ where: { id: dummyPayment.id } });
  });

  it('guarantees listener idempotency for duplicate project.confirmed events', async () => {
    registerInvoiceListeners();

    const project = await prisma.project.findFirst({
      include: { quote: true },
    });

    if (project) {
      const initialCount = await prisma.invoice.count({
        where: { projectId: project.id, type: 'PROFORMA' },
      });

      // Emit project.confirmed multiple times
      emitEvent('project.confirmed', { projectId: project.id });
      emitEvent('project.confirmed', { projectId: project.id });

      await new Promise((r) => setTimeout(r, 100));

      const afterCount = await prisma.invoice.count({
        where: { projectId: project.id, type: 'PROFORMA' },
      });

      // Count must not increase duplicate proforma invoices
      assert.ok(afterCount <= 1 || afterCount === initialCount);
    }
  });
});
