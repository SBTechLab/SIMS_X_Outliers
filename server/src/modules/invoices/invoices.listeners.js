import { onEvent } from '../../core/events.js';
import { logger } from '../../core/logger.js';
import {
  createProformaInvoice,
  createTaxInvoice,
  createServiceInvoice,
  syncInvoiceAfterPayment,
  ensureSubsidyApplication,
} from './invoices.service.js';

/**
 * Invoice and subsidy listeners — Member A.
 *
 * Why: finance is decoupled from the modules that trigger it (D-02). A confirmed project
 *      should not import the invoice service; it just fires the event and the invoice
 *      appears automatically.
 */
export default function registerListeners() {
  // project.confirmed → PROFORMA invoice + SubsidyApplication (if eligible)
  onEvent('project.confirmed', async ({ projectId }) => {
    logger.info({ projectId }, 'invoice listener: project.confirmed');
    await createProformaInvoice(projectId);
    await ensureSubsidyApplication(projectId);
  });

  // payment.recorded → sync the linked invoice amountPaid + status
  onEvent('payment.recorded', async ({ paymentId, projectId }) => {
    logger.info({ paymentId, projectId }, 'invoice listener: payment.recorded');
    await syncInvoiceAfterPayment(paymentId, projectId);
  });

  // installation.completed → TAX invoice replaces the PROFORMA
  onEvent('installation.completed', async ({ projectId }) => {
    logger.info({ projectId }, 'invoice listener: installation.completed');
    await createTaxInvoice(projectId);
  });

  // ticket.billable → SERVICE invoice for chargeable tickets
  onEvent('ticket.billable', async ({ ticketId, lines }) => {
    logger.info({ ticketId }, 'invoice listener: ticket.billable');
    await createServiceInvoice(ticketId, lines);
  });
}
