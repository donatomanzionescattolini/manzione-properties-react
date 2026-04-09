import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Edit2, Trash2, Wrench } from 'lucide-react';
import { useDataStore } from '../../store/dataStore';
import { PageHeader } from '../../components/layout/PageHeader';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { toast } from '../../components/ui/toastStore';
import type { Vendor } from '../../types';

const vendorSchema = z.object({
  name: z.string().min(1, 'Name required'),
  email: z.string().email('Valid email required'),
  phone: z.string().min(1, 'Phone required'),
  category: z.enum(['plumber', 'electrician', 'hvac', 'painter', 'contractor', 'landscaper', 'cleaning', 'locksmith', 'other']),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  ein: z.string().optional(),
  licenseNumber: z.string().optional(),
  status: z.enum(['active', 'inactive']),
  notes: z.string().optional(),
});

type VendorForm = z.infer<typeof vendorSchema>;

const CATEGORIES = [
  { value: 'plumber', label: 'Plumber' },
  { value: 'electrician', label: 'Electrician' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'painter', label: 'Painter' },
  { value: 'contractor', label: 'Contractor' },
  { value: 'landscaper', label: 'Landscaper' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'locksmith', label: 'Locksmith' },
  { value: 'other', label: 'Other' },
] as const;

export function Vendors() {
  const { vendors, addVendor, updateVendor, deleteVendor } = useDataStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Vendor | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null);
  const [viewTarget, setViewTarget] = useState<Vendor | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VendorForm>({ resolver: zodResolver(vendorSchema) });

  const filtered = vendors.filter((v) => {
    if (filterStatus && v.status !== filterStatus) return false;
    if (filterCategory && v.category !== filterCategory) return false;
    return true;
  });

  const openAdd = () => {
    setEditTarget(null);
    reset({ name: '', email: '', phone: '', category: 'other', status: 'active' });
    setIsModalOpen(true);
  };

  const openEdit = (v: Vendor) => {
    setEditTarget(v);
    reset({
      name: v.name,
      email: v.email,
      phone: v.phone,
      category: v.category,
      address: v.address ?? '',
      city: v.city ?? '',
      state: v.state ?? '',
      zip: v.zip ?? '',
      ein: v.ein ?? '',
      licenseNumber: v.licenseNumber ?? '',
      status: v.status,
      notes: v.notes ?? '',
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: VendorForm) => {
    const payload: Omit<Vendor, 'id' | 'createdAt'> = {
      name: data.name,
      email: data.email,
      phone: data.phone,
      category: data.category,
      address: data.address || undefined,
      city: data.city || undefined,
      state: data.state || undefined,
      zip: data.zip || undefined,
      ein: data.ein || undefined,
      licenseNumber: data.licenseNumber || undefined,
      status: data.status,
      notes: data.notes || undefined,
    };
    try {
      if (editTarget) {
        await updateVendor(editTarget.id, payload);
        toast.success('Vendor updated');
      } else {
        await addVendor(payload);
        toast.success('Vendor added');
      }
      setIsModalOpen(false);
    } catch {
      toast.error('Failed to save vendor');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteVendor(deleteTarget.id);
      toast.success('Vendor deleted');
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to delete vendor');
    }
  };

  const getCategoryLabel = (val: string) =>
    CATEGORIES.find((c) => c.value === val)?.label ?? val;

  return (
    <div>
      <PageHeader
        title="Vendors"
        subtitle={`${vendors.length} vendor${vendors.length !== 1 ? 's' : ''}`}
        actions={
          <button onClick={openAdd} className="btn-primary">
            <Plus size={16} /> Add Vendor
          </button>
        }
      />

      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="input-field w-40"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="input-field w-48"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="page-card">
          <EmptyState
            icon={<Wrench />}
            title="No vendors"
            description={filterStatus || filterCategory ? 'No vendors match your filters' : 'Add your first vendor'}
            action={
              !filterStatus && !filterCategory ? (
                <button onClick={openAdd} className="btn-primary">
                  <Plus size={16} /> Add Vendor
                </button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="page-card overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">Name</th>
                <th className="table-th">Category</th>
                <th className="table-th">Email</th>
                <th className="table-th">Phone</th>
                <th className="table-th">Location</th>
                <th className="table-th">License #</th>
                <th className="table-th">Status</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr
                  key={v.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => setViewTarget(v)}
                >
                  <td className="table-td font-medium">{v.name}</td>
                  <td className="table-td">{getCategoryLabel(v.category)}</td>
                  <td className="table-td text-gray-500">{v.email}</td>
                  <td className="table-td">{v.phone}</td>
                  <td className="table-td">{[v.city, v.state].filter(Boolean).join(', ') || '—'}</td>
                  <td className="table-td text-gray-500">{v.licenseNumber ?? '—'}</td>
                  <td className="table-td">
                    <span className={v.status === 'active' ? 'badge-green' : 'badge-gray'}>{v.status}</span>
                  </td>
                  <td className="table-td" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(v)} className="btn btn-ghost btn-sm p-1.5" title="Edit">
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => setDeleteTarget(v)} className="btn btn-ghost btn-sm p-1.5 text-red-500" title="Delete">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* View Details Modal */}
      <Modal isOpen={!!viewTarget} onClose={() => setViewTarget(null)} title="Vendor Details" size="lg">
        {viewTarget && (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-800">{viewTarget.name}</h3>
              </div>
              <div className="flex gap-2">
                <span className="badge-blue">{getCategoryLabel(viewTarget.category)}</span>
                <span className={viewTarget.status === 'active' ? 'badge-green' : 'badge-gray'}>{viewTarget.status}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-500 font-medium">Email</p>
                <p>{viewTarget.email}</p>
              </div>
              <div>
                <p className="text-gray-500 font-medium">Phone</p>
                <p>{viewTarget.phone}</p>
              </div>
              {viewTarget.licenseNumber && (
                <div>
                  <p className="text-gray-500 font-medium">License #</p>
                  <p>{viewTarget.licenseNumber}</p>
                </div>
              )}
              {viewTarget.ein && (
                <div>
                  <p className="text-gray-500 font-medium">EIN</p>
                  <p>{viewTarget.ein}</p>
                </div>
              )}
              {(viewTarget.address || viewTarget.city || viewTarget.state) && (
                <div className="col-span-2">
                  <p className="text-gray-500 font-medium">Address</p>
                  <p>{[viewTarget.address, viewTarget.city, viewTarget.state, viewTarget.zip].filter(Boolean).join(', ')}</p>
                </div>
              )}
            </div>

            {viewTarget.notes && (
              <div>
                <p className="text-gray-500 font-medium text-sm mb-1">Notes</p>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{viewTarget.notes}</p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button onClick={() => { openEdit(viewTarget); setViewTarget(null); }} className="btn-primary btn-sm">Edit</button>
              <button onClick={() => { setDeleteTarget(viewTarget); setViewTarget(null); }} className="btn-outline btn-sm text-red-600">Delete</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editTarget ? 'Edit Vendor' : 'Add Vendor'}
        size="lg"
        footer={
          <>
            <button onClick={() => setIsModalOpen(false)} className="btn-outline">Cancel</button>
            <button onClick={handleSubmit(onSubmit)} className="btn-primary">
              {editTarget ? 'Save Changes' : 'Add Vendor'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Name</label>
            <input {...register('name')} className="input-field" placeholder="Joe's Plumbing" />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="label">Category</label>
            <select {...register('category')} className="input-field">
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Email</label>
            <input {...register('email')} type="email" className="input-field" placeholder="email@example.com" />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="label">Phone</label>
            <input {...register('phone')} className="input-field" placeholder="(215) 555-0000" />
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
          </div>
          <div>
            <label className="label">License # (optional)</label>
            <input {...register('licenseNumber')} className="input-field" placeholder="License number" />
          </div>
          <div>
            <label className="label">EIN (optional)</label>
            <input {...register('ein')} className="input-field" placeholder="12-3456789" />
          </div>
          <div className="col-span-2">
            <label className="label">Address (optional)</label>
            <input {...register('address')} className="input-field" placeholder="Street address" />
          </div>
          <div>
            <label className="label">City</label>
            <input {...register('city')} className="input-field" placeholder="City" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">State</label>
              <input {...register('state')} className="input-field" placeholder="FL" />
            </div>
            <div>
              <label className="label">ZIP</label>
              <input {...register('zip')} className="input-field" placeholder="00000" />
            </div>
          </div>
          <div>
            <label className="label">Status</label>
            <select {...register('status')} className="input-field">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="label">Notes (optional)</label>
            <textarea {...register('notes')} className="input-field" rows={3} placeholder="Additional notes..." />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Vendor"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
