import PDFDocument from 'pdfkit';
import { round2 } from './money.js';

/**
 * Branded pdfkit helper for quotes, invoices, packing slips and report exports.
 *
 * Why: four modules generate PDFs. Without one shared shell, three developers produce three
 *      different letterheads and the company details drift from Settings.
 * Design: borders over shadows, tabular numbers, the DESIGN.md palette, no decoration.
 */

/** DESIGN.md tokens, the one place outside the client where hex is allowed. */
const COLOR = Object.freeze({
  ink: '#0F1B2D',
  muted: '#6B7280',
  line: '#E7E2D8',
  sun: '#F59E0B',
  paper: '#FAF8F3',
});

const PAGE = Object.freeze({ margin: 48, width: 595.28, height: 841.89 });

/** INR with en-IN grouping, matching the client formatter: 1,50,000.00 */
export function formatInr(value, { withSymbol = true } = {}) {
  const amount = round2(value).toFixed(2);
  const [whole, paise] = amount.split('.');
  const negative = whole.startsWith('-');
  const digits = negative ? whole.slice(1) : whole;

  // Indian grouping: last three digits, then pairs.
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3);
  const grouped = rest ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${last3}` : last3;

  const out = `${negative ? '-' : ''}${grouped}.${paise}`;
  return withSymbol ? `Rs ${out}` : out;
}

/** "31 Oct 2026" — the one date format in the product (DESIGN.md section 11). */
export function formatPdfDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

/**
 * Creates a document with the company letterhead and a footer, ready for body content.
 *
 * Why: every PDF in the system carries the same header, read from Settings rather than
 *      hard-coded, so changing the GSTIN in one place changes every document (BR-14).
 * Flow: new PDFDocument, pipe to the response, draw the letterhead, draw the title block.
 * Example:
 *   const doc = startDocument(res, {
 *     company, title: "Quotation", reference: "QT-2026-0011", filename: "QT-2026-0011.pdf",
 *   });
 *   drawTable(doc, { columns, rows });
 *   finishDocument(doc, { company });
 * Throws: nothing.
 */
export function startDocument(res, { company = {}, title, reference, filename, subtitle }) {
  const doc = new PDFDocument({ size: 'A4', margin: PAGE.margin, info: { Title: title } });

  if (res) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename ?? 'document.pdf'}"`);
    doc.pipe(res);
  }

  const left = PAGE.margin;
  const right = PAGE.width - PAGE.margin;

  // Letterhead: company on the left, document identity on the right.
  doc.fillColor(COLOR.ink).fontSize(17).font('Helvetica-Bold');
  doc.text(company.name ?? 'SunPower Solutions', left, PAGE.margin);

  doc.fontSize(8.5).font('Helvetica').fillColor(COLOR.muted);
  let y = doc.y + 2;
  for (const line of [company.address, company.phone, company.email, company.gstin ? `GSTIN ${company.gstin}` : null].filter(Boolean)) {
    doc.text(line, left, y, { width: 260 });
    y = doc.y;
  }

  doc.fontSize(15).font('Helvetica-Bold').fillColor(COLOR.ink);
  doc.text(title ?? '', right - 200, PAGE.margin, { width: 200, align: 'right' });

  if (reference) {
    doc.fontSize(9.5).font('Helvetica').fillColor(COLOR.muted);
    doc.text(reference, right - 200, doc.y + 2, { width: 200, align: 'right' });
  }
  if (subtitle) {
    doc.fontSize(8.5).fillColor(COLOR.muted);
    doc.text(subtitle, right - 200, doc.y + 1, { width: 200, align: 'right' });
  }

  // A single sun rule under the letterhead. No gradients, no logos we do not have.
  const ruleY = Math.max(y, doc.y) + 10;
  doc.moveTo(left, ruleY).lineTo(right, ruleY).lineWidth(2).strokeColor(COLOR.sun).stroke();
  doc.y = ruleY + 16;
  doc.x = left;

  return doc;
}

/**
 * Draws a labelled key/value block — the customer panel on a quote, the vehicle panel
 * on a packing slip.
 *
 * Example:
 *   drawPanel(doc, "Billed to", [["Name", "Vipul Mehta"], ["Phone", "+91 98480 12345"]])
 */
export function drawPanel(doc, heading, rows, { x, width = 240 } = {}) {
  const startX = x ?? PAGE.margin;
  const startY = doc.y;

  doc.fontSize(8).font('Helvetica-Bold').fillColor(COLOR.muted);
  doc.text(heading.toUpperCase(), startX, startY, { width, characterSpacing: 0.6 });

  doc.fontSize(9.5).font('Helvetica').fillColor(COLOR.ink);
  let y = doc.y + 3;
  for (const [label, value] of rows.filter(([, v]) => v !== null && v !== undefined && v !== '')) {
    doc.fillColor(COLOR.muted).text(`${label}`, startX, y, { width: 70, continued: false });
    doc.fillColor(COLOR.ink).text(String(value), startX + 74, y, { width: width - 74 });
    y = doc.y + 2;
  }
  doc.y = y;
  doc.x = PAGE.margin;
  return doc;
}

/**
 * Draws a table with a header row, borders and right-aligned numeric columns.
 *
 * Why: line items appear on quotes, invoices and packing slips; one implementation keeps the
 *      column rhythm and the money alignment identical across all three.
 * Flow: header band, then one row per entry with a bottom rule, breaking the page as needed.
 * Example:
 *   drawTable(doc, {
 *     columns: [
 *       { key: "description", label: "Item", width: 220 },
 *       { key: "quantity", label: "Qty", width: 50, align: "right" },
 *       { key: "lineTotal", label: "Amount", width: 90, align: "right", money: true },
 *     ],
 *     rows: quote.items,
 *   })
 * Throws: nothing.
 */
export function drawTable(doc, { columns, rows, emptyText = 'No items.' }) {
  const left = PAGE.margin;
  const right = PAGE.width - PAGE.margin;
  const rowHeight = 20;

  const drawHeader = () => {
    const y = doc.y;
    doc.rect(left, y, right - left, rowHeight).fillColor(COLOR.paper).fill();
    doc.fontSize(8).font('Helvetica-Bold').fillColor(COLOR.muted);

    let x = left + 6;
    for (const col of columns) {
      doc.text(col.label.toUpperCase(), x, y + 6.5, {
        width: col.width - 12,
        align: col.align ?? 'left',
        characterSpacing: 0.5,
      });
      x += col.width;
    }
    doc
      .moveTo(left, y + rowHeight)
      .lineTo(right, y + rowHeight)
      .lineWidth(0.8)
      .strokeColor(COLOR.line)
      .stroke();
    doc.y = y + rowHeight;
  };

  drawHeader();

  if (!rows || rows.length === 0) {
    doc.fontSize(9).font('Helvetica-Oblique').fillColor(COLOR.muted);
    doc.text(emptyText, left + 6, doc.y + 7);
    doc.y += 24;
    return doc;
  }

  doc.fontSize(9).font('Helvetica').fillColor(COLOR.ink);

  for (const row of rows) {
    // Leave room for the totals block and the footer before breaking.
    if (doc.y + rowHeight > PAGE.height - 120) {
      doc.addPage();
      doc.y = PAGE.margin;
      drawHeader();
      doc.fontSize(9).font('Helvetica').fillColor(COLOR.ink);
    }

    const y = doc.y;
    let x = left + 6;

    for (const col of columns) {
      const raw = typeof col.value === 'function' ? col.value(row) : row[col.key];
      const text = col.money ? formatInr(raw, { withSymbol: false }) : raw ?? '—';
      doc.fillColor(col.color ?? COLOR.ink).text(String(text), x, y + 6, {
        width: col.width - 12,
        align: col.align ?? 'left',
        ellipsis: true,
        height: rowHeight - 4,
      });
      x += col.width;
    }

    doc
      .moveTo(left, y + rowHeight)
      .lineTo(right, y + rowHeight)
      .lineWidth(0.5)
      .strokeColor(COLOR.line)
      .stroke();
    doc.y = y + rowHeight;
  }

  doc.x = left;
  return doc;
}

/**
 * Draws the totals block, right-aligned, with the grand total emphasised.
 *
 * Example:
 *   drawTotals(doc, [["Subtotal", q.subtotal], ["Discount", q.discount], ["GST", q.taxTotal]],
 *              ["Total", q.total])
 */
export function drawTotals(doc, rows, grandTotal) {
  const right = PAGE.width - PAGE.margin;
  const boxWidth = 220;
  const x = right - boxWidth;
  let y = doc.y + 12;

  doc.fontSize(9.5).font('Helvetica');
  for (const [label, value] of rows.filter(Boolean)) {
    doc.fillColor(COLOR.muted).text(label, x, y, { width: 110 });
    doc.fillColor(COLOR.ink).text(formatInr(value), x + 110, y, { width: 110, align: 'right' });
    y = doc.y + 3;
  }

  if (grandTotal) {
    const [label, value] = grandTotal;
    doc.moveTo(x, y + 4).lineTo(right, y + 4).lineWidth(0.8).strokeColor(COLOR.line).stroke();
    y += 10;
    doc.fontSize(11).font('Helvetica-Bold').fillColor(COLOR.ink);
    doc.text(label, x, y, { width: 110 });
    doc.text(formatInr(value), x + 110, y, { width: 110, align: 'right' });
    y = doc.y;
  }

  doc.y = y + 8;
  doc.x = PAGE.margin;
  return doc;
}

/** A signature box — the packing slip and the installation report both end with one. */
export function drawSignatureBox(doc, label, { x, width = 200 } = {}) {
  const startX = x ?? PAGE.margin;
  const y = doc.y + 24;
  doc.moveTo(startX, y).lineTo(startX + width, y).lineWidth(0.8).strokeColor(COLOR.line).stroke();
  doc.fontSize(8).font('Helvetica').fillColor(COLOR.muted).text(label, startX, y + 4, { width });
  doc.y = y + 20;
  doc.x = PAGE.margin;
  return doc;
}

/**
 * Writes the footer on every page and ends the stream.
 *
 * Why: pdfkit writes pages as it goes, so the footer has to be applied by switching to each
 *      buffered page at the end rather than during the body pass.
 * Example:
 *   finishDocument(doc, { company, note: "This is a computer-generated document." })
 */
export function finishDocument(doc, { company = {}, note } = {}) {
  const range = doc.bufferedPageRange();
  const left = PAGE.margin;
  const right = PAGE.width - PAGE.margin;

  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    const y = PAGE.height - 60;

    doc.moveTo(left, y).lineTo(right, y).lineWidth(0.5).strokeColor(COLOR.line).stroke();
    doc.fontSize(7.5).font('Helvetica').fillColor(COLOR.muted);
    doc.text(note ?? `${company.name ?? 'SunPower Solutions'} — ${company.phone ?? ''}`, left, y + 7, {
      width: right - left - 80,
    });
    doc.text(`Page ${i - range.start + 1} of ${range.count}`, right - 80, y + 7, {
      width: 80,
      align: 'right',
    });
  }

  doc.end();
  return doc;
}

export const PDF_COLOR = COLOR;
