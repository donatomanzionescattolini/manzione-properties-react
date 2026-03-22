import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AppStore,
  Property,
  Tenant,
  Payment,
  LateFee,
  MaintenanceRequest,
  Vendor,
  Owner,
  Expense,
  EscrowTransaction,
  Document,
} from '../types';

const now = new Date().toISOString();

const SEED_DATA: AppStore = {
  users: [
    {
      id: 'admin-1',
      email: 'admin@manzione.com',
      password: 'admin123',
      name: 'Admin',
      role: 'admin',
      createdAt: now,
    },
    {
      id: 'tenant-user-1',
      email: 'john@example.com',
      password: 'tenant123',
      name: 'John Smith',
      role: 'tenant',
      tenantId: 'tenant-1',
      createdAt: now,
    },
  ],
  properties: [
    {
      id: 'prop-1',
      address: '123 Oak Street',
      city: 'Philadelphia',
      state: 'PA',
      zip: '19103',
      unitCount: 1,
      rentAmount: 1800,
      rentDueDay: 1,
      lateFeeType: 'fixed',
      lateFeeAmount: 75,
      gracePeriodDays: 5,
      ownerId: 'owner-1',
      status: 'active',
      createdAt: now,
    },
    {
      id: 'prop-2',
      address: '456 Maple Avenue',
      city: 'Cherry Hill',
      state: 'NJ',
      zip: '08002',
      unitCount: 1,
      rentAmount: 2200,
      rentDueDay: 1,
      lateFeeType: 'percentage',
      lateFeeAmount: 5,
      gracePeriodDays: 5,
      ownerId: 'owner-1',
      status: 'active',
      createdAt: now,
    },
    {
      id: 'prop-3',
      address: '789 Pine Road',
      city: 'Marlton',
      state: 'NJ',
      zip: '08053',
      unitCount: 2,
      rentAmount: 1600,
      rentDueDay: 1,
      lateFeeType: 'fixed',
      lateFeeAmount: 50,
      gracePeriodDays: 3,
      status: 'active',
      createdAt: now,
    },
  ],
  tenants: [
    {
      id: 'tenant-1',
      firstName: 'John',
      lastName: 'Smith',
      email: 'john@example.com',
      phone: '(215) 555-0101',
      propertyId: 'prop-1',
      leaseStartDate: '2024-01-01',
      leaseEndDate: '2024-12-31',
      rentAmount: 1800,
      securityDeposit: 3600,
      status: 'active',
      createdAt: now,
    },
    {
      id: 'tenant-2',
      firstName: 'Sarah',
      lastName: 'Johnson',
      email: 'sarah@example.com',
      phone: '(856) 555-0202',
      propertyId: 'prop-2',
      leaseStartDate: '2024-03-01',
      leaseEndDate: '2025-02-28',
      rentAmount: 2200,
      securityDeposit: 4400,
      status: 'active',
      createdAt: now,
    },
    {
      id: 'tenant-3',
      firstName: 'Michael',
      lastName: 'Davis',
      email: 'michael@example.com',
      phone: '(856) 555-0303',
      propertyId: 'prop-3',
      leaseStartDate: '2023-06-01',
      leaseEndDate: '2024-05-31',
      rentAmount: 1600,
      securityDeposit: 3200,
      status: 'active',
      createdAt: now,
    },
  ],
  payments: [
    { id: 'pay-1', tenantId: 'tenant-1', propertyId: 'prop-1', amount: 1800, date: '2026-03-01', method: 'check', reference: '#1234', status: 'completed', createdAt: now },
    { id: 'pay-2', tenantId: 'tenant-2', propertyId: 'prop-2', amount: 2200, date: '2026-03-01', method: 'ach', status: 'completed', createdAt: now },
    { id: 'pay-3', tenantId: 'tenant-1', propertyId: 'prop-1', amount: 1800, date: '2026-02-01', method: 'check', reference: '#1220', status: 'completed', createdAt: now },
    { id: 'pay-4', tenantId: 'tenant-2', propertyId: 'prop-2', amount: 2200, date: '2026-02-01', method: 'ach', status: 'completed', createdAt: now },
    { id: 'pay-5', tenantId: 'tenant-3', propertyId: 'prop-3', amount: 1600, date: '2026-02-01', method: 'cash', status: 'completed', createdAt: now },
    { id: 'pay-6', tenantId: 'tenant-3', propertyId: 'prop-3', amount: 1600, date: '2026-01-01', method: 'check', status: 'completed', createdAt: now },
  ],
  lateFees: [
    { id: 'fee-1', tenantId: 'tenant-3', propertyId: 'prop-3', amount: 50, reason: 'Late rent payment - March 2026', status: 'active', dueDate: '2026-03-08', createdAt: now },
  ],
  maintenanceRequests: [
    {
      id: 'maint-1',
      tenantId: 'tenant-1',
      propertyId: 'prop-1',
      title: 'Leaking Faucet in Kitchen',
      description: 'The kitchen faucet has been dripping constantly for 3 days',
      priority: 'medium',
      category: 'plumbing',
      status: 'in-progress',
      photos: [],
      vendorId: 'vendor-1',
      notes: [{ text: 'Plumber scheduled for Friday', author: 'Admin', timestamp: now }],
      submittedDate: '2026-03-10',
      assignedDate: '2026-03-11',
      createdAt: now,
    },
    {
      id: 'maint-2',
      tenantId: 'tenant-2',
      propertyId: 'prop-2',
      title: 'HVAC Not Heating Properly',
      description: 'The heating system is not working correctly, temperature drops at night',
      priority: 'high',
      category: 'hvac',
      status: 'pending',
      photos: [],
      notes: [],
      submittedDate: '2026-03-12',
      createdAt: now,
    },
  ],
  vendors: [
    { id: 'vendor-1', name: "Joe's Plumbing", email: 'joe@plumbing.com', phone: '(215) 555-0401', category: 'plumber', city: 'Philadelphia', state: 'PA', status: 'active', createdAt: now },
    { id: 'vendor-2', name: 'Elite Electric', email: 'info@eliteelectric.com', phone: '(856) 555-0402', category: 'electrician', city: 'Cherry Hill', state: 'NJ', status: 'active', createdAt: now },
    { id: 'vendor-3', name: 'Cool Air HVAC', email: 'service@coolair.com', phone: '(856) 555-0403', category: 'hvac', city: 'Marlton', state: 'NJ', status: 'active', createdAt: now },
  ],
  owners: [
    { id: 'owner-1', name: 'Manzione LLC', email: 'owner@manzione.com', phone: '(215) 555-0501', companyName: 'Manzione Properties LLC', state: 'NJ', properties: ['prop-1', 'prop-2'], portalEnabled: false, status: 'active', createdAt: now },
  ],
  expenses: [
    { id: 'exp-1', propertyId: 'prop-1', vendorId: 'vendor-1', category: 'repairs', amount: 250, description: 'Kitchen faucet repair', date: '2026-02-15', createdAt: now },
    { id: 'exp-2', propertyId: 'prop-2', category: 'property-tax', amount: 3600, description: 'Q1 property tax payment', date: '2026-01-15', createdAt: now },
    { id: 'exp-3', propertyId: 'prop-1', category: 'management', amount: 180, description: 'Management fee - February', date: '2026-02-28', createdAt: now },
  ],
  escrowTransactions: [
    { id: 'esc-1', tenantId: 'tenant-1', propertyId: 'prop-1', type: 'deposit', amount: 3600, description: 'Security deposit received', approvedBy: 'Admin', createdAt: now },
    { id: 'esc-2', tenantId: 'tenant-2', propertyId: 'prop-2', type: 'deposit', amount: 4400, description: 'Security deposit received', approvedBy: 'Admin', createdAt: now },
    { id: 'esc-3', tenantId: 'tenant-3', propertyId: 'prop-3', type: 'deposit', amount: 3200, description: 'Security deposit received', approvedBy: 'Admin', createdAt: now },
  ],
  documents: [],
};

interface DataStoreState extends AppStore {
  addProperty: (data: Omit<Property, 'id' | 'createdAt'>) => Property;
  updateProperty: (id: string, data: Partial<Property>) => void;
  deleteProperty: (id: string) => void;
  addTenant: (data: Omit<Tenant, 'id' | 'createdAt'>) => Tenant;
  updateTenant: (id: string, data: Partial<Tenant>) => void;
  deleteTenant: (id: string) => void;
  addPayment: (data: Omit<Payment, 'id' | 'createdAt'>) => Payment;
  addLateFee: (data: Omit<LateFee, 'id' | 'createdAt'>) => LateFee;
  updateLateFee: (id: string, data: Partial<LateFee>) => void;
  addMaintenanceRequest: (data: Omit<MaintenanceRequest, 'id' | 'createdAt'>) => MaintenanceRequest;
  updateMaintenanceRequest: (id: string, data: Partial<MaintenanceRequest>) => void;
  addVendor: (data: Omit<Vendor, 'id' | 'createdAt'>) => Vendor;
  updateVendor: (id: string, data: Partial<Vendor>) => void;
  deleteVendor: (id: string) => void;
  addOwner: (data: Omit<Owner, 'id' | 'createdAt'>) => Owner;
  updateOwner: (id: string, data: Partial<Owner>) => void;
  deleteOwner: (id: string) => void;
  addExpense: (data: Omit<Expense, 'id' | 'createdAt'>) => Expense;
  addEscrowTransaction: (data: Omit<EscrowTransaction, 'id' | 'createdAt'>) => EscrowTransaction;
  addDocument: (data: Omit<Document, 'id' | 'createdAt'>) => Document;
  deleteDocument: (id: string) => void;
  generateLateFees: (currentUser: string) => LateFee[];
}

export const useDataStore = create<DataStoreState>()(
  persist(
    (set, get) => ({
      ...SEED_DATA,

      addProperty: (data) => {
        const item: Property = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
        set((s) => ({ properties: [...s.properties, item] }));
        return item;
      },
      updateProperty: (id, data) => set((s) => ({
        properties: s.properties.map((p) => p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p),
      })),
      deleteProperty: (id) => set((s) => ({ properties: s.properties.filter((p) => p.id !== id) })),

      addTenant: (data) => {
        const item: Tenant = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
        set((s) => ({ tenants: [...s.tenants, item] }));
        return item;
      },
      updateTenant: (id, data) => set((s) => ({
        tenants: s.tenants.map((t) => t.id === id ? { ...t, ...data, updatedAt: new Date().toISOString() } : t),
      })),
      deleteTenant: (id) => set((s) => ({ tenants: s.tenants.filter((t) => t.id !== id) })),

      addPayment: (data) => {
        const item: Payment = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
        set((s) => ({ payments: [...s.payments, item] }));
        return item;
      },

      addLateFee: (data) => {
        const item: LateFee = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
        set((s) => ({ lateFees: [...s.lateFees, item] }));
        return item;
      },
      updateLateFee: (id, data) => set((s) => ({
        lateFees: s.lateFees.map((f) => f.id === id ? { ...f, ...data } : f),
      })),

      addMaintenanceRequest: (data) => {
        const item: MaintenanceRequest = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
        set((s) => ({ maintenanceRequests: [...s.maintenanceRequests, item] }));
        return item;
      },
      updateMaintenanceRequest: (id, data) => set((s) => ({
        maintenanceRequests: s.maintenanceRequests.map((r) => r.id === id ? { ...r, ...data, updatedAt: new Date().toISOString() } : r),
      })),

      addVendor: (data) => {
        const item: Vendor = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
        set((s) => ({ vendors: [...s.vendors, item] }));
        return item;
      },
      updateVendor: (id, data) => set((s) => ({
        vendors: s.vendors.map((v) => v.id === id ? { ...v, ...data } : v),
      })),
      deleteVendor: (id) => set((s) => ({ vendors: s.vendors.filter((v) => v.id !== id) })),

      addOwner: (data) => {
        const item: Owner = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
        set((s) => ({ owners: [...s.owners, item] }));
        return item;
      },
      updateOwner: (id, data) => set((s) => ({
        owners: s.owners.map((o) => o.id === id ? { ...o, ...data } : o),
      })),
      deleteOwner: (id) => set((s) => ({ owners: s.owners.filter((o) => o.id !== id) })),

      addExpense: (data) => {
        const item: Expense = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
        set((s) => ({ expenses: [...s.expenses, item] }));
        return item;
      },

      addEscrowTransaction: (data) => {
        const item: EscrowTransaction = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
        set((s) => ({ escrowTransactions: [...s.escrowTransactions, item] }));
        return item;
      },

      addDocument: (data) => {
        const item: Document = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
        set((s) => ({ documents: [...s.documents, item] }));
        return item;
      },
      deleteDocument: (id) => set((s) => ({ documents: s.documents.filter((d) => d.id !== id) })),

      generateLateFees: (currentUser) => {
        const state = get();
        const today = new Date();
        const generated: LateFee[] = [];

        state.properties.forEach((property) => {
          const tenants = state.tenants.filter((t) => t.propertyId === property.id && t.status === 'active');
          tenants.forEach((tenant) => {
            const dueDate = new Date(today.getFullYear(), today.getMonth(), property.rentDueDay);
            const graceDate = new Date(dueDate);
            graceDate.setDate(graceDate.getDate() + property.gracePeriodDays);

            if (today <= graceDate) return;

            const paid = state.payments.some((p) => {
              const pDate = new Date(p.date);
              return (
                p.tenantId === tenant.id &&
                pDate.getMonth() === today.getMonth() &&
                pDate.getFullYear() === today.getFullYear() &&
                p.status === 'completed'
              );
            });

            if (paid) return;

            const feeExists = state.lateFees.some((f) => {
              const fDate = new Date(f.createdAt);
              return (
                f.tenantId === tenant.id &&
                fDate.getMonth() === today.getMonth() &&
                fDate.getFullYear() === today.getFullYear() &&
                f.status !== 'waived'
              );
            });

            if (feeExists) return;

            let feeAmount = property.lateFeeAmount;
            if (property.lateFeeType === 'percentage') {
              feeAmount = (tenant.rentAmount * property.lateFeeAmount) / 100;
            }

            const fee: LateFee = {
              id: crypto.randomUUID(),
              tenantId: tenant.id,
              propertyId: property.id,
              amount: feeAmount,
              reason: `Late rent - ${today.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
              status: 'active',
              dueDate: graceDate.toISOString(),
              createdAt: new Date().toISOString(),
            };

            generated.push(fee);
          });
        });

        if (generated.length > 0) {
          set((s) => ({ lateFees: [...s.lateFees, ...generated] }));
        }
        void currentUser;
        return generated;
      },
    }),
    {
      name: 'manzione-data-store',
    }
  )
);
