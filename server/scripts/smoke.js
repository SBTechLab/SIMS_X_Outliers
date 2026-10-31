#!/usr/bin/env node
/**
 * API smoke script — SunPower SIMS
 *
 * Verifies backend health, auth for all 8 roles, RBAC negative checks,
 * settings, kit templates, and core API connectivity.
 *
 * Usage:
 *   node server/scripts/smoke.js
 *   API_URL=http://localhost:5000/api/v1 node server/scripts/smoke.js
 */

const BASE_URL = process.env.API_URL || 'http://localhost:5000/api/v1';
const PASSWORD = 'Demo@1234';

const ROLES_TO_TEST = [
  { role: 'SUPER_ADMIN', email: 'admin@sunpower.in' },
  { role: 'DIRECTOR', email: 'director@sunpower.in' },
  { role: 'SALES_EXECUTIVE', email: 'sales1@sunpower.in' },
  { role: 'SURVEY_TECHNICIAN', email: 'survey1@sunpower.in' },
  { role: 'WAREHOUSE_MANAGER', email: 'warehouse@sunpower.in' },
  { role: 'INSTALLATION_TECHNICIAN', email: 'install1@sunpower.in' },
  { role: 'SUPPORT_EXECUTIVE', email: 'support@sunpower.in' },
  { role: 'CUSTOMER', email: '9848012345' }, // Phone login for customer
];

let passed = 0;
let failed = 0;

function logStep(name, ok, details = '') {
  if (ok) {
    passed++;
    console.log(`  \x1b[32m✔\x1b[0m ${name}`);
  } else {
    failed++;
    console.error(`  \x1b[31m✖\x1b[0m ${name} — ${details}`);
  }
}

async function run() {
  console.log(`\n\x1b[1mSunPower SIMS API Smoke Test\x1b[0m`);
  console.log(`Target: ${BASE_URL}\n`);

  // 1. Health check
  try {
    const res = await fetch(`${BASE_URL}/health`);
    const json = await res.json();
    const okStatus = res.ok && json?.data?.status === 'ok' && json?.data?.db === 'up';
    logStep('GET /health (status ok & db up)', okStatus);
  } catch (err) {
    logStep('GET /health', false, `Connection error: ${err.message}`);
    console.error('\nMake sure the server is running on port 5000 before running smoke tests.');
    process.exit(1);
  }

  // Cookie jar for tokens
  const cookies = {};

  // 2. Auth for all 8 roles
  for (const { role, email } of ROLES_TO_TEST) {
    try {
      const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: email, password: PASSWORD }),
      });

      const setCookies = loginRes.headers.getSetCookie
        ? loginRes.headers.getSetCookie()
        : [loginRes.headers.get('set-cookie') || ''];

      let tokenCookie = '';
      for (const sc of setCookies) {
        const match = sc.match(/sp_token=([^;]+)/);
        if (match) {
          tokenCookie = `sp_token=${match[1]}`;
          break;
        }
      }

      cookies[role] = tokenCookie;

      const body = await loginRes.json();
      const loginOk = loginRes.ok && body?.data?.user?.role === role;

      if (loginOk && tokenCookie) {
        // Verify /auth/me
        const meRes = await fetch(`${BASE_URL}/auth/me`, {
          headers: { Cookie: tokenCookie },
        });
        const meData = await meRes.json();
        const user = meData?.data?.user || meData?.data;
        const meOk = meRes.ok && user?.role === role;
        logStep(`Auth [${role}] login + /auth/me`, meOk, meOk ? '' : `meStatus: ${meRes.status}, data: ${JSON.stringify(meData)}`);
      } else {
        logStep(`Auth [${role}] login`, false, `Status ${loginRes.status}: ${JSON.stringify(body)}, cookie: ${tokenCookie}`);
      }
    } catch (err) {
      logStep(`Auth [${role}]`, false, err.message);
    }
  }

  // 3. Negative Auth Checks
  try {
    // Bad password -> 401
    const badLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'admin@sunpower.in', password: 'WrongPassword999!' }),
    });
    logStep('Negative: Bad password returns 401', badLogin.status === 401);

    // No cookie -> 401 on protected route
    const unauth = await fetch(`${BASE_URL}/users`);
    logStep('Negative: No cookie returns 401 on /users', unauth.status === 401);

    // Customer accessing /users -> 403
    if (cookies.CUSTOMER) {
      const forbidden = await fetch(`${BASE_URL}/users`, {
        headers: { Cookie: cookies.CUSTOMER },
      });
      logStep('Negative: CUSTOMER on /users returns 403 FORBIDDEN', forbidden.status === 403);
    }
  } catch (err) {
    logStep('Negative auth checks', false, err.message);
  }

  // 4. Core Endpoints Check
  if (cookies.SUPER_ADMIN) {
    try {
      const settingsRes = await fetch(`${BASE_URL}/settings`, {
        headers: { Cookie: cookies.SUPER_ADMIN },
      });
      const settingsData = await settingsRes.json();
      logStep('GET /settings (SUPER_ADMIN)', settingsRes.ok && settingsData?.data?.advancePercent !== undefined);

      const kitsRes = await fetch(`${BASE_URL}/kit-templates`, {
        headers: { Cookie: cookies.SUPER_ADMIN },
      });
      const kitsData = await kitsRes.json();
      logStep('GET /kit-templates (staff)', kitsRes.ok && Array.isArray(kitsData?.data) && kitsData.data.length > 0);

      const auditRes = await fetch(`${BASE_URL}/audit-logs`, {
        headers: { Cookie: cookies.SUPER_ADMIN },
      });
      const auditData = await auditRes.json();
      logStep('GET /audit-logs (SUPER_ADMIN)', auditRes.ok && Array.isArray(auditData?.data));
    } catch (err) {
      logStep('Core Admin Endpoints', false, err.message);
    }
  }

  // 5. Public Enquiry Check
  try {
    const enquiryRes = await fetch(`${BASE_URL}/public/enquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Smoke Test Lead',
        phone: '9848099999',
        email: 'smoke@test.in',
        address: 'Banjara Hills, Hyderabad',
        city: 'Hyderabad',
        pincode: '500034',
        requestedSystemType: 'ON_GRID',
        requestedCapacityKw: 3,
        source: 'WEB_FORM',
      }),
    });
    const enquiryData = await enquiryRes.json();
    logStep(
      'POST /public/enquiries creates lead with ENQ code',
      enquiryRes.status === 201 && /^ENQ-\d{4}-\d{4}$/.test(enquiryData?.data?.code),
    );
  } catch (err) {
    logStep('POST /public/enquiries', false, err.message);
  }

  console.log(`\nSmoke Test Summary: ${passed} passed, ${failed} failed.\n`);
  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

run();
