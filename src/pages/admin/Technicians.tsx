import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Edit2, Trash2, HardHat } from 'lucide-react';
import { useDataStore } from '../../store/dataStore';
import { PageHeader } from '../../components/layout/PageHeader';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { toast } from '../../components/ui/toastStore';
import type { Technician } from '../../types';

const technicianSchema = z.object({
  firstName: z.string().min(1, 'First name required'),
  lastName: z.string().min(1, 'Last name required'),
  email: z.string().email('Valid email required'),
  phone: z.string().min(1, 'Phone required'),
  specialty: z.enum(['plumbing', 'electrical', 'hvac', 'carpentry', 'painting', 'roofing', 'flooring', 'appliance-repair', 'general', 'other']),
  company: z.string().optional(),
  licenseNumber: z.string().optional(),
  insuranceInfo: z.string().optional(),
  hourlyRate: z.coerce.number().min(0).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  status: z.enum(['active', 'inactive']),
  notes: z.string().optional(),
});

type TechnicianForm = z.infer<typeof technicianSchema>;

const SPECIALTIES = [
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'carpentry', label: 'Carpentry' },
  { value: 'painting', label: 'Painting' },
  { value: 'roofing', label: 'Roofing' },
  { value: 'flooring', label: 'Flooring' },
  { value: 'appliance-repair', label: 'Appliance Repair' },
  { value: 'general', label: 'General' },
  { value: 'other', label: 'Other' },
] as const;

export function Technicians() {
  const { technicians, addTechnician, updateTechnician, deleteTechnician } = useDataStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Technician | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Technician | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState('');
  const [viewTarget, setViewTarget] = useState<Technician | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TechnicianForm>({ resolver: zodResolver(technicianSchema) });

  const filtered = technicians.filter((t) => {
    if (filterStatus && t.status !== filterStatus) return false;
    if (filterSpecialty && t.specialty !== filterSpecialty) return false;
    return true;
  });

  const openAdd = () => {
    setEditTarget(null);
    reset({ firstName: '', lastName: '', email: '', phone: '', specialty: 'general', status: 'active' });
    setIsModalOpen(true);
  };

  const openEdit = (t: Technician) => {
    setEditTarget(t);
    reset({
      firstName: t.firstName,
      lastName: t.lastName,
      email: t.email,
      phone: t.phone,
      specialty: t.specialty,
      company: t.company ?? '',
      licenseNumber: t.licenseNumber ?? '',
      insuranceInfo: t.insuranceInfo ?? '',
      hourlyRate: t.hourlyRate,
      address: t.address ?? '',
      city: t.city ?? '',
      state: t.state ?? '',
      zip: t.zip ?? '',
      status: t.status,
      notes: t.notes ?? '',
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: TechnicianForm) => {
    const payload = {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      specialty: data.specialty,
      company: data.company || undefined,
      licenseNumber: data.licenseNumber || undefined,
      insuranceInfo: data.insuranceInfo || undefined,
      hourlyRate: data.hourlyRate ?? undefined,
      address: data.address || undefined,
      city: data.city || undefined,
      state: data.state || undefined,
      zip: data.zip || undefined,
      status: data.status,
      notes: data.notes || undefined,
    };
    try {
      if (editTarget) {
        await updateTechnician(editTarget.id, payload);
        toast.success('Technician updated');
      } else {
        await addTechnician(payload);
        toast.success('Technician added');
      }
      setIsModalOpen(false);
    } catch {
      toast.error('Failed to save technician');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTechnician(deleteTarget.id);
      toast.success('Technician deleted');
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to delete technician');
    }
  };

  const getSpecialtyLabel = (val: string) =>
    SPECIALTIES.find((s) => s.value === val)?.label ?? val;

  return (
    <div>
      <PageHeader
        title="Technicians"
        subtitle={`${technicians.length} maintenance technician${technicians.length !== 1 ? 's' : ''}`}
        actions={
          <button onClick={openAdd} className="btn-primary">
            <Plus size={16} /> Add Technician
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
          value={filterSpecialty}
          onChange={(e) => setFilterSpecialty(e.target.value)}
          className="input-field w-52"
        >
          <option value="">All Specialties</option>
          {SPECIALTIES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="page-card">
          <EmptyState
            icon={<HardHat />}
            title="No technicians"
            description={filterStatus || filterSpecialty ? 'No technicians match your filters' : 'Add your first maintenance technician'}
          />
        </div>
      ) : (
        <div className="page-card overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">Name</th>
                <th className="table-th">Specialty</th>
                <th className="table-th">Company</th>
                <th className="table-th">Phone</th>
                <th className="table-th">Email</th>
                <th className="table-th">Rate/hr</th>
                <th className="table-th">Status</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr
                  key={t.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => setViewTarget(t)}
                >
                  <td className="table-td font-medium">{t.firstName} {t.lastName}</td>
                  <td className="table-td">{getSpecialtyLabel(t.specialty)}</td>
                  <td className="table-td text-gray-500">{t.company ?? '—'}</td>
                  <td className="table-td">{t.phone}</td>
                  <td className="table-td text-gray-500">{t.email}</td>
                  <td className="table-td">{t.hourlyRate != null ? `$${t.hourlyRate}/hr` : '—'}</td>
                  <td className="table-td">
                    <span className={t.status === 'active' ? 'badge-green' : 'badge-gray'}>{t.status}</span>
                  </td>
                  <td className="table-td" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(t)} className="btn btn-ghost btn-sm p-1.5" title="Edit">
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => setDeleteTarget(t)} className="btn btn-ghost btn-sm p-1.5 text-red-500" title="Delete">
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
      <Modal isOpen={!!viewTarget} onClose={() => setViewTarget(null)} title="Technician Details" size="lg">
        {viewTarget && (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-800">{viewTarget.firstName} {viewTarget.lastName}</h3>
                {viewTarget.company && <p className="text-sm text-gray-500">{viewTarget.company}</p>}
              </div>
              <div className="flex gap-2">
                <span className="badge-blue">{getSpecialtyLabel(viewTarget.specialty)}</span>
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
              {viewTarget.insuranceInfo && (
                <div>
                  <p className="text-gray-500 font-medium">Insurance</p>
                  <p>{viewTarget.insuranceInfo}</p>
                </div>
              )}
              {viewTarget.hourlyRate != null && (
                <div>
                  <p className="text-gray-500 font-medium">Hourly Rate</p>
                  <p>${viewTarget.hourlyRate}/hr</p>
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

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editTarget ? 'Edit Technician' : 'Add Technician'}
        size="lg"
        footer={
          <>
            <button onClick={() => setIsModalOpen(false)} className="btn-outline">Cancel</button>
            <button onClick={handleSubmit(onSubmit)} className="btn-primary">
              {editTarget ? 'Save Changes' : 'Add Technician'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">First Name</label>
            <input {...register('firstName')} className="input-field" placeholder="First name" />
            {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>}
          </div>
          <div>
            <label className="label">Last Name</label>
            <input {...register('lastName')} className="input-field" placeholder="Last name" />
            {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>}
          </div>
          <div>
            <label className="label">Email</label>
            <input {...register('email')} type="email" className="input-field" placeholder="email@example.com" />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="label">Phone</label>
            <input {...register('phone')} className="input-field" placeholder="(555) 000-0000" />
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
          </div>
          <div>
            <label className="label">Specialty</label>
            <select {...register('specialty')} className="input-field">
              {SPECIALTIES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Company (optional)</label>
            <input {...register('company')} className="input-field" placeholder="Company name" />
          </div>
          <div>
            <label className="label">License # (optional)</label>
            <input {...register('licenseNumber')} className="input-field" placeholder="License number" />
          </div>
          <div>
            <label className="label">Hourly Rate (optional)</label>
            <input {...register('hourlyRate')} type="number" min={0} step="0.01" className="input-field" placeholder="0.00" />
          </div>
          <div className="col-span-2">
            <label className="label">Insurance Info (optional)</label>
            <input {...register('insuranceInfo')} className="input-field" placeholder="Insurance provider / policy #" />
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
        title="Delete Technician"
        message={`Are you sure you want to delete ${deleteTarget?.firstName} ${deleteTarget?.lastName}? This cannot be undone.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
