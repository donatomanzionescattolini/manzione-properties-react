import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type {
  Property,
  Tenant,
  Payment,
  LateFee,
  MaintenanceRequest,
  MaintenanceNote,
  Vendor,
  Owner,
  Expense,
  EscrowTransaction,
  Document,
  Appliance,
} from '../types';

// ─── DB Row → App Type Mappers ─────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toProperty(r: any): Property {
  return {
    id: r.id,
    address: r.address,
    city: r.city,
    state: r.state,
    zip: r.zip,
    unitCount: r.unit_count,
    rentAmount: Number(r.rent_amount),
    rentDueDay: r.rent_due_day,
    lateFeeType: r.late_fee_type,
    lateFeeAmount: Number(r.late_fee_amount),
    gracePeriodDays: r.grace_period_days,
    ownerId: r.owner_id ?? undefined,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at ?? undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toTenant(r: any): Tenant {
  return {
    id: r.id,
    firstName: r.first_name,
    lastName: r.last_name,
    email: r.email,
    phone: r.phone,
    propertyId: r.property_id,
    leaseStartDate: r.lease_start_date,
    leaseEndDate: r.lease_end_date,
    rentAmount: Number(r.rent_amount),
    securityDeposit: Number(r.security_deposit),
    status: r.status,
    notes: r.notes ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at ?? undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toPayment(r: any): Payment {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    propertyId: r.property_id,
    amount: Number(r.amount),
    date: r.date,
    method: r.method,
    reference: r.reference ?? undefined,
    notes: r.notes ?? undefined,
    status: r.status,
    createdAt: r.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toLateFee(r: any): LateFee {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    propertyId: r.property_id,
    amount: Number(r.amount),
    reason: r.reason,
    status: r.status,
    dueDate: r.due_date,
    waiverReason: r.waiver_reason ?? undefined,
    waivedBy: r.waived_by ?? undefined,
    waivedAt: r.waived_at ?? undefined,
    createdAt: r.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toMaintenanceRequest(r: any): MaintenanceRequest {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const notes: MaintenanceNote[] = (r.maintenance_notes ?? []).map((n: any) => ({
    text: n.text,
    author: n.author,
    timestamp: n.created_at,
  }));
  return {
    id: r.id,
    tenantId: r.tenant_id,
    propertyId: r.property_id,
    title: r.title,
    description: r.description,
    priority: r.priority,
    category: r.category,
    status: r.status,
    photos: r.photos ?? [],
    vendorId: r.vendor_id ?? undefined,
    notes,
    submittedDate: r.submitted_date,
    assignedDate: r.assigned_date ?? undefined,
    completedDate: r.completed_date ?? undefined,
    estimatedCost: r.estimated_cost != null ? Number(r.estimated_cost) : undefined,
    actualCost: r.actual_cost != null ? Number(r.actual_cost) : undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at ?? undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toVendor(r: any): Vendor {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    category: r.category,
    address: r.address ?? undefined,
    city: r.city ?? undefined,
    state: r.state ?? undefined,
    zip: r.zip ?? undefined,
    ein: r.ein ?? undefined,
    licenseNumber: r.license_number ?? undefined,
    status: r.status,
    notes: r.notes ?? undefined,
    createdAt: r.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toOwner(r: any): Owner {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    companyName: r.company_name ?? undefined,
    address: r.address ?? undefined,
    city: r.city ?? undefined,
    state: r.state ?? undefined,
    zip: r.zip ?? undefined,
    taxId: r.tax_id ?? undefined,
    properties: r.properties ?? [],
    portalEnabled: r.portal_enabled,
    status: r.status,
    notes: r.notes ?? undefined,
    createdAt: r.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toExpense(r: any): Expense {
  return {
    id: r.id,
    propertyId: r.property_id,
    vendorId: r.vendor_id ?? undefined,
    category: r.category,
    amount: Number(r.amount),
    description: r.description,
    date: r.date,
    receiptUrl: r.receipt_url ?? undefined,
    createdAt: r.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toEscrow(r: any): EscrowTransaction {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    propertyId: r.property_id,
    type: r.type,
    amount: Number(r.amount),
    description: r.description,
    reference: r.reference ?? undefined,
    approvedBy: r.approved_by,
    createdAt: r.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toDocument(r: any): Document {
  return {
    id: r.id,
    propertyId: r.property_id ?? undefined,
    tenantId: r.tenant_id ?? undefined,
    type: r.type,
    name: r.name,
    url: r.url,
    size: r.size,
    mimeType: r.mime_type,
    description: r.description ?? undefined,
    uploadedBy: r.uploaded_by,
    createdAt: r.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toAppliance(r: any): Appliance {
  return {
    id: r.id,
    propertyId: r.property_id ?? undefined,
    name: r.name,
    category: r.category,
    brand: r.brand,
    model: r.model ?? undefined,
    serialNumber: r.serial_number ?? undefined,
    purchaseDate: r.purchase_date ?? undefined,
    warrantyExpiry: r.warranty_expiry ?? undefined,
    status: r.status,
    notes: r.notes ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at ?? undefined,
  };
}

// ─── Store Interface ───────────────────────────────────────────────────────

interface DataStoreState {
  properties: Property[];
  tenants: Tenant[];
  payments: Payment[];
  lateFees: LateFee[];
  maintenanceRequests: MaintenanceRequest[];
  vendors: Vendor[];
  owners: Owner[];
  expenses: Expense[];
  escrowTransactions: EscrowTransaction[];
  documents: Document[];
  appliances: Appliance[];
  isLoading: boolean;
  error: string | null;

  resetData: () => void;
  loadData: (role: 'admin' | 'tenant', tenantId?: string) => Promise<void>;

  addProperty: (data: Omit<Property, 'id' | 'createdAt'>) => Promise<Property>;
  updateProperty: (id: string, data: Partial<Property>) => Promise<void>;
  deleteProperty: (id: string) => Promise<void>;

  addTenant: (data: Omit<Tenant, 'id' | 'createdAt'>) => Promise<Tenant>;
  updateTenant: (id: string, data: Partial<Tenant>) => Promise<void>;
  deleteTenant: (id: string) => Promise<void>;

  addPayment: (data: Omit<Payment, 'id' | 'createdAt'>) => Promise<Payment>;

  addLateFee: (data: Omit<LateFee, 'id' | 'createdAt'>) => Promise<LateFee>;
  updateLateFee: (id: string, data: Partial<LateFee>) => Promise<void>;

  addMaintenanceRequest: (data: Omit<MaintenanceRequest, 'id' | 'createdAt'>) => Promise<MaintenanceRequest>;
  updateMaintenanceRequest: (id: string, data: Partial<MaintenanceRequest>) => Promise<void>;

  addVendor: (data: Omit<Vendor, 'id' | 'createdAt'>) => Promise<Vendor>;
  updateVendor: (id: string, data: Partial<Vendor>) => Promise<void>;
  deleteVendor: (id: string) => Promise<void>;

  addOwner: (data: Omit<Owner, 'id' | 'createdAt'>) => Promise<Owner>;
  updateOwner: (id: string, data: Partial<Owner>) => Promise<void>;
  deleteOwner: (id: string) => Promise<void>;

  addExpense: (data: Omit<Expense, 'id' | 'createdAt'>) => Promise<Expense>;

  addEscrowTransaction: (data: Omit<EscrowTransaction, 'id' | 'createdAt'>) => Promise<EscrowTransaction>;

  addDocument: (data: Omit<Document, 'id' | 'createdAt'>) => Promise<Document>;
  deleteDocument: (id: string) => Promise<void>;

  addAppliance: (data: Omit<Appliance, 'id' | 'createdAt'>) => Promise<Appliance>;
  updateAppliance: (id: string, data: Partial<Appliance>) => Promise<void>;
  deleteAppliance: (id: string) => Promise<void>;

  generateLateFees: (currentUser: string) => Promise<LateFee[]>;
}

// ─── Store ────────────────────────────────────────────────────────────────

export const useDataStore = create<DataStoreState>((set, get) => ({
  properties: [],
  tenants: [],
  payments: [],
  lateFees: [],
  maintenanceRequests: [],
  vendors: [],
  owners: [],
  expenses: [],
  escrowTransactions: [],
  documents: [],
  appliances: [],
  isLoading: false,
  error: null,

  resetData: () => set({
    properties: [],
    tenants: [],
    payments: [],
    lateFees: [],
    maintenanceRequests: [],
    vendors: [],
    owners: [],
    expenses: [],
    escrowTransactions: [],
    documents: [],
    appliances: [],
    isLoading: false,
    error: null,
  }),

  // ── Load all data from Supabase ───────────────────────────────────────
  loadData: async (role, tenantId) => {
    set({ isLoading: true, error: null });
    try {
      if (role === 'admin') {
        const [
          propertiesRes,
          tenantsRes,
          paymentsRes,
          lateFeesRes,
          maintenanceRes,
          vendorsRes,
          ownersRes,
          expensesRes,
          escrowRes,
          documentsRes,
          appliancesRes,
        ] = await Promise.all([
          supabase.from('properties').select('*').order('created_at'),
          supabase.from('tenants').select('*').order('created_at'),
          supabase.from('payments').select('*').order('created_at', { ascending: false }),
          supabase.from('late_fees').select('*').order('created_at', { ascending: false }),
          supabase.from('maintenance_requests').select('*, maintenance_notes(*)').order('created_at', { ascending: false }),
          supabase.from('vendors').select('*').order('name'),
          supabase.from('owners').select('*').order('name'),
          supabase.from('expenses').select('*').order('date', { ascending: false }),
          supabase.from('escrow_transactions').select('*').order('created_at', { ascending: false }),
          supabase.from('documents').select('*').order('created_at', { ascending: false }),
          supabase.from('appliances').select('*').order('created_at', { ascending: false }),
        ]);

        set({
          properties: (propertiesRes.data ?? []).map(toProperty),
          tenants: (tenantsRes.data ?? []).map(toTenant),
          payments: (paymentsRes.data ?? []).map(toPayment),
          lateFees: (lateFeesRes.data ?? []).map(toLateFee),
          maintenanceRequests: (maintenanceRes.data ?? []).map(toMaintenanceRequest),
          vendors: (vendorsRes.data ?? []).map(toVendor),
          owners: (ownersRes.data ?? []).map(toOwner),
          expenses: (expensesRes.data ?? []).map(toExpense),
          escrowTransactions: (escrowRes.data ?? []).map(toEscrow),
          documents: (documentsRes.data ?? []).map(toDocument),
          appliances: (appliancesRes.data ?? []).map(toAppliance),
          isLoading: false,
        });
      } else {
        // Tenant: load only their own records, plus property-level documents
        const [propertiesRes, tenantsRes, paymentsRes, lateFeesRes, maintenanceRes] =
          await Promise.all([
            supabase.from('properties').select('*'),
            supabase.from('tenants').select('*').eq('id', tenantId!).single(),
            supabase.from('payments').select('*').eq('tenant_id', tenantId!).order('created_at', { ascending: false }),
            supabase.from('late_fees').select('*').eq('tenant_id', tenantId!),
            supabase.from('maintenance_requests').select('*, maintenance_notes(*)').eq('tenant_id', tenantId!).order('created_at', { ascending: false }),
          ]);

        const tenantRow = tenantsRes.data;
        let documents: Document[] = [];

        if (tenantRow) {
          const [tenantDocsRes, propertyDocsRes] = await Promise.all([
            supabase.from('documents').select('*').eq('tenant_id', tenantId!).order('created_at', { ascending: false }),
            supabase.from('documents').select('*').eq('property_id', tenantRow.property_id).order('created_at', { ascending: false }),
          ]);

          const mergedDocs = [...(tenantDocsRes.data ?? []), ...(propertyDocsRes.data ?? [])];
          const seen = new Set<string>();
          documents = mergedDocs
            .filter((doc) => {
              if (seen.has(doc.id)) return false;
              seen.add(doc.id);
              return true;
            })
            .map(toDocument);
        }

        set({
          properties: (propertiesRes.data ?? []).map(toProperty),
          tenants: tenantRow ? [toTenant(tenantRow)] : [],
          payments: (paymentsRes.data ?? []).map(toPayment),
          lateFees: (lateFeesRes.data ?? []).map(toLateFee),
          maintenanceRequests: (maintenanceRes.data ?? []).map(toMaintenanceRequest),
          vendors: [],
          owners: [],
          expenses: [],
          escrowTransactions: [],
          documents,
          isLoading: false,
        });
      }
    } catch (err) {
      set({ isLoading: false, error: String(err) });
    }
  },

  // ── Properties ───────────────────────────────────────────────────────
  addProperty: async (data) => {
    const { data: row, error } = await supabase
      .from('properties')
      .insert({
        address: data.address,
        city: data.city,
        state: data.state,
        zip: data.zip,
        unit_count: data.unitCount,
        rent_amount: data.rentAmount,
        rent_due_day: data.rentDueDay,
        late_fee_type: data.lateFeeType,
        late_fee_amount: data.lateFeeAmount,
        grace_period_days: data.gracePeriodDays,
        owner_id: data.ownerId ?? null,
        status: data.status,
      })
      .select()
      .single();
    if (error) throw error;
    const item = toProperty(row);
    set((s) => ({ properties: [...s.properties, item] }));
    return item;
  },

  updateProperty: async (id, data) => {
    const updates: Record<string, unknown> = {};
    if (data.address !== undefined) updates.address = data.address;
    if (data.city !== undefined) updates.city = data.city;
    if (data.state !== undefined) updates.state = data.state;
    if (data.zip !== undefined) updates.zip = data.zip;
    if (data.unitCount !== undefined) updates.unit_count = data.unitCount;
    if (data.rentAmount !== undefined) updates.rent_amount = data.rentAmount;
    if (data.rentDueDay !== undefined) updates.rent_due_day = data.rentDueDay;
    if (data.lateFeeType !== undefined) updates.late_fee_type = data.lateFeeType;
    if (data.lateFeeAmount !== undefined) updates.late_fee_amount = data.lateFeeAmount;
    if (data.gracePeriodDays !== undefined) updates.grace_period_days = data.gracePeriodDays;
    if (data.ownerId !== undefined) updates.owner_id = data.ownerId;
    if (data.status !== undefined) updates.status = data.status;
    updates.updated_at = new Date().toISOString();

    const { error } = await supabase.from('properties').update(updates).eq('id', id);
    if (error) throw error;
    set((s) => ({
      properties: s.properties.map((p) =>
        p.id === id ? { ...p, ...data, updatedAt: updates.updated_at as string } : p
      ),
    }));
  },

  deleteProperty: async (id) => {
    const { error } = await supabase.from('properties').delete().eq('id', id);
    if (error) throw error;
    set((s) => ({ properties: s.properties.filter((p) => p.id !== id) }));
  },

  // ── Tenants ──────────────────────────────────────────────────────────
  addTenant: async (data) => {
    const { data: row, error } = await supabase
      .from('tenants')
      .insert({
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        phone: data.phone,
        property_id: data.propertyId,
        lease_start_date: data.leaseStartDate,
        lease_end_date: data.leaseEndDate,
        rent_amount: data.rentAmount,
        security_deposit: data.securityDeposit,
        status: data.status,
        notes: data.notes ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    const item = toTenant(row);
    set((s) => ({ tenants: [...s.tenants, item] }));
    return item;
  },

  updateTenant: async (id, data) => {
    const updates: Record<string, unknown> = {};
    if (data.firstName !== undefined) updates.first_name = data.firstName;
    if (data.lastName !== undefined) updates.last_name = data.lastName;
    if (data.email !== undefined) updates.email = data.email;
    if (data.phone !== undefined) updates.phone = data.phone;
    if (data.propertyId !== undefined) updates.property_id = data.propertyId;
    if (data.leaseStartDate !== undefined) updates.lease_start_date = data.leaseStartDate;
    if (data.leaseEndDate !== undefined) updates.lease_end_date = data.leaseEndDate;
    if (data.rentAmount !== undefined) updates.rent_amount = data.rentAmount;
    if (data.securityDeposit !== undefined) updates.security_deposit = data.securityDeposit;
    if (data.status !== undefined) updates.status = data.status;
    if (data.notes !== undefined) updates.notes = data.notes;
    updates.updated_at = new Date().toISOString();

    const { error } = await supabase.from('tenants').update(updates).eq('id', id);
    if (error) throw error;
    set((s) => ({
      tenants: s.tenants.map((t) =>
        t.id === id ? { ...t, ...data, updatedAt: updates.updated_at as string } : t
      ),
    }));
  },

  deleteTenant: async (id) => {
    const { error } = await supabase.from('tenants').delete().eq('id', id);
    if (error) throw error;
    set((s) => ({ tenants: s.tenants.filter((t) => t.id !== id) }));
  },

  // ── Payments ──────────────────────────────────────────────────────────
  addPayment: async (data) => {
    const { data: row, error } = await supabase
      .from('payments')
      .insert({
        tenant_id: data.tenantId,
        property_id: data.propertyId,
        amount: data.amount,
        date: data.date,
        method: data.method,
        reference: data.reference ?? null,
        notes: data.notes ?? null,
        status: data.status,
      })
      .select()
      .single();
    if (error) throw error;
    const item = toPayment(row);
    set((s) => ({ payments: [item, ...s.payments] }));
    return item;
  },

  // ── Late Fees ─────────────────────────────────────────────────────────
  addLateFee: async (data) => {
    const { data: row, error } = await supabase
      .from('late_fees')
      .insert({
        tenant_id: data.tenantId,
        property_id: data.propertyId,
        amount: data.amount,
        reason: data.reason,
        status: data.status,
        due_date: data.dueDate,
      })
      .select()
      .single();
    if (error) throw error;
    const item = toLateFee(row);
    set((s) => ({ lateFees: [item, ...s.lateFees] }));
    return item;
  },

  updateLateFee: async (id, data) => {
    const updates: Record<string, unknown> = {};
    if (data.status !== undefined) updates.status = data.status;
    if (data.waiverReason !== undefined) updates.waiver_reason = data.waiverReason;
    if (data.waivedBy !== undefined) updates.waived_by = data.waivedBy;
    if (data.waivedAt !== undefined) updates.waived_at = data.waivedAt;

    const { error } = await supabase.from('late_fees').update(updates).eq('id', id);
    if (error) throw error;
    set((s) => ({
      lateFees: s.lateFees.map((f) => (f.id === id ? { ...f, ...data } : f)),
    }));
  },

  // ── Maintenance Requests ──────────────────────────────────────────────
  addMaintenanceRequest: async (data) => {
    const { data: row, error } = await supabase
      .from('maintenance_requests')
      .insert({
        tenant_id: data.tenantId,
        property_id: data.propertyId,
        title: data.title,
        description: data.description,
        priority: data.priority,
        category: data.category,
        status: data.status,
        photos: data.photos ?? [],
        vendor_id: data.vendorId ?? null,
        submitted_date: data.submittedDate,
        assigned_date: data.assignedDate ?? null,
      })
      .select()
      .single();
    if (error) throw error;

    // Insert initial notes if any
    if (data.notes?.length) {
      await supabase.from('maintenance_notes').insert(
        data.notes.map((n) => ({
          request_id: row.id,
          text: n.text,
          author: n.author,
        }))
      );
    }

    const item: MaintenanceRequest = { ...toMaintenanceRequest(row), notes: data.notes ?? [] };
    set((s) => ({ maintenanceRequests: [item, ...s.maintenanceRequests] }));
    return item;
  },

  updateMaintenanceRequest: async (id, data) => {
    const updates: Record<string, unknown> = {};
    if (data.status !== undefined) updates.status = data.status;
    if (data.priority !== undefined) updates.priority = data.priority;
    if (data.vendorId !== undefined) updates.vendor_id = data.vendorId;
    if (data.assignedDate !== undefined) updates.assigned_date = data.assignedDate;
    if (data.completedDate !== undefined) updates.completed_date = data.completedDate;
    if (data.estimatedCost !== undefined) updates.estimated_cost = data.estimatedCost;
    if (data.actualCost !== undefined) updates.actual_cost = data.actualCost;
    if (data.photos !== undefined) updates.photos = data.photos;
    updates.updated_at = new Date().toISOString();

    const { error } = await supabase.from('maintenance_requests').update(updates).eq('id', id);
    if (error) throw error;

    // Handle adding new notes
    if (data.notes) {
      const existing = get().maintenanceRequests.find((r) => r.id === id);
      const existingCount = existing?.notes?.length ?? 0;
      const newNotes = data.notes.slice(existingCount);
      if (newNotes.length > 0) {
        await supabase.from('maintenance_notes').insert(
          newNotes.map((n) => ({
            request_id: id,
            text: n.text,
            author: n.author,
          }))
        );
      }
    }

    set((s) => ({
      maintenanceRequests: s.maintenanceRequests.map((r) =>
        r.id === id ? { ...r, ...data, updatedAt: updates.updated_at as string } : r
      ),
    }));
  },

  // ── Vendors ───────────────────────────────────────────────────────────
  addVendor: async (data) => {
    const { data: row, error } = await supabase
      .from('vendors')
      .insert({
        name: data.name,
        email: data.email,
        phone: data.phone,
        category: data.category,
        address: data.address ?? null,
        city: data.city ?? null,
        state: data.state ?? null,
        zip: data.zip ?? null,
        ein: data.ein ?? null,
        license_number: data.licenseNumber ?? null,
        status: data.status,
        notes: data.notes ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    const item = toVendor(row);
    set((s) => ({ vendors: [...s.vendors, item] }));
    return item;
  },

  updateVendor: async (id, data) => {
    const updates: Record<string, unknown> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.email !== undefined) updates.email = data.email;
    if (data.phone !== undefined) updates.phone = data.phone;
    if (data.category !== undefined) updates.category = data.category;
    if (data.address !== undefined) updates.address = data.address;
    if (data.city !== undefined) updates.city = data.city;
    if (data.state !== undefined) updates.state = data.state;
    if (data.zip !== undefined) updates.zip = data.zip;
    if (data.ein !== undefined) updates.ein = data.ein;
    if (data.licenseNumber !== undefined) updates.license_number = data.licenseNumber;
    if (data.status !== undefined) updates.status = data.status;
    if (data.notes !== undefined) updates.notes = data.notes;

    const { error } = await supabase.from('vendors').update(updates).eq('id', id);
    if (error) throw error;
    set((s) => ({
      vendors: s.vendors.map((v) => (v.id === id ? { ...v, ...data } : v)),
    }));
  },

  deleteVendor: async (id) => {
    const { error } = await supabase.from('vendors').delete().eq('id', id);
    if (error) throw error;
    set((s) => ({ vendors: s.vendors.filter((v) => v.id !== id) }));
  },

  // ── Owners ────────────────────────────────────────────────────────────
  addOwner: async (data) => {
    const { data: row, error } = await supabase
      .from('owners')
      .insert({
        name: data.name,
        email: data.email,
        phone: data.phone,
        company_name: data.companyName ?? null,
        address: data.address ?? null,
        city: data.city ?? null,
        state: data.state ?? null,
        zip: data.zip ?? null,
        tax_id: data.taxId ?? null,
        properties: data.properties ?? [],
        portal_enabled: data.portalEnabled,
        status: data.status,
        notes: data.notes ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    const item = toOwner(row);
    set((s) => ({ owners: [...s.owners, item] }));
    return item;
  },

  updateOwner: async (id, data) => {
    const updates: Record<string, unknown> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.email !== undefined) updates.email = data.email;
    if (data.phone !== undefined) updates.phone = data.phone;
    if (data.companyName !== undefined) updates.company_name = data.companyName;
    if (data.address !== undefined) updates.address = data.address;
    if (data.city !== undefined) updates.city = data.city;
    if (data.state !== undefined) updates.state = data.state;
    if (data.zip !== undefined) updates.zip = data.zip;
    if (data.taxId !== undefined) updates.tax_id = data.taxId;
    if (data.properties !== undefined) updates.properties = data.properties;
    if (data.portalEnabled !== undefined) updates.portal_enabled = data.portalEnabled;
    if (data.status !== undefined) updates.status = data.status;
    if (data.notes !== undefined) updates.notes = data.notes;

    const { error } = await supabase.from('owners').update(updates).eq('id', id);
    if (error) throw error;
    set((s) => ({
      owners: s.owners.map((o) => (o.id === id ? { ...o, ...data } : o)),
    }));
  },

  deleteOwner: async (id) => {
    const { error } = await supabase.from('owners').delete().eq('id', id);
    if (error) throw error;
    set((s) => ({ owners: s.owners.filter((o) => o.id !== id) }));
  },

  // ── Expenses ──────────────────────────────────────────────────────────
  addExpense: async (data) => {
    const { data: row, error } = await supabase
      .from('expenses')
      .insert({
        property_id: data.propertyId,
        vendor_id: data.vendorId ?? null,
        category: data.category,
        amount: data.amount,
        description: data.description,
        date: data.date,
        receipt_url: data.receiptUrl ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    const item = toExpense(row);
    set((s) => ({ expenses: [item, ...s.expenses] }));
    return item;
  },

  // ── Escrow ────────────────────────────────────────────────────────────
  addEscrowTransaction: async (data) => {
    const { data: row, error } = await supabase
      .from('escrow_transactions')
      .insert({
        tenant_id: data.tenantId,
        property_id: data.propertyId,
        type: data.type,
        amount: data.amount,
        description: data.description,
        reference: data.reference ?? null,
        approved_by: data.approvedBy,
      })
      .select()
      .single();
    if (error) throw error;
    const item = toEscrow(row);
    set((s) => ({ escrowTransactions: [item, ...s.escrowTransactions] }));
    return item;
  },

  // ── Documents ─────────────────────────────────────────────────────────
  addDocument: async (data) => {
    const { data: row, error } = await supabase
      .from('documents')
      .insert({
        property_id: data.propertyId ?? null,
        tenant_id: data.tenantId ?? null,
        type: data.type,
        name: data.name,
        url: data.url,
        size: data.size,
        mime_type: data.mimeType,
        description: data.description ?? null,
        uploaded_by: data.uploadedBy,
      })
      .select()
      .single();
    if (error) throw error;
    const item = toDocument(row);
    set((s) => ({ documents: [item, ...s.documents] }));
    return item;
  },

  deleteDocument: async (id) => {
    // Get the document URL to delete from storage too
    const doc = get().documents.find((d) => d.id === id);
    if (doc?.url) {
      const legacyPublicPrefix = '/storage/v1/object/public/documents/';
      const legacySignPrefix = '/storage/v1/object/sign/documents/';
      let storagePath = doc.url;

      if (doc.url.includes(legacyPublicPrefix)) {
        storagePath = doc.url.split(legacyPublicPrefix)[1]?.split('?')[0] ?? doc.url;
      } else if (doc.url.includes(legacySignPrefix)) {
        storagePath = doc.url.split(legacySignPrefix)[1]?.split('?')[0] ?? doc.url;
      }

      await supabase.storage.from('documents').remove([storagePath]);
    }
    const { error } = await supabase.from('documents').delete().eq('id', id);
    if (error) throw error;
    set((s) => ({ documents: s.documents.filter((d) => d.id !== id) }));
  },

  // ── Appliances ────────────────────────────────────────────────────────
  addAppliance: async (data) => {
    const { data: row, error } = await supabase
      .from('appliances')
      .insert({
        property_id: data.propertyId ?? null,
        name: data.name,
        category: data.category,
        brand: data.brand,
        model: data.model ?? null,
        serial_number: data.serialNumber ?? null,
        purchase_date: data.purchaseDate ?? null,
        warranty_expiry: data.warrantyExpiry ?? null,
        status: data.status,
        notes: data.notes ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    const item = toAppliance(row);
    set((s) => ({ appliances: [item, ...s.appliances] }));
    return item;
  },

  updateAppliance: async (id, data) => {
    const updates: Record<string, unknown> = {};
    if (data.propertyId !== undefined) updates.property_id = data.propertyId ?? null;
    if (data.name !== undefined) updates.name = data.name;
    if (data.category !== undefined) updates.category = data.category;
    if (data.brand !== undefined) updates.brand = data.brand;
    if (data.model !== undefined) updates.model = data.model ?? null;
    if (data.serialNumber !== undefined) updates.serial_number = data.serialNumber ?? null;
    if (data.purchaseDate !== undefined) updates.purchase_date = data.purchaseDate ?? null;
    if (data.warrantyExpiry !== undefined) updates.warranty_expiry = data.warrantyExpiry ?? null;
    if (data.status !== undefined) updates.status = data.status;
    if (data.notes !== undefined) updates.notes = data.notes ?? null;
    updates.updated_at = new Date().toISOString();

    const { error } = await supabase.from('appliances').update(updates).eq('id', id);
    if (error) throw error;
    set((s) => ({
      appliances: s.appliances.map((a) =>
        a.id === id ? { ...a, ...data, updatedAt: updates.updated_at as string } : a
      ),
    }));
  },

  deleteAppliance: async (id) => {
    const { error } = await supabase.from('appliances').delete().eq('id', id);
    if (error) throw error;
    set((s) => ({ appliances: s.appliances.filter((a) => a.id !== id) }));
  },

  // ── Generate Late Fees ────────────────────────────────────────────────
  generateLateFees: async (currentUser) => {
    const state = get();
    const today = new Date();
    const generated: LateFee[] = [];

    for (const property of state.properties) {
      const tenants = state.tenants.filter((t) => t.propertyId === property.id && t.status === 'active');
      for (const tenant of tenants) {
        const dueDate = new Date(today.getFullYear(), today.getMonth(), property.rentDueDay);
        const graceDate = new Date(dueDate);
        graceDate.setDate(graceDate.getDate() + property.gracePeriodDays);

        if (today <= graceDate) continue;

        const paid = state.payments.some((p) => {
          const pDate = new Date(p.date);
          return (
            p.tenantId === tenant.id &&
            pDate.getMonth() === today.getMonth() &&
            pDate.getFullYear() === today.getFullYear() &&
            p.status === 'completed'
          );
        });
        if (paid) continue;

        const feeExists = state.lateFees.some((f) => {
          const fDate = new Date(f.createdAt);
          return (
            f.tenantId === tenant.id &&
            fDate.getMonth() === today.getMonth() &&
            fDate.getFullYear() === today.getFullYear() &&
            f.status !== 'waived'
          );
        });
        if (feeExists) continue;

        let feeAmount = property.lateFeeAmount;
        if (property.lateFeeType === 'percentage') {
          feeAmount = (tenant.rentAmount * property.lateFeeAmount) / 100;
        }

        try {
          const fee = await state.addLateFee({
            tenantId: tenant.id,
            propertyId: property.id,
            amount: feeAmount,
            reason: `Late rent - ${today.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
            status: 'active',
            dueDate: graceDate.toISOString().split('T')[0],
          });
          generated.push(fee);
        } catch (err) {
          console.error('Failed to generate late fee:', err);
        }
      }
    }

    void currentUser;
    return generated;
  },
}));
