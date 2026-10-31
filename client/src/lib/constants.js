/**
 * Every enum in the system, with a human label and a badge colour.
 *
 * This file mirrors server/prisma/schema.prisma and the StatusBadge table in
 * docs/DESIGN.md section 5. A screen never hard-codes a status string or a colour —
 * it reads from here, so one rename lands everywhere.
 *
 * Badge classes are Tailwind token pairs, never raw hex.
 */

/** The eight locked roles. Never add, remove, rename or merge one. */
export const ROLES = {
  SUPER_ADMIN: { label: 'Super admin', short: 'Admin' },
  DIRECTOR: { label: 'Director', short: 'Director' },
  SALES_EXECUTIVE: { label: 'Sales executive', short: 'Sales' },
  SURVEY_TECHNICIAN: { label: 'Survey technician', short: 'Survey' },
  CUSTOMER: { label: 'Customer', short: 'Customer' },
  WAREHOUSE_MANAGER: { label: 'Warehouse manager', short: 'Warehouse' },
  INSTALLATION_TECHNICIAN: { label: 'Installation technician', short: 'Installation' },
  SUPPORT_EXECUTIVE: { label: 'Support executive', short: 'Support' },
};

export const ROLE_VALUES = Object.keys(ROLES);

/** The badge palettes, named so a reader can see the intent rather than the colour. */
const NEUTRAL = 'bg-ink-tint text-muted';
const INFO = 'bg-sky-soft text-sky';
const PENDING = 'bg-amber-soft text-sun-deep';
const GOOD = 'bg-leaf-soft text-leaf';
const BAD = 'bg-alert-soft text-alert';

export const LEAD_STATUS = {
  NEW: { label: 'New', badge: INFO },
  CONTACTED: { label: 'Contacted', badge: INFO },
  QUALIFIED: { label: 'Qualified', badge: GOOD },
  NOT_QUALIFIED: { label: 'Not qualified', badge: NEUTRAL },
  SURVEY_SCHEDULED: { label: 'Survey scheduled', badge: PENDING },
  SURVEY_DONE: { label: 'Survey done', badge: PENDING },
  SURVEY_APPROVED: { label: 'Survey approved', badge: GOOD },
  SURVEY_REJECTED: { label: 'Survey rejected', badge: BAD },
  QUOTED: { label: 'Quoted', badge: INFO },
  WON: { label: 'Won', badge: GOOD },
  LOST: { label: 'Lost', badge: NEUTRAL },
};

export const SURVEY_STATUS = {
  SCHEDULED: { label: 'Scheduled', badge: INFO },
  IN_PROGRESS: { label: 'In progress', badge: PENDING },
  SUBMITTED: { label: 'Submitted', badge: PENDING },
  APPROVED: { label: 'Approved', badge: GOOD },
  REJECTED: { label: 'Rejected', badge: BAD },
  CANCELLED: { label: 'Cancelled', badge: NEUTRAL },
};

export const QUOTE_STATUS = {
  DRAFT: { label: 'Draft', badge: NEUTRAL },
  SENT: { label: 'Sent', badge: INFO },
  ACCEPTED: { label: 'Accepted', badge: GOOD },
  REJECTED: { label: 'Rejected', badge: BAD },
  EXPIRED: { label: 'Expired', badge: NEUTRAL },
};

export const PROJECT_STATUS = {
  AWAITING_ADVANCE: { label: 'Awaiting advance', badge: PENDING },
  CONFIRMED: { label: 'Confirmed', badge: INFO },
  PACKING: { label: 'Packing', badge: INFO },
  DISPATCHED: { label: 'Dispatched', badge: INFO },
  DELIVERED: { label: 'Delivered', badge: INFO },
  INSTALLATION_SCHEDULED: { label: 'Installation scheduled', badge: PENDING },
  INSTALLING: { label: 'Installing', badge: PENDING },
  INSTALLED: { label: 'Installed', badge: GOOD },
  CLOSED: { label: 'Closed', badge: NEUTRAL },
  CANCELLED: { label: 'Cancelled', badge: BAD },
};

/** The project journey, in order, for the Stepper. */
export const PROJECT_JOURNEY = [
  'AWAITING_ADVANCE',
  'CONFIRMED',
  'PACKING',
  'DISPATCHED',
  'DELIVERED',
  'INSTALLATION_SCHEDULED',
  'INSTALLING',
  'INSTALLED',
  'CLOSED',
];

export const SERIAL_STATUS = {
  IN_STOCK: { label: 'In stock', badge: GOOD },
  RESERVED: { label: 'Reserved', badge: PENDING },
  DISPATCHED: { label: 'Dispatched', badge: INFO },
  DELIVERED: { label: 'Delivered', badge: GOOD },
  UNDER_REPAIR: { label: 'Under repair', badge: PENDING },
  REPLACED: { label: 'Replaced', badge: NEUTRAL },
  RETURNED: { label: 'Returned', badge: NEUTRAL },
  SCRAPPED: { label: 'Scrapped', badge: BAD },
};

export const DISPATCH_STATUS = {
  PENDING: { label: 'Pending', badge: NEUTRAL },
  PACKING: { label: 'Packing', badge: PENDING },
  READY: { label: 'Ready', badge: INFO },
  DISPATCHED: { label: 'Dispatched', badge: INFO },
  DELIVERED: { label: 'Delivered', badge: GOOD },
};

export const INSTALLATION_STATUS = {
  UNSCHEDULED: { label: 'Unscheduled', badge: NEUTRAL },
  SCHEDULED: { label: 'Scheduled', badge: INFO },
  IN_PROGRESS: { label: 'In progress', badge: PENDING },
  COMPLETED: { label: 'Completed', badge: GOOD },
};

export const TICKET_STATUS = {
  OPEN: { label: 'Open', badge: BAD },
  ASSIGNED: { label: 'Assigned', badge: INFO },
  IN_PROGRESS: { label: 'In progress', badge: PENDING },
  AWAITING_PARTS: { label: 'Awaiting parts', badge: PENDING },
  RESOLVED: { label: 'Resolved', badge: GOOD },
  CLOSED: { label: 'Closed', badge: NEUTRAL },
  REOPENED: { label: 'Reopened', badge: BAD },
};

export const INVOICE_STATUS = {
  DRAFT: { label: 'Draft', badge: NEUTRAL },
  ISSUED: { label: 'Issued', badge: INFO },
  PARTIALLY_PAID: { label: 'Partially paid', badge: PENDING },
  PAID: { label: 'Paid', badge: GOOD },
  CANCELLED: { label: 'Cancelled', badge: NEUTRAL },
};

export const SUBSIDY_STATUS = {
  NOT_STARTED: { label: 'Not started', badge: NEUTRAL },
  DOCUMENTS_PENDING: { label: 'Documents pending', badge: PENDING },
  APPLIED: { label: 'Applied', badge: INFO },
  INSPECTION_DONE: { label: 'Inspection done', badge: INFO },
  APPROVED: { label: 'Approved', badge: GOOD },
  DISBURSED: { label: 'Disbursed', badge: GOOD },
  REJECTED: { label: 'Rejected', badge: BAD },
};

export const PAYOUT_STATUS = {
  DRAFT: { label: 'Draft', badge: NEUTRAL },
  APPROVED: { label: 'Approved', badge: INFO },
  PAID: { label: 'Paid', badge: GOOD },
};

/** Derived in the service from endDate and voidReason — never a stored column (D-11). */
export const WARRANTY_STATUS = {
  ACTIVE: { label: 'Active', badge: GOOD },
  EXPIRED: { label: 'Expired', badge: NEUTRAL },
  VOID: { label: 'Void', badge: BAD },
};

export const TICKET_PRIORITY = {
  LOW: { label: 'Low', badge: NEUTRAL },
  MEDIUM: { label: 'Medium', badge: INFO },
  HIGH: { label: 'High', badge: PENDING },
  CRITICAL: { label: 'Critical', badge: BAD },
};

// --- Enums without their own badge colour: label only ---

export const PRODUCT_CATEGORY = {
  PANEL: { label: 'Panel' },
  INVERTER: { label: 'Inverter' },
  BATTERY: { label: 'Battery' },
  CHARGE_CONTROLLER: { label: 'Charge controller' },
  MOUNTING_STRUCTURE: { label: 'Mounting structure' },
  DC_BOX: { label: 'DC box' },
  AC_BOX: { label: 'AC box' },
  CABLE: { label: 'Cable' },
  EARTHING: { label: 'Earthing' },
  CONNECTOR: { label: 'Connector' },
  ACCESSORY: { label: 'Accessory' },
  SERVICE: { label: 'Service' },
};

/** The four categories that are tracked by serial number (BR-07). */
export const SERIALIZED_CATEGORIES = ['PANEL', 'INVERTER', 'BATTERY', 'CHARGE_CONTROLLER'];

export const PRODUCT_UNIT = {
  PCS: { label: 'Pieces', short: 'pcs' },
  METER: { label: 'Metres', short: 'm' },
  SET: { label: 'Set', short: 'set' },
  HOUR: { label: 'Hours', short: 'h' },
};

export const SYSTEM_TYPE = {
  ON_GRID: { label: 'On-Grid' },
  OFF_GRID: { label: 'Off-Grid' },
};

export const REQUESTED_SYSTEM_TYPE = {
  ON_GRID: { label: 'On-Grid' },
  OFF_GRID: { label: 'Off-Grid' },
  NOT_SURE: { label: 'Not sure yet' },
};

export const CUSTOMER_TYPE = {
  RESIDENTIAL: { label: 'Residential' },
  COMMERCIAL: { label: 'Commercial' },
};

export const LEAD_SOURCE = {
  WEB_FORM: { label: 'Web form' },
  WHATSAPP: { label: 'WhatsApp' },
  PHONE_CALL: { label: 'Phone call' },
  WALK_IN: { label: 'Walk-in' },
  REFERRAL: { label: 'Referral' },
};

export const LEAD_ACTIVITY_TYPE = {
  CALL: { label: 'Call' },
  NOTE: { label: 'Note' },
  STATUS_CHANGE: { label: 'Status change' },
  WHATSAPP: { label: 'WhatsApp' },
  VISIT: { label: 'Visit' },
};

export const ROOF_TYPE = {
  RCC: { label: 'RCC' },
  METAL_SHEET: { label: 'Metal sheet' },
  TILED: { label: 'Tiled' },
  OTHER: { label: 'Other' },
};

export const ROOF_DIRECTION = {
  N: { label: 'North' },
  NE: { label: 'North-east' },
  E: { label: 'East' },
  SE: { label: 'South-east' },
  S: { label: 'South' },
  SW: { label: 'South-west' },
  W: { label: 'West' },
  NW: { label: 'North-west' },
};

export const PAYMENT_TYPE = {
  ADVANCE: { label: 'Advance' },
  PARTIAL: { label: 'Partial' },
  FINAL: { label: 'Final' },
  SERVICE: { label: 'Service' },
};

export const PAYMENT_MODE = {
  UPI: { label: 'UPI' },
  BANK_TRANSFER: { label: 'Bank transfer' },
  CASH: { label: 'Cash' },
  CHEQUE: { label: 'Cheque' },
  CARD: { label: 'Card' },
};

export const INVOICE_TYPE = {
  PROFORMA: { label: 'Proforma' },
  TAX: { label: 'Tax invoice' },
  SERVICE: { label: 'Service invoice' },
};

export const TICKET_SOURCE = {
  PHONE: { label: 'Phone' },
  PORTAL: { label: 'Portal' },
  WHATSAPP: { label: 'WhatsApp' },
  EMAIL: { label: 'Email' },
};

export const TICKET_CATEGORY = {
  NO_POWER: { label: 'No power' },
  LOW_GENERATION: { label: 'Low generation' },
  INVERTER_FAULT: { label: 'Inverter fault' },
  BATTERY_ISSUE: { label: 'Battery issue' },
  PHYSICAL_DAMAGE: { label: 'Physical damage' },
  OTHER: { label: 'Other' },
};

export const TICKET_ACTIVITY_TYPE = {
  CALL: { label: 'Call' },
  NOTE: { label: 'Note' },
  STATUS_CHANGE: { label: 'Status change' },
  VISIT: { label: 'Visit' },
};

export const EXPENSE_CATEGORY = {
  TRANSPORT: { label: 'Transport' },
  LABOUR_EXTRA: { label: 'Extra labour' },
  CIVIL_WORK: { label: 'Civil work' },
  MISC: { label: 'Miscellaneous' },
};

export const ATTACHMENT_KIND = {
  PHOTO: { label: 'Photo' },
  DOCUMENT: { label: 'Document' },
  SIGNATURE: { label: 'Signature' },
};

/** Every enum map, so a generic component can resolve one by name. */
export const ENUMS = {
  Role: ROLES,
  LeadStatus: LEAD_STATUS,
  SurveyStatus: SURVEY_STATUS,
  QuoteStatus: QUOTE_STATUS,
  ProjectStatus: PROJECT_STATUS,
  SerialStatus: SERIAL_STATUS,
  DispatchStatus: DISPATCH_STATUS,
  InstallationStatus: INSTALLATION_STATUS,
  TicketStatus: TICKET_STATUS,
  InvoiceStatus: INVOICE_STATUS,
  SubsidyStatus: SUBSIDY_STATUS,
  PayoutStatus: PAYOUT_STATUS,
  WarrantyStatus: WARRANTY_STATUS,
  TicketPriority: TICKET_PRIORITY,
  ProductCategory: PRODUCT_CATEGORY,
  ProductUnit: PRODUCT_UNIT,
  SystemType: SYSTEM_TYPE,
  RequestedSystemType: REQUESTED_SYSTEM_TYPE,
  CustomerType: CUSTOMER_TYPE,
  LeadSource: LEAD_SOURCE,
  LeadActivityType: LEAD_ACTIVITY_TYPE,
  RoofType: ROOF_TYPE,
  RoofDirection: ROOF_DIRECTION,
  PaymentType: PAYMENT_TYPE,
  PaymentMode: PAYMENT_MODE,
  InvoiceType: INVOICE_TYPE,
  TicketSource: TICKET_SOURCE,
  TicketCategory: TICKET_CATEGORY,
  TicketActivityType: TICKET_ACTIVITY_TYPE,
  ExpenseCategory: EXPENSE_CATEGORY,
  AttachmentKind: ATTACHMENT_KIND,
};

/**
 * The label for an enum value, falling back to the raw value rather than blank.
 *
 * Example:
 *   enumLabel('ProjectStatus', 'AWAITING_ADVANCE') // → "Awaiting advance"
 */
export function enumLabel(enumName, value) {
  if (!value) return '—';
  return ENUMS[enumName]?.[value]?.label ?? value;
}

/**
 * The badge classes for an enum value. Falls back to neutral, so an unmapped value is
 * visible but never breaks the layout.
 */
export function enumBadge(enumName, value) {
  return ENUMS[enumName]?.[value]?.badge ?? NEUTRAL;
}

/**
 * Turns an enum map into Select options.
 *
 * Example:
 *   enumOptions(PAYMENT_MODE) // → [{ value: 'UPI', label: 'UPI' }, ...]
 */
export function enumOptions(map) {
  return Object.entries(map).map(([value, config]) => ({ value, label: config.label }));
}
