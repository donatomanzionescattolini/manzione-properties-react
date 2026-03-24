import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { FileText, Printer } from 'lucide-react';
import { useDataStore } from '../../store/dataStore';
import { PageHeader } from '../../components/layout/PageHeader';
import { toast } from '../../components/ui/toastStore';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR];

export function Reports() {
  const { properties, payments, expenses, vendors } = useDataStore();
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [reportType, setReportType] = useState<'monthly' | 'annual' | 'company'>('monthly');

  const report = useMemo(() => {
    const propList = selectedPropertyId
      ? properties.filter((p) => p.id === selectedPropertyId)
      : properties;

    const filteredPayments = payments.filter((p) => {
      const d = new Date(p.date);
      const yearMatch = d.getFullYear() === selectedYear;
      if (reportType === 'monthly') {
        return yearMatch && d.getMonth() === selectedMonth && p.status === 'completed';
      }
      return yearMatch && p.status === 'completed';
    });

    const filteredExpenses = expenses.filter((e) => {
      const d = new Date(e.date);
      const yearMatch = d.getFullYear() === selectedYear;
      if (reportType === 'monthly') {
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
    const insurance = byCategory('insurance');
    const other = byCategory('other');

    const totalExpenses = repairs + utilities + propertyTax + hoa + legal + management + insurance + other;
    const netToOwner = rentCollected - totalExpenses;

    return {
      rentCollected,
      repairs,
      utilities,
      propertyTax,
      hoa,
      legal,
      management,
      insurance,
      other,
      totalExpenses,
      netToOwner,
    };
  }, [payments, expenses, properties, selectedPropertyId, selectedYear, selectedMonth, reportType]);

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

  const handlePrint = () => {
    window.print();
    toast.info('Print dialog opened');
  };

  const formatCurrency = (amount: number) =>
    `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const reportTitle =
    reportType === 'monthly'
      ? `${MONTHS[selectedMonth]} ${selectedYear} Report`
      : reportType === 'annual'
      ? `Annual ${selectedYear} Report`
      : `Company Report ${selectedYear}`;

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Financial reporting and tax summaries"
        actions={
          <button onClick={handlePrint} className="btn-outline">
            <Printer size={16} /> Print
          </button>
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
          {reportType === 'monthly' && (
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
          <FileText size={28} className="text-primary opacity-30" />
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
              ['Insurance', report.insurance],
              ['Other', report.other],
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

      <div className="page-card">
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
    </div>
  );
}
