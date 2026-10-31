import { Route, Routes } from 'react-router-dom';
import { PublicLayout } from '@/components/layout/PublicLayout.jsx';
import { AuthLayout } from '@/components/layout/AuthLayout.jsx';
import { AppLayout } from '@/components/layout/AppLayout.jsx';
import { FieldLayout } from '@/components/layout/FieldLayout.jsx';
import { ProtectedRoute } from './ProtectedRoute.jsx';
import { RoleRoute } from './RoleRoute.jsx';

// Public
import { LandingPage } from '@/features/public-site/pages/LandingPage.jsx';
import { EnquiryPage } from '@/features/public-site/pages/EnquiryPage.jsx';

// Auth
import { LoginPage } from '@/features/auth/pages/LoginPage.jsx';
import { RegisterPage } from '@/features/auth/pages/RegisterPage.jsx';
import { ChangePasswordPage } from '@/features/auth/pages/ChangePasswordPage.jsx';
import { ForbiddenPage } from '@/features/auth/pages/ForbiddenPage.jsx';
import { NotFoundPage } from '@/features/auth/pages/NotFoundPage.jsx';

// Admin (Member A - Stage A1)
import { AdminDashboardPage } from '@/features/admin/pages/AdminDashboardPage.jsx';
import { UsersPage } from '@/features/admin/pages/UsersPage.jsx';
import { KitTemplatesPage } from '@/features/admin/pages/KitTemplatesPage.jsx';
import { SettingsPage } from '@/features/admin/pages/SettingsPage.jsx';
import { AuditLogPage } from '@/features/admin/pages/AuditLogPage.jsx';

// Placeholders + the one real admin screen
import { PlaceholderPage } from '@/features/admin/pages/PlaceholderPage.jsx';
import { UiGalleryPage } from '@/features/admin/pages/UiGalleryPage.jsx';

// Member B: Sales
import { LeadsPage } from '@/features/sales/pages/LeadsPage.jsx';
import { SurveysPage } from '@/features/sales/pages/SurveysPage.jsx';
import { QuotesPage } from '@/features/sales/pages/QuotesPage.jsx';
import { ProjectsPage } from '@/features/sales/pages/ProjectsPage.jsx';
import { PaymentsPage } from '@/features/sales/pages/PaymentsPage.jsx';
import { CustomersPage } from '@/features/sales/pages/CustomersPage.jsx';

// Member B: Survey technician field
import { MySurveysPage } from '@/features/survey/pages/MySurveysPage.jsx';

// Member B: Customer portal
import { PortalOverviewPage } from '@/features/customer-portal/pages/PortalOverviewPage.jsx';
import { PortalProjectsPage } from '@/features/customer-portal/pages/PortalProjectsPage.jsx';
import { PortalQuotesPage } from '@/features/customer-portal/pages/PortalQuotesPage.jsx';
import { PortalInvoicesPage } from '@/features/customer-portal/pages/PortalInvoicesPage.jsx';

// Member A: Director (Stages A2-A3)
import { DirectorOverviewPage } from '@/features/director/pages/DirectorOverviewPage.jsx';
import { ProfitabilityPage } from '@/features/director/pages/ProfitabilityPage.jsx';
import { ProjectProfitPage } from '@/features/director/pages/ProjectProfitPage.jsx';
import { InvoicesPage } from '@/features/director/pages/InvoicesPage.jsx';
import { SubsidiesPage } from '@/features/director/pages/SubsidiesPage.jsx';
import { ExpensesPage } from '@/features/director/pages/ExpensesPage.jsx';
import { PayoutsPage } from '@/features/director/pages/PayoutsPage.jsx';
import { UnfinishedPage } from '@/features/director/pages/UnfinishedPage.jsx';
import { ServiceReportPage } from '@/features/director/pages/ServiceReportPage.jsx';

// Member A: Notifications (Stage A4)
import { NotificationsPage } from '@/features/notifications/NotificationsPage.jsx';

/**
 * SHARED FILE (docs/AGENTS.md section 5).
 * Add your routes inside your own member's fence; never rename or delete another member's lines.
 */
export function AppRoutes() {
  return (
    <Routes>
      {/* --- Public ------------------------------------------------------ */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/enquire" element={<EnquiryPage />} />
      </Route>

      {/* --- Auth -------------------------------------------------------- */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* --- Signed-in area ---------------------------------------------- */}
      <Route element={<ProtectedRoute />}>
        {/* Change password — any role */}
        <Route element={<AppLayout />}>
          <Route path="/change-password" element={<ChangePasswordPage />} />
        </Route>

        {/* --- Member A: SUPER_ADMIN ------------------------------------- */}
        <Route element={<RoleRoute roles={['SUPER_ADMIN']} />}>
          <Route element={<AppLayout />}>
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/users" element={<UsersPage />} />
            <Route path="/admin/kit-templates" element={<KitTemplatesPage />} />
            <Route path="/admin/settings" element={<SettingsPage />} />
            <Route path="/admin/audit" element={<AuditLogPage />} />
            <Route path="/dev/ui" element={<UiGalleryPage />} />
          </Route>
        </Route>

        {/* --- Member A: DIRECTOR --------------------------------------- */}
        <Route element={<RoleRoute roles={['DIRECTOR', 'SUPER_ADMIN']} />}>
          <Route element={<AppLayout />}>
            <Route path="/director" element={<DirectorOverviewPage />} />
            <Route path="/director/profitability" element={<ProfitabilityPage />} />
            <Route path="/director/profitability/:id" element={<ProjectProfitPage />} />
            <Route path="/director/unfinished" element={<UnfinishedPage />} />
            <Route path="/director/service" element={<ServiceReportPage />} />
            <Route path="/director/invoices" element={<InvoicesPage />} />
            <Route path="/director/subsidies" element={<SubsidiesPage />} />
            <Route path="/director/expenses" element={<ExpensesPage />} />
            <Route path="/director/payouts" element={<PayoutsPage />} />
          </Route>
        </Route>

        {/* --- Notifications — all staff roles -------------------------- */}
        <Route element={<AppLayout />}>
          <Route path="/notifications" element={<NotificationsPage />} />
        </Route>

        {/* --- Member B: SALES_EXECUTIVE -------------------------------- */}
        <Route element={<RoleRoute roles={['SALES_EXECUTIVE']} />}>
          <Route element={<AppLayout />}>
            <Route path="/sales/leads" element={<LeadsPage />} />
            <Route path="/sales/surveys" element={<SurveysPage />} />
            <Route path="/sales/quotes" element={<QuotesPage />} />
            <Route path="/sales/projects" element={<ProjectsPage />} />
            <Route path="/sales/payments" element={<PaymentsPage />} />
            <Route path="/sales/customers" element={<CustomersPage />} />
          </Route>
        </Route>

        {/* --- Member B: SURVEY_TECHNICIAN ------------------------------ */}
        <Route element={<RoleRoute roles={['SURVEY_TECHNICIAN']} />}>
          <Route element={<FieldLayout title="My surveys" />}>
            <Route path="/field/surveys" element={<MySurveysPage />} />
            <Route path="/field/surveys/upcoming" element={<PlaceholderPage title="Upcoming" subtitle="Surveys scheduled for later in the week." module="Upcoming surveys" owner="Member B" />} />
            <Route path="/field/profile" element={<PlaceholderPage title="Profile" module="Profile" owner="Member A" />} />
          </Route>
        </Route>

        {/* --- Member B: CUSTOMER --------------------------------------- */}
        <Route element={<RoleRoute roles={['CUSTOMER']} />}>
          <Route element={<FieldLayout title="SunPower Solutions" />}>
            <Route path="/portal" element={<PortalOverviewPage />} />
            <Route path="/portal/projects" element={<PortalProjectsPage />} />
            <Route path="/portal/quotes" element={<PortalQuotesPage />} />
            <Route path="/portal/invoices" element={<PortalInvoicesPage />} />
            <Route path="/portal/systems" element={<PlaceholderPage title="My systems" subtitle="Every unit on your rooftop, with its warranty end date (BR-09)." module="Systems" owner="Member C" />} />
            <Route path="/portal/tickets" element={<PlaceholderPage title="Service" subtitle="Raise a ticket, track the fix, confirm when it works (BR-12)." module="Tickets" owner="Member C" />} />
            <Route path="/portal/profile" element={<PlaceholderPage title="Profile" module="Profile" owner="Member A" />} />
          </Route>
        </Route>

        {/* --- Member C: WAREHOUSE_MANAGER ------------------------------ */}
        <Route element={<RoleRoute roles={['WAREHOUSE_MANAGER']} />}>
          <Route element={<AppLayout />}>
            <Route path="/warehouse" element={<PlaceholderPage breadcrumb={[{ label: 'Warehouse' }]} title="Warehouse" subtitle="Dispatches to pack, low stock, installation schedule." module="Warehouse dashboard" owner="Member C" />} />
            <Route path="/warehouse/products" element={<PlaceholderPage breadcrumb={[{ label: 'Warehouse' }, { label: 'Products' }]} title="Products" module="Products" owner="Member C" />} />
            <Route path="/warehouse/inventory" element={<PlaceholderPage breadcrumb={[{ label: 'Warehouse' }, { label: 'Inventory' }]} title="Inventory" module="Inventory" owner="Member C" />} />
            <Route path="/warehouse/purchases" element={<PlaceholderPage breadcrumb={[{ label: 'Warehouse' }, { label: 'Purchases' }]} title="Purchases" subtitle="Record purchases and the serial numbers they bring in." module="Purchases" owner="Member C" />} />
            <Route path="/warehouse/serials" element={<PlaceholderPage breadcrumb={[{ label: 'Warehouse' }, { label: 'Serials' }]} title="Serial numbers" subtitle="Full history for every unit — purchase, dispatch, delivery, tickets (BR-08)." module="Serials" owner="Member C" />} />
            <Route path="/warehouse/dispatches" element={<PlaceholderPage breadcrumb={[{ label: 'Warehouse' }, { label: 'Dispatches' }]} title="Dispatches" subtitle="Scan every serialized unit before dispatch (BR-07)." module="Dispatches" owner="Member C" />} />
            <Route path="/warehouse/installations" element={<PlaceholderPage breadcrumb={[{ label: 'Warehouse' }, { label: 'Install schedule' }]} title="Installation schedule" subtitle="Pick a date and a crew for every delivered project." module="Install scheduling" owner="Member C" />} />
          </Route>
        </Route>

        {/* --- Member C: INSTALLATION_TECHNICIAN ------------------------ */}
        <Route element={<RoleRoute roles={['INSTALLATION_TECHNICIAN']} />}>
          <Route element={<FieldLayout title="My jobs" />}>
            <Route path="/field/jobs" element={<PlaceholderPage title="My jobs" subtitle="Today's assigned installations and service visits." module="Installation (field)" owner="Member C" />} />
            <Route path="/field/tickets" element={<PlaceholderPage title="My tickets" subtitle="Assigned service tickets." module="Field tickets" owner="Member C" />} />
          </Route>
        </Route>

        {/* --- Member C: SUPPORT_EXECUTIVE ------------------------------ */}
        <Route element={<RoleRoute roles={['SUPPORT_EXECUTIVE']} />}>
          <Route element={<AppLayout />}>
            <Route path="/support" element={<PlaceholderPage breadcrumb={[{ label: 'Support' }]} title="Support" subtitle="Find a customer, raise a ticket, decide chargeable vs. free (BR-11)." module="Support dashboard" owner="Member C" />} />
            <Route path="/support/lookup" element={<PlaceholderPage breadcrumb={[{ label: 'Support' }, { label: 'Lookup' }]} title="Lookup" subtitle="Phone, name, serial or project code — one query, one answer (US-E1)." module="Lookup" owner="Member C" />} />
            <Route path="/support/tickets" element={<PlaceholderPage breadcrumb={[{ label: 'Support' }, { label: 'Tickets' }]} title="Tickets" module="Tickets" owner="Member C" />} />
            <Route path="/support/warranties" element={<PlaceholderPage breadcrumb={[{ label: 'Support' }, { label: 'Warranties' }]} title="Warranties" subtitle="Active, expired, void — status is derived from the end date (D-11)." module="Warranties" owner="Member C" />} />
            <Route path="/support/customers" element={<PlaceholderPage breadcrumb={[{ label: 'Support' }, { label: 'Customers' }]} title="Customers" module="Customers" owner="Member B" />} />
          </Route>
        </Route>
      </Route>

      {/* --- Error pages ------------------------------------------------ */}
      <Route path="/403" element={<ForbiddenPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
