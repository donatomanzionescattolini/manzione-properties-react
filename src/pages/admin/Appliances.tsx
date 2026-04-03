import { useState, useMemo } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  Edit2,
  Trash2,
  Tv2,
  Search,
  X,
  Building2,
} from 'lucide-react';
import { useDataStore } from '../../store/dataStore';
import { PageHeader } from '../../components/layout/PageHeader';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { toast } from '../../components/ui/toastStore';
import type { Appliance, ApplianceCategory, ApplianceStatus } from '../../types';

// ── Constants ──────────────────────────────────────────────────────────────

const CATEGORIES: { value: ApplianceCategory; label: string }[] = [
  { value: 'refrigerator', label: 'Refrigerator' },
  { value: 'stove', label: 'Stove' },
  { value: 'oven', label: 'Oven' },
  { value: 'dishwasher', label: 'Dishwasher' },
  { value: 'washing-machine', label: 'Washing Machine' },
  { value: 'dryer', label: 'Dryer' },
  { value: 'microwave', label: 'Microwave' },
  { value: 'air-conditioner', label: 'Air Conditioner' },
  { value: 'water-heater', label: 'Water Heater' },
  { value: 'garbage-disposal', label: 'Garbage Disposal' },
  { value: 'other', label: 'Other' },
];

const STATUSES: { value: ApplianceStatus; label: string }[] = [
  { value: 'working', label: 'Working' },
  { value: 'needs-repair', label: 'Needs Repair' },
  { value: 'out-of-service', label: 'Out of Service' },
  { value: 'replaced', label: 'Replaced' },
];

const statusBadge: Record<ApplianceStatus, string> = {
  working: 'badge-green',
  'needs-repair': 'badge-yellow',
  'out-of-service': 'badge-red',
  replaced: 'badge-gray',
};

// ── Form schema ────────────────────────────────────────────────────────────

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.enum([
    'refrigerator', 'stove', 'oven', 'dishwasher', 'washing-machine',
    'dryer', 'microwave', 'air-conditioner', 'water-heater', 'garbage-disposal', 'other',
  ]),
  brand: z.string().min(1, 'Brand is required'),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  purchaseDate: z.string().optional(),
  warrantyExpiry: z.string().optional(),
  propertyId: z.string().optional(),
  status: z.enum(['working', 'needs-repair', 'out-of-service', 'replaced']),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

// ── Component ──────────────────────────────────────────────────────────────

export function Appliances() {
  const { appliances, properties, addAppliance, updateAppliance, deleteAppliance } = useDataStore();

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Appliance | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Appliance | null>(null);

  // Search / filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterProperty, setFilterProperty] = useState<string>('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<FormData>({ resolver: zodResolver(schema) as any });

  // ── Filtered list ──────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return appliances.filter((a) => {
      if (filterCategory && a.category !== filterCategory) return false;
      if (filterStatus && a.status !== filterStatus) return false;
      if (filterProperty && a.propertyId !== filterProperty) return false;
      if (q) {
        const haystack = [
          a.name,
          a.brand,
          a.model ?? '',
          a.serialNumber ?? '',
          a.notes ?? '',
          CATEGORIES.find((c) => c.value === a.category)?.label ?? '',
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [appliances, searchQuery, filterCategory, filterStatus, filterProperty]);

  // ── Helpers ────────────────────────────────────────────────────────────

  const getPropertyLabel = (id?: string) => {
    if (!id) return <span className="text-gray-400 italic text-xs">Unassigned</span>;
    const p = properties.find((p) => p.id === id);
    return p ? `${p.address}, ${p.city}` : '-';
  };

  const getCategoryLabel = (v: ApplianceCategory) =>
    CATEGORIES.find((c) => c.value === v)?.label ?? v;

  const getStatusLabel = (v: ApplianceStatus) =>
    STATUSES.find((s) => s.value === v)?.label ?? v;

  // ── Open add / edit ────────────────────────────────────────────────────

  const openAdd = () => {
    setEditTarget(null);
    reset({
      name: '',
      category: 'refrigerator',
      brand: '',
      model: '',
      serialNumber: '',
      purchaseDate: '',
      warrantyExpiry: '',
      propertyId: '',
      status: 'working',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const openEdit = (a: Appliance) => {
    setEditTarget(a);
    reset({
      name: a.name,
      category: a.category,
      brand: a.brand,
      model: a.model ?? '',
      serialNumber: a.serialNumber ?? '',
      purchaseDate: a.purchaseDate ?? '',
      warrantyExpiry: a.warrantyExpiry ?? '',
      propertyId: a.propertyId ?? '',
      status: a.status,
      notes: a.notes ?? '',
    });
    setIsModalOpen(true);
  };

  // ── Submit ─────────────────────────────────────────────────────────────

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      const payload = {
        ...data,
        propertyId: data.propertyId || undefined,
        model: data.model || undefined,
        serialNumber: data.serialNumber || undefined,
        purchaseDate: data.purchaseDate || undefined,
        warrantyExpiry: data.warrantyExpiry || undefined,
        notes: data.notes || undefined,
      };

      if (editTarget) {
        await updateAppliance(editTarget.id, payload);
        toast.success('Appliance updated');
      } else {
        await addAppliance(payload);
        toast.success('Appliance added');
      }
      setIsModalOpen(false);
    } catch {
      toast.error('Failed to save appliance');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteAppliance(deleteTarget.id);
      toast.success('Appliance deleted');
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to delete appliance');
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterCategory('');
    setFilterStatus('');
    setFilterProperty('');
  };

  const hasFilters = searchQuery || filterCategory || filterStatus || filterProperty;

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div>
      <PageHeader
        title="Appliances"
        subtitle={`${appliances.length} appliance${appliances.length !== 1 ? 's' : ''} total`}
        actions={
          <button onClick={openAdd} className="btn-primary">
            <Plus size={16} /> Add Appliance
          </button>
        }
      />

      {/* ── Search & Filters ── */}
      <div className="page-card mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Full-text search */}
          <div className="flex-1 min-w-[200px]">
            <label className="label">Search</label>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Name, brand, model, serial…"
                className="input-field pl-9"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Category filter */}
          <div className="min-w-[160px]">
            <label className="label">Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="input-field"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div className="min-w-[150px]">
            <label className="label">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input-field"
            >
              <option value="">All Statuses</option>
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Property filter */}
          <div className="min-w-[180px]">
            <label className="label">Property</label>
            <select
              value={filterProperty}
              onChange={(e) => setFilterProperty(e.target.value)}
              className="input-field"
            >
              <option value="">All Properties</option>
              <option value="__unassigned__">Unassigned</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.address}, {p.city}</option>
              ))}
            </select>
          </div>

          {/* Clear button */}
          {hasFilters && (
            <button onClick={clearFilters} className="btn-outline self-end flex items-center gap-1">
              <X size={14} /> Clear
            </button>
          )}
        </div>

        {/* Result count */}
        {hasFilters && (
          <p className="text-sm text-gray-500 mt-3">
            Showing <strong>{filtered.length}</strong> of {appliances.length} appliances
          </p>
        )}
      </div>

      {/* ── Table ── */}
      <div className="page-card overflow-x-auto">
        {appliances.length === 0 ? (
          <EmptyState
            icon={<Tv2 />}
            title="No appliances yet"
            description="Add your first household appliance to get started"
            action={
              <button onClick={openAdd} className="btn-primary">
                <Plus size={16} /> Add Appliance
              </button>
            }
          />
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            <Search size={32} className="mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No appliances match your search</p>
            <button onClick={clearFilters} className="mt-3 text-sm text-blue-600 hover:underline">
              Clear filters
            </button>
          </div>
        ) : (
          <table className="w-full min-w-[900px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">Name</th>
                <th className="table-th">Category</th>
                <th className="table-th">Brand / Model</th>
                <th className="table-th">Serial #</th>
                <th className="table-th">Status</th>
                <th className="table-th">Property</th>
                <th className="table-th">Purchase Date</th>
                <th className="table-th">Warranty</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="table-td font-medium">{a.name}</td>
                  <td className="table-td">{getCategoryLabel(a.category)}</td>
                  <td className="table-td">
                    <span className="font-medium">{a.brand}</span>
                    {a.model && <span className="text-gray-400 text-xs ml-1">· {a.model}</span>}
                  </td>
                  <td className="table-td text-gray-500 text-sm">{a.serialNumber ?? '-'}</td>
                  <td className="table-td">
                    <span className={statusBadge[a.status]}>
                      {getStatusLabel(a.status)}
                    </span>
                  </td>
                  <td className="table-td">
                    <div className="flex items-center gap-1.5">
                      {a.propertyId ? (
                        <>
                          <Building2 size={13} className="text-gray-400 flex-shrink-0" />
                          <span className="text-sm">{getPropertyLabel(a.propertyId)}</span>
                        </>
                      ) : (
                        <span className="text-gray-400 italic text-xs">Unassigned</span>
                      )}
                    </div>
                  </td>
                  <td className="table-td text-sm">
                    {a.purchaseDate
                      ? new Date(a.purchaseDate).toLocaleDateString()
                      : '-'}
                  </td>
                  <td className="table-td text-sm">
                    {a.warrantyExpiry
                      ? new Date(a.warrantyExpiry).toLocaleDateString()
                      : '-'}
                  </td>
                  <td className="table-td">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(a)}
                        className="btn btn-ghost btn-sm p-1.5"
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(a)}
                        className="btn btn-sm p-1.5 text-red-500 hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Add / Edit Modal ── */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editTarget ? 'Edit Appliance' : 'Add Appliance'}
        size="lg"
        footer={
          <>
            <button onClick={() => setIsModalOpen(false)} className="btn-outline">
              Cancel
            </button>
            <button
              onClick={handleSubmit(onSubmit)}
              className="btn-primary"
            >
              {editTarget ? 'Save Changes' : 'Add Appliance'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          {/* Name */}
          <div className="col-span-2">
            <label className="label">Name *</label>
            <input
              {...register('name')}
              className="input-field"
              placeholder="e.g. Kitchen Refrigerator"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>

          {/* Category */}
          <div>
            <label className="label">Category *</label>
            <select {...register('category')} className="input-field">
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="label">Status *</label>
            <select {...register('status')} className="input-field">
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Brand */}
          <div>
            <label className="label">Brand *</label>
            <input
              {...register('brand')}
              className="input-field"
              placeholder="e.g. Samsung, Whirlpool"
            />
            {errors.brand && <p className="text-red-500 text-xs mt-1">{errors.brand.message}</p>}
          </div>

          {/* Model */}
          <div>
            <label className="label">Model</label>
            <input
              {...register('model')}
              className="input-field"
              placeholder="e.g. RF28R7351SR"
            />
          </div>

          {/* Serial Number */}
          <div>
            <label className="label">Serial Number</label>
            <input
              {...register('serialNumber')}
              className="input-field"
              placeholder="e.g. SN1234567890"
            />
          </div>

          {/* Assign to Property */}
          <div>
            <label className="label">Assign to Property</label>
            <select {...register('propertyId')} className="input-field">
              <option value="">— Unassigned —</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.address}, {p.city}
                </option>
              ))}
            </select>
          </div>

          {/* Purchase Date */}
          <div>
            <label className="label">Purchase Date</label>
            <input {...register('purchaseDate')} type="date" className="input-field" />
          </div>

          {/* Warranty Expiry */}
          <div>
            <label className="label">Warranty Expiry</label>
            <input {...register('warrantyExpiry')} type="date" className="input-field" />
          </div>

          {/* Notes */}
          <div className="col-span-2">
            <label className="label">Notes</label>
            <textarea
              {...register('notes')}
              rows={3}
              className="input-field resize-none"
              placeholder="Any additional notes…"
            />
          </div>
        </div>
      </Modal>

      {/* ── Delete Confirm ── */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Appliance"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete Appliance"
      />
    </div>
  );
}

