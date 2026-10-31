import bcrypt from 'bcryptjs';
import { SETTING_DEFAULTS } from '../../src/modules/settings/settings.service.js';

/** Every seeded account uses the same password, documented in docs/DATABASE.md section 8. */
export const DEMO_PASSWORD = 'Demo@1234';

/**
 * Staff accounts. Hyderabad-based company, realistic Indian names.
 * hourlyRate is set only for technicians — it drives labour cost (BR-13) and payouts.
 */
export const STAFF = [
  { key: 'admin', name: 'Rakesh Trivedi', email: 'admin@sunpower.in', role: 'SUPER_ADMIN' },
  { key: 'director', name: 'Nilesh Barot', email: 'director@sunpower.in', role: 'DIRECTOR' },
  { key: 'sales1', name: 'Priya Desai', email: 'sales1@sunpower.in', role: 'SALES_EXECUTIVE' },
  { key: 'sales2', name: 'Imran Qureshi', email: 'sales2@sunpower.in', role: 'SALES_EXECUTIVE' },
  {
    key: 'survey1',
    name: 'Mahesh Solanki',
    email: 'survey1@sunpower.in',
    role: 'SURVEY_TECHNICIAN',
    hourlyRate: '250.00',
  },
  {
    key: 'survey2',
    name: 'Dinesh Chavda',
    email: 'survey2@sunpower.in',
    role: 'SURVEY_TECHNICIAN',
    hourlyRate: '250.00',
  },
  {
    key: 'warehouse',
    name: 'Jignesh Patel',
    email: 'warehouse@sunpower.in',
    role: 'WAREHOUSE_MANAGER',
  },
  {
    key: 'install1',
    name: 'Sanjay Rathod',
    email: 'install1@sunpower.in',
    role: 'INSTALLATION_TECHNICIAN',
    hourlyRate: '350.00',
  },
  {
    key: 'install2',
    name: 'Vikram Zala',
    email: 'install2@sunpower.in',
    role: 'INSTALLATION_TECHNICIAN',
    hourlyRate: '300.00',
  },
  {
    key: 'install3',
    name: 'Arvind Makwana',
    email: 'install3@sunpower.in',
    role: 'INSTALLATION_TECHNICIAN',
    hourlyRate: '300.00',
  },
  {
    key: 'install4',
    name: 'Naveen Kumar',
    email: 'install4@sunpower.in',
    role: 'INSTALLATION_TECHNICIAN',
    hourlyRate: '250.00',
  },
  { key: 'support', name: 'Hetal Shah', email: 'support@sunpower.in', role: 'SUPPORT_EXECUTIVE' },
];

/**
 * Customers with logins. They sign in by phone; an email is seeded so either works.
 * `demo` explains which story each one powers — see docs/DATABASE.md section 8.
 */
export const CUSTOMERS = [
  {
    key: 'vipul',
    name: 'Vipul Mehta',
    phone: '9848012345',
    email: 'vipul.mehta@example.in',
    addressLine: '12-4-118, Shanti Nagar, Kukatpally',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500072',
    customerType: 'RESIDENTIAL',
    demo: '3 kW On-Grid delivered 18 months ago — inverter warranty ACTIVE (Scene E)',
  },
  {
    key: 'fatima',
    name: 'Fatima Shaikh',
    phone: '9700045678',
    email: 'fatima.shaikh@example.in',
    addressLine: '8-2-293/82, Road No. 7, Tolichowki',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500008',
    customerType: 'RESIDENTIAL',
    demo: '5 kW Off-Grid, dispatched but not delivered',
  },
  {
    key: 'harpreet',
    name: 'Harpreet Kaur',
    phone: '9959087766',
    email: 'harpreet.kaur@example.in',
    addressLine: '5-9-22, Patny Centre, Secunderabad',
    city: 'Secunderabad',
    state: 'Telangana',
    pincode: '500003',
    customerType: 'RESIDENTIAL',
    demo: '2 kW On-Grid, awaiting advance',
  },
  {
    key: 'srinivas',
    name: 'Srinivas Reddy',
    phone: '9391023344',
    email: 'srinivas.reddy@example.in',
    addressLine: 'Plot 221, Gachibowli Industrial Area',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500032',
    customerType: 'COMMERCIAL',
    demo: '4 kW On-Grid delivered 27 months ago — inverter warranty EXPIRED (BR-11 chargeable)',
  },
  {
    key: 'anitha',
    name: 'Anitha Rao',
    phone: '9866155890',
    email: 'anitha.rao@example.in',
    addressLine: '3-6-14, Hitech City Road, Miyapur',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500049',
    customerType: 'RESIDENTIAL',
    demo: 'The loss-making project — heavy discount plus extra civil work (Scene F)',
  },
];

/** Customers without a login, so support lookup has unclaimed records to find. */
export const WALK_IN_CUSTOMERS = [
  {
    key: 'ramesh',
    name: 'Ramesh Yadav',
    phone: '9701234567',
    addressLine: '14-7-9, Balanagar',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500037',
    customerType: 'RESIDENTIAL',
  },
  {
    key: 'lakshmi',
    name: 'Lakshmi Prasanna',
    phone: '9440098123',
    addressLine: '2-2-18, Uppal',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500039',
    customerType: 'RESIDENTIAL',
  },
];

/**
 * Creates every user, the customer records behind them, and the settings rows.
 *
 * Why: everything else in the seed needs user ids (createdById, technicianId, assignedToId),
 *      so this stage runs first.
 * Flow: hash the shared password once -> createMany staff -> create each customer with its
 *       login -> create the two unclaimed customers -> upsert the eight settings keys.
 * Example:
 *   const { staff, customers } = await seedUsersAndSettings(prisma)
 *   // → staff.sales1.id, customers.vipul.id
 * Throws: nothing of its own.
 */
export async function seedUsersAndSettings(prisma) {
  // One hash for every account: bcrypt at 10 rounds is ~80ms, and 17 accounts would be a
  // noticeable pause in a reseed that people run repeatedly.
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const staff = {};
  for (const person of STAFF) {
    staff[person.key] = await prisma.user.create({
      data: {
        name: person.name,
        email: person.email,
        passwordHash,
        role: person.role,
        hourlyRate: person.hourlyRate ?? null,
        lastLoginAt: null,
      },
    });
  }

  const customers = {};
  for (const c of CUSTOMERS) {
    const user = await prisma.user.create({
      data: {
        name: c.name,
        email: c.email,
        phone: c.phone,
        passwordHash,
        role: 'CUSTOMER',
      },
    });

    customers[c.key] = await prisma.customer.create({
      data: {
        userId: user.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        addressLine: c.addressLine,
        city: c.city,
        state: c.state,
        pincode: c.pincode,
        customerType: c.customerType,
        notes: c.demo,
      },
    });
  }

  for (const c of WALK_IN_CUSTOMERS) {
    customers[c.key] = await prisma.customer.create({
      data: {
        name: c.name,
        phone: c.phone,
        addressLine: c.addressLine,
        city: c.city,
        state: c.state,
        pincode: c.pincode,
        customerType: c.customerType,
      },
    });
  }

  for (const [key, value] of Object.entries(SETTING_DEFAULTS)) {
    await prisma.setting.create({ data: { key, value } });
  }

  return { staff, customers, passwordHash };
}
