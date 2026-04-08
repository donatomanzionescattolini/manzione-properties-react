import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { FileText, Plus, Printer, Trash2 } from 'lucide-react';
import { useDataStore } from '../../store/dataStore';
import { PageHeader } from '../../components/layout/PageHeader';
import { Modal } from '../../components/ui/Modal';
import { toast } from '../../components/ui/toastStore';

const expenseCategories = [
  'repairs',
  'utilities',
  'property-tax',
  'hoa',
  'legal',
  'management',
  'commission',
  'insurance',
  'other',
] as const;

const markupCategories = [
  'repairs',
  'cleaning',
  'maintenance',
  'LLC renewal',
  'other',
] as const;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR];

interface MarkupItem {
  id: string;
  description: string;
  category: string;
  costPaid: number;
  chargedToClient: number;
  date: string;
}

function loadMarkups(): MarkupItem[] {
  try {
    const raw = window.localStorage.getItem('manzione-markups');
    if (!raw) return [];
    return JSON.parse(raw) as MarkupItem[];
  } catch {
    return [];
  }
}

function saveMarkups(items: MarkupItem[]) {
  window.localStorage.setItem('manzione-markups', JSON.stringify(items));
}

export function Reports() {
  const { properties, payments, expenses, vendors, maintenanceRequests, tenants, addExpense } = useDataStore();
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [reportType, setReportType] = useState<'monthly' | 'annual' | 'company'>('monthly');
  const [companyPeriod, setCompanyPeriod] = useState<'annual' | 'monthly'>('annual');
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isMarkupModalOpen, setIsMarkupModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    propertyId: '',
    vendorId: '',
    category: 'repairs' as (typeof expenseCategories)[number],
    amount: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    receiptUrl: '',
  });
  const [markupForm, setMarkupForm] = useState({
    description: '',
    category: 'repairs' as string,
    costPaid: '',
    chargedToClient: '',
    date: format(new Date(), 'yyyy-MM-dd'),
  });
  const [markupItems, setMarkupItems] = useState<MarkupItem[]>(loadMarkups);
  const [approvedReports, setApprovedReports] = useState<Record<string, boolean>>(() => {
    const saved = window.localStorage.getItem('report-approvals');
    if (!saved) return {};

    try {
      return JSON.parse(saved);
    } catch {
      window.localStorage.removeItem('report-approvals');
      return {};
    }
  });

  const isMonthlyFilter =
    reportType === 'monthly' || (reportType === 'company' && companyPeriod === 'monthly');

  const reportKey = `${reportType}:${companyPeriod}:${selectedYear}:${selectedMonth}:${selectedPropertyId || 'all'}`;

  const setReportApproved = (approved: boolean) => {
    const next = { ...approvedReports, [reportKey]: approved };
    setApprovedReports(next);
    window.localStorage.setItem('report-approvals', JSON.stringify(next));
    toast.success(approved ? 'Report approved for owner review' : 'Report approval removed');
  };

  const report = useMemo(() => {
    const propList = selectedPropertyId
      ? properties.filter((p) => p.id === selectedPropertyId)
      : properties;

    const filteredPayments = payments.filter((p) => {
      const d = new Date(p.date);
      const yearMatch = d.getFullYear() === selectedYear;
      if (isMonthlyFilter) {
        return yearMatch && d.getMonth() === selectedMonth && p.status === 'completed';
      }
      return yearMatch && p.status === 'completed';
    });

    const filteredExpenses = expenses.filter((e) => {
      const d = new Date(e.date);
      const yearMatch = d.getFullYear() === selectedYear;
      if (isMonthlyFilter) {
        return yearMatch && d.getMonth() === selectedMonth;
      }
      return yearMatch;
    });

    // Maintenance requests with actual costs in the period
    const filteredMaintenance = maintenanceRequests.filter((r) => {
      if (!r.completedDate) return false;
      const d = new Date(r.completedDate);
      const yearMatch = d.getFullYear() === selectedYear;
      if (isMonthlyFilter) {
        return yearMatch && d.getMonth() === selectedMonth;
      }
      return yearMatch;
    });

    // Markups in the period (company-level income)
    const filteredMarkups = markupItems.filter((m) => {
      const d = new Date(m.date);
      const yearMatch = d.getFullYear() === selectedYear;
      if (isMonthlyFilter) {
        return yearMatch && d.getMonth() === selectedMonth;
      }
      return yearMatch;
    });

    const rentCollected = filteredPayments
      .filter((p) => propList.some((pr) => pr.id === p.propertyId))
      .reduce((sum, p) => sum + p.amount, 0);

    const byCategory = (cat: string) =>
      filteredExpenses
        .filter((e) => e.category === cat && propList.some((pr) => pr.id === e.propertyId))
        .reduce((sum, e) => sum + e.amount, 0);

    const repairs = byCategory('repairs');
    const utilities = byCategory('utilities');
    const propertyTax = byCategory('property-tax');
    const hoa = byCategory('hoa');
    const legal = byCategory('legal');
    const management = byCategory('management');
    const commissions = byCategory('commission');
    const insurance = byCategory('insurance');
    const other = byCategory('other');

    // Sum actual costs (fall back to estimated if no actual) for maintenance requests
    const maintenanceCosts = filteredMaintenance
      .filter((r) => propList.some((pr) => pr.id === r.propertyId))
      .reduce((sum, r) => sum + (r.actualCost ?? r.estimatedCost ?? 0), 0);

    // Markup revenue = charged - cost paid
    const markupRevenue = filteredMarkups.reduce(
      (sum, m) => sum + (m.chargedToClient - m.costPaid),
      0,
    );

    const totalExpenses = repairs + utilities + propertyTax + hoa + legal + management + commissions + insurance + other + maintenanceCosts;
    const totalIncome = rentCollected + markupRevenue;
    const netToOwner = totalIncome - totalExpenses;

    return {
      rentCollected,
      repairs,
      utilities,
      propertyTax,
      hoa,
      legal,
      management,
      commissions,
      insurance,
      other,
      maintenanceCosts,
      maintenanceItems: filteredMaintenance.filter((r) => propList.some((pr) => pr.id === r.propertyId)),
      markupRevenue,
      markupItems: filteredMarkups,
      totalExpenses,
      totalIncome,
      netToOwner,
    };
  }, [payments, expenses, maintenanceRequests, markupItems, properties, selectedPropertyId, selectedYear, selectedMonth, isMonthlyFilter]);

  const recentExpenses = useMemo(() => {
    return expenses
      .filter((e) => !selectedPropertyId || e.propertyId === selectedPropertyId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8);
  }, [expenses, selectedPropertyId]);

  const getPropertyAddress = (propertyId: string) => {
    const property = properties.find((p) => p.id === propertyId);
    return property ? property.address : 'Unknown';
  };

  const getTenantName = (tenantId: string) => {
    const t = tenants.find((x) => x.id === tenantId);
    return t ? `${t.firstName} ${t.lastName}` : 'Unknown';
  };

  const getVendorName = (vendorId?: string) => {
    if (!vendorId) return '—';
    const vendor = vendors.find((v) => v.id === vendorId);
    return vendor?.name ?? 'Unknown';
  };

  // 1099 vendors: paid > $600 for the year
  const vendorPayments = useMemo(() => {
    return vendors.map((v) => {
      const total = expenses
        .filter((e) => e.vendorId === v.id && new Date(e.date).getFullYear() === selectedYear)
        .reduce((sum, e) => sum + e.amount, 0);
      return { vendor: v, total };
    }).filter((vp) => vp.total > 0);
  }, [vendors, expenses, selectedYear]);

  const needs1099 = vendorPayments.filter((vp) => vp.total >= 600);

  const formatCurrency = (amount: number) =>
    `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Escape user-supplied text for safe HTML insertion in the print window
  const esc = (text: string) =>
    text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const PRINT_STYLE_LOAD_DELAY = 600; // ms – allow styles to apply before triggering print dialog

  const reportTitle =
    reportType === 'monthly'
      ? `${MONTHS[selectedMonth]} ${selectedYear} Report`
      : reportType === 'annual'
      ? `Annual ${selectedYear} Report`
      : companyPeriod === 'monthly'
      ? `Company Report — ${MONTHS[selectedMonth]} ${selectedYear}`
      : `Company Report — ${selectedYear}`;

  const handlePrint = () => {
    const propertyLabel = selectedPropertyId
      ? (properties.find((p) => p.id === selectedPropertyId)?.address ?? 'Selected Property')
      : 'All Properties';

    const expenseRows = [
      ['Repairs &amp; Maintenance', report.repairs],
      ['Utilities', report.utilities],
      ['Property Tax', report.propertyTax],
      ['HOA Fees', report.hoa],
      ['Legal Fees', report.legal],
      ['Management Fees', report.management],
      ['Commissions', report.commissions],
      ['Insurance', report.insurance],
      ['Other Expenses', report.other],
      ['Maintenance Requests', report.maintenanceCosts],
    ]
      .filter(([, amt]) => (amt as number) > 0)
      .map(
        ([label, amt]) =>
          `<tr><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${label}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;color:#dc2626;">${formatCurrency(amt as number)}</td></tr>`
      )
      .join('');

    const markupRows = report.markupItems.length > 0
      ? report.markupItems
          .map(
            (m) =>
              `<tr><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;">${format(new Date(m.date), 'MMM d, yyyy')}</td><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-transform:capitalize;">${esc(m.category)}</td><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;">${esc(m.description)}</td><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatCurrency(m.costPaid)}</td><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatCurrency(m.chargedToClient)}</td><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:right;color:#065f46;font-weight:600;">${formatCurrency(m.chargedToClient - m.costPaid)}</td></tr>`
          )
          .join('')
      : '';

    const maintenanceRows = report.maintenanceItems.length > 0
      ? report.maintenanceItems
          .map(
            (r) =>
              `<tr><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;">${format(new Date(r.completedDate!), 'MMM d, yyyy')}</td><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;">${esc(getPropertyAddress(r.propertyId))}</td><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;">${esc(r.title)}</td><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;">${esc(getTenantName(r.tenantId))}</td><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:right;color:#dc2626;">${formatCurrency(r.actualCost ?? r.estimatedCost ?? 0)}</td></tr>`
          )
          .join('')
      : `<tr><td colspan="5" style="padding:8px 12px;color:#9ca3af;text-align:center;">No completed maintenance requests in this period</td></tr>`;

    const recentExpenseRows = recentExpenses
      .map(
        (e) =>
          `<tr><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;">${format(new Date(e.date), 'MMM d, yyyy')}</td><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;">${esc(getPropertyAddress(e.propertyId))}</td><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-transform:capitalize;">${esc(e.category)}</td><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;">${esc(getVendorName(e.vendorId))}</td><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;">${esc(e.description)}</td><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:right;color:#dc2626;">${formatCurrency(e.amount)}</td></tr>`
      )
      .join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${esc(reportTitle)} — Manzione Properties</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; color: #111827; background: #fff; padding: 32px; }
    h1 { font-size: 20px; font-weight: 700; margin-bottom: 2px; }
    h2 { font-size: 14px; font-weight: 600; margin: 24px 0 8px; color: #374151; }
    p { color: #6b7280; font-size: 12px; margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { background: #f3f4f6; padding: 8px 12px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; }
    .header-bar { background: #0d1f2d; color: #fff; padding: 10px 14px; font-weight: 600; font-size: 12px; }
    .section-bar { background: #f9fafb; padding: 8px 14px; font-weight: 600; font-size: 12px; color: #374151; border-top: 1px solid #e5e7eb; }
    .total-row td { font-weight: 700; background: #f3f4f6; padding: 10px 12px; }
    .net-row td { font-weight: 700; font-size: 14px; padding: 12px; }
    .net-positive td { background: #ecfdf5; color: #065f46; }
    .net-negative td { background: #fef2f2; color: #991b1b; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; }
    .badge-green { background: #d1fae5; color: #065f46; }
    .badge-yellow { background: #fef3c7; color: #92400e; }
    .meta { margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #e5e7eb; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <div class="meta">
    <h1>Manzione Properties</h1>
    <h1 style="color:#0d1f2d;">${esc(reportTitle)}</h1>
    <p style="margin-top:6px;">Property: ${esc(propertyLabel)}</p>
    <p>Generated: ${format(new Date(), 'MMMM d, yyyy h:mm a')}</p>
    <p>Status: <span class="badge ${approvedReports[reportKey] ? 'badge-green' : 'badge-yellow'}">${approvedReports[reportKey] ? 'Approved' : 'Pending Review'}</span></p>
  </div>

  <div style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:24px;">
    <div class="header-bar">Income</div>
    <table>
      <tr>
        <td style="padding:10px 12px;">Rent Collected</td>
        <td style="padding:10px 12px;text-align:right;color:#065f46;font-weight:600;">${formatCurrency(report.rentCollected)}</td>
      </tr>
      ${report.markupRevenue > 0 ? `<tr>
        <td style="padding:10px 12px;">Markup Revenue</td>
        <td style="padding:10px 12px;text-align:right;color:#065f46;font-weight:600;">${formatCurrency(report.markupRevenue)}</td>
      </tr>` : ''}
      <tr style="background:#f9fafb;">
        <td style="padding:10px 12px;font-weight:700;">Total Income</td>
        <td style="padding:10px 12px;text-align:right;color:#065f46;font-weight:700;">${formatCurrency(report.totalIncome)}</td>
      </tr>
    </table>
    <div class="section-bar">Expenses</div>
    <table>
      ${expenseRows}
      <tr class="total-row">
        <td>Total Expenses</td>
        <td style="text-align:right;color:#dc2626;">${formatCurrency(report.totalExpenses)}</td>
      </tr>
    </table>
    <table>
      <tr class="${report.netToOwner >= 0 ? 'net-positive' : 'net-negative'} net-row">
        <td>Net to Owner</td>
        <td style="text-align:right;">${formatCurrency(report.netToOwner)}</td>
      </tr>
    </table>
  </div>

  ${report.markupItems.length > 0 ? `
  <h2>Markup Revenue Detail</h2>
  <table>
    <thead>
      <tr>
        <th>Date</th><th>Category</th><th>Description</th><th style="text-align:right;">Cost Paid</th><th style="text-align:right;">Charged</th><th style="text-align:right;">Markup</th>
      </tr>
    </thead>
    <tbody>${markupRows}</tbody>
  </table>` : ''}

  <h2>Maintenance Requests (Period)</h2>
  <table>
    <thead>
      <tr>
        <th>Completed</th><th>Property</th><th>Request</th><th>Tenant</th><th style="text-align:right;">Cost</th>
      </tr>
    </thead>
    <tbody>${maintenanceRows}</tbody>
  </table>

  <h2>Recent Expenses</h2>
  <table>
    <thead>
      <tr>
        <th>Date</th><th>Property</th><th>Category</th><th>Vendor</th><th>Description</th><th style="text-align:right;">Amount</th>
      </tr>
    </thead>
    <tbody>${recentExpenseRows || '<tr><td colspan="6" style="padding:8px 12px;color:#9ca3af;text-align:center;">No expenses recorded</td></tr>'}</tbody>
  </table>

  ${needs1099.length > 0 ? `
  <h2>1099 Summary — ${selectedYear}</h2>
  <table>
    <thead><tr><th>Vendor</th><th>Category</th><th>Email</th><th style="text-align:right;">Total Paid</th></tr></thead>
    <tbody>
      ${needs1099.map((vp) => `<tr><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;">${esc(vp.vendor.name)}</td><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-transform:capitalize;">${esc(vp.vendor.category)}</td><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;">${esc(vp.vendor.email)}</td><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;">${formatCurrency(vp.total)}</td></tr>`).join('')}
    </tbody>
  </table>` : ''}
</body>
</html>`;

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) {
      toast.error('Pop-up blocked. Please allow pop-ups for this site.');
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), PRINT_STYLE_LOAD_DELAY);
    toast.info('Report document opened');
  };

  const handleExpenseSubmit = async () => {
    if (!expenseForm.propertyId) {
      toast.error('Please select a property');
      return;
    }
    if (!expenseForm.amount || Number(expenseForm.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!expenseForm.description.trim()) {
      toast.error('Please enter a description');
      return;
    }
    await addExpense({
      propertyId: expenseForm.propertyId,
      vendorId: expenseForm.vendorId || undefined,
      category: expenseForm.category,
      amount: Number(expenseForm.amount),
      description: expenseForm.description,
      date: expenseForm.date,
      receiptUrl: expenseForm.receiptUrl || undefined,
    });
    setIsExpenseModalOpen(false);
    setExpenseForm({
      propertyId: '',
      vendorId: '',
      category: 'repairs',
      amount: '',
      description: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      receiptUrl: '',
    });
    toast.success('Expense added');
  };

  const handleMarkupSubmit = () => {
    const cost = Number(markupForm.costPaid);
    const charged = Number(markupForm.chargedToClient);
    if (!markupForm.description.trim()) {
      toast.error('Please enter a description');
      return;
    }
    if (isNaN(cost) || cost <= 0) {
      toast.error('Please enter a valid cost paid (must be greater than 0)');
      return;
    }
    if (isNaN(charged) || charged <= 0) {
      toast.error('Please enter a valid amount charged to client');
      return;
    }
    if (charged <= cost) {
      toast.error('Amount charged must be greater than cost paid to create a markup');
      return;
    }
    const newItem: MarkupItem = {
      id: crypto.randomUUID(),
      description: markupForm.description,
      category: markupForm.category,
      costPaid: cost,
      chargedToClient: charged,
      date: markupForm.date,
    };
    const updated = [...markupItems, newItem];
    setMarkupItems(updated);
    saveMarkups(updated);
    setIsMarkupModalOpen(false);
    setMarkupForm({
      description: '',
      category: 'repairs',
      costPaid: '',
      chargedToClient: '',
      date: format(new Date(), 'yyyy-MM-dd'),
    });
    toast.success('Markup added');
  };

  const handleDeleteMarkup = (id: string) => {
    const updated = markupItems.filter((m) => m.id !== id);
    setMarkupItems(updated);
    saveMarkups(updated);
    toast.success('Markup removed');
  };

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Financial reporting and tax summaries"
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => {
                setExpenseForm((current) => ({
                  ...current,
                  propertyId: selectedPropertyId || current.propertyId,
                }));
                setIsExpenseModalOpen(true);
              }}
              className="btn-primary"
            >
              <Plus size={16} /> Add Expense
            </button>
            <button onClick={() => setIsMarkupModalOpen(true)} className="btn-secondary">
              <Plus size={16} /> Add Markup
            </button>
            <button onClick={handlePrint} className="btn-outline">
              <Printer size={16} /> Print
            </button>
          </div>
        }
      />

      <div className="page-card mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Report Configuration</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="label">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as 'monthly' | 'annual' | 'company')}
              className="input-field"
            >
              <option value="monthly">Monthly</option>
              <option value="annual">Annual</option>
              <option value="company">Company (All Properties)</option>
            </select>
          </div>
          {reportType !== 'company' && (
            <div>
              <label className="label">Property</label>
              <select
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
                className="input-field"
              >
                <option value="">All Properties</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.address}</option>
                ))}
              </select>
            </div>
          )}
          {reportType === 'company' && (
            <div>
              <label className="label">Period</label>
              <select
                value={companyPeriod}
                onChange={(e) => setCompanyPeriod(e.target.value as 'annual' | 'monthly')}
                className="input-field"
              >
                <option value="annual">Annual</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          )}
          <div>
            <label className="label">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="input-field"
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          {isMonthlyFilter && (
            <div>
              <label className="label">Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="input-field"
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i}>{m}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="page-card mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-gray-800">{reportTitle}</h2>
            <p className="text-sm text-gray-500">
              Generated {format(new Date(), 'MMMM d, yyyy h:mm a')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={approvedReports[reportKey] ? 'badge-green' : 'badge-yellow'}>
              {approvedReports[reportKey] ? 'Approved' : 'Pending Review'}
            </span>
            <button
              onClick={() => setReportApproved(!approvedReports[reportKey])}
              className={approvedReports[reportKey] ? 'btn-outline btn-sm' : 'btn-primary btn-sm'}
            >
              {approvedReports[reportKey] ? 'Revoke Approval' : 'Approve Report'}
            </button>
            <FileText size={28} className="text-primary opacity-30" />
          </div>
        </div>

        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-primary text-white px-5 py-3">
            <p className="font-semibold text-sm">Income</p>
          </div>
          <div className="divide-y divide-gray-100">
            <div className="flex justify-between items-center px-5 py-3">
              <span className="text-sm text-gray-700">Rent Collected</span>
              <span className="text-sm font-semibold text-green-700">{formatCurrency(report.rentCollected)}</span>
            </div>
            {report.markupRevenue > 0 && (
              <div className="flex justify-between items-center px-5 py-3">
                <span className="text-sm text-gray-700">Markup Revenue</span>
                <span className="text-sm font-semibold text-green-700">{formatCurrency(report.markupRevenue)}</span>
              </div>
            )}
            <div className="flex justify-between items-center px-5 py-3 bg-gray-50">
              <span className="text-sm font-semibold text-gray-700">Total Income</span>
              <span className="text-sm font-semibold text-green-700">{formatCurrency(report.totalIncome)}</span>
            </div>
          </div>

          <div className="bg-gray-50 px-5 py-3">
            <p className="font-semibold text-sm text-gray-700">Expenses</p>
          </div>
          <div className="divide-y divide-gray-100">
            {[
              ['Repairs & Maintenance', report.repairs],
              ['Utilities', report.utilities],
              ['Property Tax', report.propertyTax],
              ['HOA Fees', report.hoa],
              ['Legal Fees', report.legal],
              ['Management Fees', report.management],
              ['Commissions', report.commissions],
              ['Insurance', report.insurance],
              ['Other', report.other],
              ['Maintenance Requests', report.maintenanceCosts],
            ].map(([label, amount]) => (
              <div key={label as string} className="flex justify-between items-center px-5 py-3">
                <span className="text-sm text-gray-600">{label as string}</span>
                <span className="text-sm text-red-600">{formatCurrency(amount as number)}</span>
              </div>
            ))}
            <div className="flex justify-between items-center px-5 py-3 bg-gray-50">
              <span className="text-sm font-semibold text-gray-700">Total Expenses</span>
              <span className="text-sm font-semibold text-red-600">{formatCurrency(report.totalExpenses)}</span>
            </div>
          </div>

          <div className={`flex justify-between items-center px-5 py-4 ${report.netToOwner >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
            <span className="font-bold text-gray-800">Net to Owner</span>
            <span className={`text-lg font-bold ${report.netToOwner >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {formatCurrency(report.netToOwner)}
            </span>
          </div>
        </div>
      </div>

      {/* Markup Revenue Panel */}
      <div className="page-card mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-800">Markup Revenue</h2>
            <p className="text-sm text-gray-500">Extra income from marked-up services (repairs, cleaning, LLC renewals, etc.)</p>
          </div>
          <button onClick={() => setIsMarkupModalOpen(true)} className="btn-primary btn-sm">
            <Plus size={14} /> Add Markup
          </button>
        </div>
        {report.markupItems.length === 0 ? (
          <p className="text-sm text-gray-400">No markup items for the selected period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-th">Date</th>
                  <th className="table-th">Category</th>
                  <th className="table-th">Description</th>
                  <th className="table-th">Cost Paid</th>
                  <th className="table-th">Charged to Client</th>
                  <th className="table-th">Markup (Revenue)</th>
                  <th className="table-th"></th>
                </tr>
              </thead>
              <tbody>
                {report.markupItems.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="table-td">{format(new Date(m.date), 'MMM d, yyyy')}</td>
                    <td className="table-td capitalize">{m.category}</td>
                    <td className="table-td">{m.description}</td>
                    <td className="table-td text-gray-600">{formatCurrency(m.costPaid)}</td>
                    <td className="table-td text-gray-600">{formatCurrency(m.chargedToClient)}</td>
                    <td className="table-td font-semibold text-green-700">{formatCurrency(m.chargedToClient - m.costPaid)}</td>
                    <td className="table-td">
                      <button
                        onClick={() => handleDeleteMarkup(m.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        title="Remove markup"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="page-card">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Recent Expenses</h2>
        {recentExpenses.length === 0 ? (
          <p className="text-sm text-gray-400 mb-6">No expenses recorded yet. Add expenses to improve owner and tax reporting.</p>
        ) : (
          <div className="overflow-x-auto mb-6">
            <table className="w-full min-w-[760px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-th">Date</th>
                  <th className="table-th">Property</th>
                  <th className="table-th">Category</th>
                  <th className="table-th">Vendor</th>
                  <th className="table-th">Description</th>
                  <th className="table-th">Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentExpenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50">
                    <td className="table-td">{format(new Date(expense.date), 'MMM d, yyyy')}</td>
                    <td className="table-td">{getPropertyAddress(expense.propertyId)}</td>
                    <td className="table-td capitalize">{expense.category}</td>
                    <td className="table-td">{getVendorName(expense.vendorId)}</td>
                    <td className="table-td">{expense.description}</td>
                    <td className="table-td font-semibold text-red-600">{formatCurrency(expense.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h2 className="text-base font-semibold text-gray-800 mb-4">
          1099 Summary — {selectedYear}
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Vendors paid $600 or more in {selectedYear} may require a 1099 form.
        </p>
        {needs1099.length === 0 ? (
          <p className="text-sm text-gray-400">No vendors reached the $600 threshold for {selectedYear}.</p>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">Vendor</th>
                <th className="table-th">Category</th>
                <th className="table-th">Email</th>
                <th className="table-th">Phone</th>
                <th className="table-th">Total Paid</th>
                <th className="table-th">1099 Required</th>
              </tr>
            </thead>
            <tbody>
              {needs1099.map(({ vendor, total }) => (
                <tr key={vendor.id} className="hover:bg-gray-50">
                  <td className="table-td font-medium">{vendor.name}</td>
                  <td className="table-td capitalize">{vendor.category}</td>
                  <td className="table-td text-gray-500">{vendor.email}</td>
                  <td className="table-td">{vendor.phone}</td>
                  <td className="table-td font-semibold">${total.toLocaleString()}</td>
                  <td className="table-td">
                    <span className="badge-red">Yes</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {vendorPayments.filter((vp) => vp.total < 600 && vp.total > 0).length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-gray-400 font-medium mb-2">Below Threshold (Under $600)</p>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-th">Vendor</th>
                  <th className="table-th">Total Paid</th>
                </tr>
              </thead>
              <tbody>
                {vendorPayments
                  .filter((vp) => vp.total < 600)
                  .map(({ vendor, total }) => (
                    <tr key={vendor.id}>
                      <td className="table-td">{vendor.name}</td>
                      <td className="table-td">${total.toLocaleString()}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        title="Add Expense"
        size="md"
        footer={
          <>
            <button onClick={() => setIsExpenseModalOpen(false)} className="btn-outline">Cancel</button>
            <button onClick={handleExpenseSubmit} className="btn-primary">Save Expense</button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">Property</label>
            <select
              value={expenseForm.propertyId}
              onChange={(e) => setExpenseForm((current) => ({ ...current, propertyId: e.target.value }))}
              className="input-field"
            >
              <option value="">Select property</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>{property.address}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Category</label>
            <select
              value={expenseForm.category}
              onChange={(e) => setExpenseForm((current) => ({ ...current, category: e.target.value as (typeof expenseCategories)[number] }))}
              className="input-field"
            >
              {expenseCategories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Vendor (optional)</label>
            <select
              value={expenseForm.vendorId}
              onChange={(e) => setExpenseForm((current) => ({ ...current, vendorId: e.target.value }))}
              className="input-field"
            >
              <option value="">No vendor</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Amount ($)</label>
            <input
              value={expenseForm.amount}
              onChange={(e) => setExpenseForm((current) => ({ ...current, amount: e.target.value }))}
              type="number"
              min={0}
              step="0.01"
              className="input-field"
            />
          </div>
          <div>
            <label className="label">Date</label>
            <input
              value={expenseForm.date}
              onChange={(e) => setExpenseForm((current) => ({ ...current, date: e.target.value }))}
              type="date"
              className="input-field"
            />
          </div>
          <div className="col-span-2">
            <label className="label">Description</label>
            <input
              value={expenseForm.description}
              onChange={(e) => setExpenseForm((current) => ({ ...current, description: e.target.value }))}
              className="input-field"
              placeholder="Describe the expense"
            />
          </div>
          <div className="col-span-2">
            <label className="label">Receipt URL (optional)</label>
            <input
              value={expenseForm.receiptUrl}
              onChange={(e) => setExpenseForm((current) => ({ ...current, receiptUrl: e.target.value }))}
              className="input-field"
              placeholder="https://..."
            />
          </div>
        </div>
      </Modal>

      {/* Add Markup Modal */}
      <Modal
        isOpen={isMarkupModalOpen}
        onClose={() => setIsMarkupModalOpen(false)}
        title="Add Markup"
        size="md"
        footer={
          <>
            <button onClick={() => setIsMarkupModalOpen(false)} className="btn-outline">Cancel</button>
            <button onClick={handleMarkupSubmit} className="btn-primary">Save Markup</button>
          </>
        }
      >
        <p className="text-sm text-gray-500 mb-4">
          Record a service you paid for at one price and charged the client a higher amount. The difference is markup revenue for Manzione Properties.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Category</label>
            <select
              value={markupForm.category}
              onChange={(e) => setMarkupForm((current) => ({ ...current, category: e.target.value }))}
              className="input-field"
            >
              {markupCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Date</label>
            <input
              value={markupForm.date}
              onChange={(e) => setMarkupForm((current) => ({ ...current, date: e.target.value }))}
              type="date"
              className="input-field"
            />
          </div>
          <div className="col-span-2">
            <label className="label">Description</label>
            <input
              value={markupForm.description}
              onChange={(e) => setMarkupForm((current) => ({ ...current, description: e.target.value }))}
              className="input-field"
              placeholder="e.g. Cleaning service, LLC renewal fee, Repair job..."
            />
          </div>
          <div>
            <label className="label">Cost Paid ($)</label>
            <input
              value={markupForm.costPaid}
              onChange={(e) => setMarkupForm((current) => ({ ...current, costPaid: e.target.value }))}
              type="number"
              min={0}
              step="0.01"
              className="input-field"
              placeholder="100.00"
            />
          </div>
          <div>
            <label className="label">Charged to Client ($)</label>
            <input
              value={markupForm.chargedToClient}
              onChange={(e) => setMarkupForm((current) => ({ ...current, chargedToClient: e.target.value }))}
              type="number"
              min={0}
              step="0.01"
              className="input-field"
              placeholder="120.00"
            />
          </div>
          {markupForm.costPaid && markupForm.chargedToClient && Number(markupForm.chargedToClient) > Number(markupForm.costPaid) && (
            <div className="col-span-2 bg-green-50 rounded-lg px-4 py-3">
              <p className="text-sm font-semibold text-green-800">
                Markup Revenue: {formatCurrency(Number(markupForm.chargedToClient) - Number(markupForm.costPaid))}
              </p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
