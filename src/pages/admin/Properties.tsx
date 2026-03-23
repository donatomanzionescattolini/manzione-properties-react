import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Edit2, Trash2, Building2 } from 'lucide-react';
import { useDataStore } from '../../store/dataStore';
import { PageHeader } from '../../components/layout/PageHeader';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { toast } from '../../components/ui/Toast';
import type { Property } from '../../types';

const schema = z.object({
  address: z.string().min(1, 'Address required'),
  city: z.string().min(1, 'City required'),
  state: z.string().min(1, 'State required'),
  zip: z.string().min(1, 'ZIP required'),
  unitCount: z.coerce.number().min(1, 'At least 1 unit'),
  rentAmount: z.coerce.number().min(1, 'Rent amount required'),
  rentDueDay: z.coerce.number().min(1).max(28),
  lateFeeType: z.enum(['fixed', 'percentage']),
  lateFeeAmount: z.coerce.number().min(0),
  gracePeriodDays: z.coerce.number().min(0),
  ownerId: z.string().optional(),
  status: z.enum(['active', 'inactive', 'vacant']),
});

type FormData = z.infer<typeof schema>;

export function Properties() {
  const { properties, owners, addProperty, updateProperty, deleteProperty } = useDataStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Property | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Property | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<FormData>({ resolver: zodResolver(schema) as any });

  const openAdd = () => {
    setEditTarget(null);
    reset({
      address: '',
      city: '',
      state: '',
      zip: '',
      unitCount: 1,
      rentAmount: 0,
      rentDueDay: 1,
      lateFeeType: 'fixed',
      lateFeeAmount: 75,
      gracePeriodDays: 5,
      ownerId: '',
      status: 'active',
    });
    setIsModalOpen(true);
  };

  const openEdit = (p: Property) => {
    setEditTarget(p);
    reset({
      address: p.address,
      city: p.city,
      state: p.state,
      zip: p.zip,
      unitCount: p.unitCount,
      rentAmount: p.rentAmount,
      rentDueDay: p.rentDueDay,
      lateFeeType: p.lateFeeType,
      lateFeeAmount: p.lateFeeAmount,
      gracePeriodDays: p.gracePeriodDays,
      ownerId: p.ownerId ?? '',
      status: p.status,
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: FormData) => {
    try {
      if (editTarget) {
        await updateProperty(editTarget.id, { ...data, ownerId: data.ownerId || undefined });
        toast.success('Property updated successfully');
      } else {
        await addProperty({ ...data, ownerId: data.ownerId || undefined });
        toast.success('Property added successfully');
      }
      setIsModalOpen(false);
    } catch {
      toast.error('Failed to save property');
    }
  };

  const handleDelete = async () => {
    if (deleteTarget) {
      try {
        await deleteProperty(deleteTarget.id);
        toast.success('Property deleted');
        setDeleteTarget(null);
      } catch {
        toast.error('Failed to delete property');
      }
    }
  };

  const getOwnerName = (ownerId?: string) => {
    if (!ownerId) return '-';
    const owner = owners.find((o) => o.id === ownerId);
    return owner?.name ?? '-';
  };

  const statusBadge: Record<string, string> = {
    active: 'badge-green',
    inactive: 'badge-gray',
    vacant: 'badge-yellow',
  };

  return (
    <div>
      <PageHeader
        title="Properties"
        subtitle={`${properties.length} properties total`}
        actions={
          <button onClick={openAdd} className="btn-primary">
            <Plus size={16} /> Add Property
          </button>
        }
      />

      <div className="page-card overflow-x-auto">
        {properties.length === 0 ? (
          <EmptyState
            icon={<Building2 />}
            title="No properties yet"
            description="Add your first property to get started"
            action={
              <button onClick={openAdd} className="btn-primary">
                <Plus size={16} /> Add Property
              </button>
            }
          />
        ) : (
          <table className="w-full min-w-[900px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">Address</th>
                <th className="table-th">City / State</th>
                <th className="table-th">Units</th>
                <th className="table-th">Rent</th>
                <th className="table-th">Due Day</th>
                <th className="table-th">Late Fee</th>
                <th className="table-th">Grace</th>
                <th className="table-th">Owner</th>
                <th className="table-th">Status</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {properties.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="table-td font-medium">{p.address}</td>
                  <td className="table-td">{p.city}, {p.state} {p.zip}</td>
                  <td className="table-td">{p.unitCount}</td>
                  <td className="table-td font-semibold">${p.rentAmount.toLocaleString()}</td>
                  <td className="table-td">Day {p.rentDueDay}</td>
                  <td className="table-td">
                    {p.lateFeeType === 'fixed'
                      ? `$${p.lateFeeAmount}`
                      : `${p.lateFeeAmount}%`}
                  </td>
                  <td className="table-td">{p.gracePeriodDays} days</td>
                  <td className="table-td">{getOwnerName(p.ownerId)}</td>
                  <td className="table-td">
                    <span className={statusBadge[p.status] || 'badge-gray'}>{p.status}</span>
                  </td>
                  <td className="table-td">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(p)}
                        className="btn btn-ghost btn-sm p-1.5"
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(p)}
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

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editTarget ? 'Edit Property' : 'Add Property'}
        size="lg"
        footer={
          <>
            <button onClick={() => setIsModalOpen(false)} className="btn-outline">
              Cancel
            </button>
            <button onClick={handleSubmit(onSubmit as SubmitHandler<FormData>)} className="btn-primary">
              {editTarget ? 'Save Changes' : 'Add Property'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">Street Address</label>
            <input {...register('address')} className="input-field" placeholder="123 Main Street" />
            {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>}
          </div>
          <div>
            <label className="label">City</label>
            <input {...register('city')} className="input-field" placeholder="Philadelphia" />
            {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city.message}</p>}
          </div>
          <div>
            <label className="label">State</label>
            <input {...register('state')} className="input-field" placeholder="PA" />
            {errors.state && <p className="text-red-500 text-xs mt-1">{errors.state.message}</p>}
          </div>
          <div>
            <label className="label">ZIP Code</label>
            <input {...register('zip')} className="input-field" placeholder="19103" />
            {errors.zip && <p className="text-red-500 text-xs mt-1">{errors.zip.message}</p>}
          </div>
          <div>
            <label className="label">Unit Count</label>
            <input {...register('unitCount')} type="number" className="input-field" min={1} />
            {errors.unitCount && <p className="text-red-500 text-xs mt-1">{errors.unitCount.message}</p>}
          </div>
          <div>
            <label className="label">Monthly Rent ($)</label>
            <input {...register('rentAmount')} type="number" className="input-field" min={0} />
            {errors.rentAmount && <p className="text-red-500 text-xs mt-1">{errors.rentAmount.message}</p>}
          </div>
          <div>
            <label className="label">Rent Due Day (1-28)</label>
            <input {...register('rentDueDay')} type="number" className="input-field" min={1} max={28} />
            {errors.rentDueDay && <p className="text-red-500 text-xs mt-1">{errors.rentDueDay.message}</p>}
          </div>
          <div>
            <label className="label">Late Fee Type</label>
            <select {...register('lateFeeType')} className="input-field">
              <option value="fixed">Fixed Amount</option>
              <option value="percentage">Percentage</option>
            </select>
          </div>
          <div>
            <label className="label">Late Fee Amount</label>
            <input {...register('lateFeeAmount')} type="number" className="input-field" min={0} />
            {errors.lateFeeAmount && <p className="text-red-500 text-xs mt-1">{errors.lateFeeAmount.message}</p>}
          </div>
          <div>
            <label className="label">Grace Period (days)</label>
            <input {...register('gracePeriodDays')} type="number" className="input-field" min={0} />
            {errors.gracePeriodDays && <p className="text-red-500 text-xs mt-1">{errors.gracePeriodDays.message}</p>}
          </div>
          <div>
            <label className="label">Owner</label>
            <select {...register('ownerId')} className="input-field">
              <option value="">No Owner</option>
              {owners.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select {...register('status')} className="input-field">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="vacant">Vacant</option>
            </select>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Property"
        message={`Are you sure you want to delete "${deleteTarget?.address}"? This action cannot be undone.`}
        confirmLabel="Delete Property"
      />
    </div>
  );
}
