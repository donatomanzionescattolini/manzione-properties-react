import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Edit2, Trash2, Users, Eye, Mail } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { useDataStore } from '../../store/dataStore';
import { PageHeader } from '../../components/layout/PageHeader';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { toast } from '../../components/ui/toastStore';
import type { Tenant } from '../../types';

const schema = z.object({
  firstName: z.string().min(1, 'First name required'),
  lastName: z.string().min(1, 'Last name required'),
  email: z.string().email('Valid email required'),
  phone: z.string().min(1, 'Phone required'),
  propertyId: z.string().min(1, 'Property required'),
  leaseStartDate: z.string().min(1, 'Lease start date required'),
  leaseEndDate: z.string().min(1, 'Lease end date required'),
  rentAmount: z.coerce.number().min(1, 'Rent amount required'),
  securityDeposit: z.coerce.number().min(0),
  status: z.enum(['active', 'inactive', 'evicted']),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function Tenants() {
  const { tenants, properties, addTenant, updateTenant, deleteTenant } = useDataStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Tenant | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Tenant | null>(null);
  const [viewTarget, setViewTarget] = useState<Tenant | null>(null);

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
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      propertyId: '',
      leaseStartDate: '',
      leaseEndDate: '',
      rentAmount: 0,
      securityDeposit: 0,
      status: 'active',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const openEdit = (t: Tenant) => {
    setEditTarget(t);
    reset({
      firstName: t.firstName,
      lastName: t.lastName,
      email: t.email,
      phone: t.phone,
      propertyId: t.propertyId,
      leaseStartDate: t.leaseStartDate,
      leaseEndDate: t.leaseEndDate,
      rentAmount: t.rentAmount,
      securityDeposit: t.securityDeposit,
      status: t.status,
      notes: t.notes ?? '',
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: FormData) => {
    try {
      if (editTarget) {
        await updateTenant(editTarget.id, data);
        toast.success('Tenant updated successfully');
      } else {
        await addTenant(data);
        toast.success('Tenant added successfully');
      }
      setIsModalOpen(false);
    } catch {
      toast.error('Failed to save tenant');
    }
  };

  const handleDelete = async () => {
    if (deleteTarget) {
      try {
        await deleteTenant(deleteTarget.id);
        toast.success('Tenant deleted');
        setDeleteTarget(null);
      } catch {
        toast.error('Failed to delete tenant');
      }
    }
  };

  const handleInvite = async (t: Tenant) => {
    const property = properties.find((p) => p.id === t.propertyId);
    try {
      const { error } = await supabase.functions.invoke('create-tenant-account', {
        body: {
          tenantId: t.id,
          email: t.email,
          name: `${t.firstName} ${t.lastName}`,
          propertyAddress: property ? `${property.address}, ${property.city}` : undefined,
          portalUrl: window.location.origin,
        },
      });
      if (error) throw error;
      toast.success(`Invitation sent to ${t.email}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send invitation';
      toast.error(msg);
    }
  };

  const getPropertyAddress = (propertyId: string) => {
    const p = properties.find((x) => x.id === propertyId);
    return p ? `${p.address}, ${p.city}` : 'Unknown';
  };

  const statusBadge: Record<string, string> = {
    active: 'badge-green',
    inactive: 'badge-gray',
    evicted: 'badge-red',
  };

  return (
    <div>
      <PageHeader
        title="Tenants"
        subtitle={`${tenants.length} tenants total`}
        actions={
          <button onClick={openAdd} className="btn-primary">
            <Plus size={16} /> Add Tenant
          </button>
        }
      />

      <div className="page-card overflow-x-auto">
        {tenants.length === 0 ? (
          <EmptyState
            icon={<Users />}
            title="No tenants yet"
            description="Add your first tenant to get started"
            action={
              <button onClick={openAdd} className="btn-primary">
                <Plus size={16} /> Add Tenant
              </button>
            }
          />
        ) : (
          <table className="w-full min-w-[900px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">Name</th>
                <th className="table-th">Email</th>
                <th className="table-th">Phone</th>
                <th className="table-th">Property</th>
                <th className="table-th">Rent</th>
                <th className="table-th">Lease End</th>
                <th className="table-th">Status</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="table-td font-medium">{t.firstName} {t.lastName}</td>
                  <td className="table-td text-gray-500">{t.email}</td>
                  <td className="table-td">{t.phone}</td>
                  <td className="table-td">{getPropertyAddress(t.propertyId)}</td>
                  <td className="table-td font-semibold">${t.rentAmount.toLocaleString()}</td>
                  <td className="table-td">{format(new Date(t.leaseEndDate), 'MMM d, yyyy')}</td>
                  <td className="table-td">
                    <span className={statusBadge[t.status] || 'badge-gray'}>{t.status}</span>
                  </td>
                  <td className="table-td">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setViewTarget(t)}
                        className="btn btn-ghost btn-sm p-1.5"
                        title="View"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => openEdit(t)}
                        className="btn btn-ghost btn-sm p-1.5"
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleInvite(t)}
                        className="btn btn-ghost btn-sm p-1.5 text-blue-500 hover:bg-blue-50"
                        title="Invite to Portal"
                      >
                        <Mail size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(t)}
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
        title={editTarget ? 'Edit Tenant' : 'Add Tenant'}
        size="lg"
        footer={
          <>
            <button onClick={() => setIsModalOpen(false)} className="btn-outline">
              Cancel
            </button>
            <button onClick={handleSubmit(onSubmit as SubmitHandler<FormData>)} className="btn-primary">
              {editTarget ? 'Save Changes' : 'Add Tenant'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">First Name</label>
            <input {...register('firstName')} className="input-field" placeholder="John" />
            {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>}
          </div>
          <div>
            <label className="label">Last Name</label>
            <input {...register('lastName')} className="input-field" placeholder="Smith" />
            {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>}
          </div>
          <div>
            <label className="label">Email</label>
            <input {...register('email')} type="email" className="input-field" />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="label">Phone</label>
            <input {...register('phone')} className="input-field" placeholder="(215) 555-0000" />
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
          </div>
          <div className="col-span-2">
            <label className="label">Property</label>
            <select {...register('propertyId')} className="input-field">
              <option value="">Select a property</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.address}, {p.city}</option>
              ))}
            </select>
            {errors.propertyId && <p className="text-red-500 text-xs mt-1">{errors.propertyId.message}</p>}
          </div>
          <div>
            <label className="label">Lease Start Date</label>
            <input {...register('leaseStartDate')} type="date" className="input-field" />
            {errors.leaseStartDate && <p className="text-red-500 text-xs mt-1">{errors.leaseStartDate.message}</p>}
          </div>
          <div>
            <label className="label">Lease End Date</label>
            <input {...register('leaseEndDate')} type="date" className="input-field" />
            {errors.leaseEndDate && <p className="text-red-500 text-xs mt-1">{errors.leaseEndDate.message}</p>}
          </div>
          <div>
            <label className="label">Monthly Rent ($)</label>
            <input {...register('rentAmount')} type="number" className="input-field" min={0} />
            {errors.rentAmount && <p className="text-red-500 text-xs mt-1">{errors.rentAmount.message}</p>}
          </div>
          <div>
            <label className="label">Security Deposit ($)</label>
            <input {...register('securityDeposit')} type="number" className="input-field" min={0} />
            {errors.securityDeposit && <p className="text-red-500 text-xs mt-1">{errors.securityDeposit.message}</p>}
          </div>
          <div>
            <label className="label">Status</label>
            <select {...register('status')} className="input-field">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="evicted">Evicted</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="label">Notes (optional)</label>
            <textarea {...register('notes')} className="input-field" rows={3} placeholder="Any notes about the tenant..." />
          </div>
        </div>
      </Modal>

      {/* View Details Modal */}
      <Modal
        isOpen={!!viewTarget}
        onClose={() => setViewTarget(null)}
        title="Tenant Details"
        size="md"
      >
        {viewTarget && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-xl">
                {viewTarget.firstName.charAt(0)}{viewTarget.lastName.charAt(0)}
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">
                  {viewTarget.firstName} {viewTarget.lastName}
                </h3>
                <span className={statusBadge[viewTarget.status] || 'badge-gray'}>{viewTarget.status}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-500 font-medium">Email</p>
                <p className="text-gray-800">{viewTarget.email}</p>
              </div>
              <div>
                <p className="text-gray-500 font-medium">Phone</p>
                <p className="text-gray-800">{viewTarget.phone}</p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-500 font-medium">Property</p>
                <p className="text-gray-800">{getPropertyAddress(viewTarget.propertyId)}</p>
              </div>
              <div>
                <p className="text-gray-500 font-medium">Monthly Rent</p>
                <p className="text-gray-800 font-semibold">${viewTarget.rentAmount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-500 font-medium">Security Deposit</p>
                <p className="text-gray-800">${viewTarget.securityDeposit.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-500 font-medium">Lease Start</p>
                <p className="text-gray-800">{format(new Date(viewTarget.leaseStartDate), 'MMM d, yyyy')}</p>
              </div>
              <div>
                <p className="text-gray-500 font-medium">Lease End</p>
                <p className="text-gray-800">{format(new Date(viewTarget.leaseEndDate), 'MMM d, yyyy')}</p>
              </div>
              {viewTarget.notes && (
                <div className="col-span-2">
                  <p className="text-gray-500 font-medium">Notes</p>
                  <p className="text-gray-800">{viewTarget.notes}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Tenant"
        message={`Are you sure you want to delete ${deleteTarget?.firstName} ${deleteTarget?.lastName}? This action cannot be undone.`}
        confirmLabel="Delete Tenant"
      />
    </div>
  );
}
