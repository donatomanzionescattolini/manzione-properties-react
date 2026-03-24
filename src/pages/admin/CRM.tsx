import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Edit2, Trash2, Users, Building, Wrench } from 'lucide-react';
import { useDataStore } from '../../store/dataStore';
import { PageHeader } from '../../components/layout/PageHeader';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { toast } from '../../components/ui/toastStore';
import type { Vendor, Owner } from '../../types';

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

const ownerSchema = z.object({
  name: z.string().min(1, 'Name required'),
  email: z.string().email('Valid email required'),
  phone: z.string().min(1, 'Phone required'),
  companyName: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  taxId: z.string().optional(),
  status: z.enum(['active', 'inactive']),
  notes: z.string().optional(),
});

type OwnerForm = z.infer<typeof ownerSchema>;

export function CRM() {
  const { vendors, owners, tenants, properties, addVendor, updateVendor, deleteVendor, addOwner, updateOwner, deleteOwner } = useDataStore();
  const [activeTab, setActiveTab] = useState<'vendors' | 'owners' | 'tenants'>('vendors');

  // Vendor state
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [editVendor, setEditVendor] = useState<Vendor | null>(null);
  const [deleteVendorTarget, setDeleteVendorTarget] = useState<Vendor | null>(null);

  // Owner state
  const [isOwnerModalOpen, setIsOwnerModalOpen] = useState(false);
  const [editOwner, setEditOwner] = useState<Owner | null>(null);
  const [deleteOwnerTarget, setDeleteOwnerTarget] = useState<Owner | null>(null);

  const {
    register: regVendor,
    handleSubmit: handleVendorSubmit,
    reset: resetVendor,
    formState: { errors: vendorErrors },
  } = useForm<VendorForm>({ resolver: zodResolver(vendorSchema) });

  const {
    register: regOwner,
    handleSubmit: handleOwnerSubmit,
    reset: resetOwner,
    formState: { errors: ownerErrors },
  } = useForm<OwnerForm>({ resolver: zodResolver(ownerSchema) });

  const openAddVendor = () => {
    setEditVendor(null);
    resetVendor({ name: '', email: '', phone: '', category: 'other', status: 'active' });
    setIsVendorModalOpen(true);
  };

  const openEditVendor = (v: Vendor) => {
    setEditVendor(v);
    resetVendor({
      name: v.name, email: v.email, phone: v.phone, category: v.category,
      address: v.address ?? '', city: v.city ?? '', state: v.state ?? '',
      zip: v.zip ?? '', ein: v.ein ?? '', licenseNumber: v.licenseNumber ?? '',
      status: v.status, notes: v.notes ?? '',
    });
    setIsVendorModalOpen(true);
  };

  const onVendorSubmit = async (data: VendorForm) => {
    try {
      if (editVendor) {
        await updateVendor(editVendor.id, data);
        toast.success('Vendor updated');
      } else {
        await addVendor({ ...data, properties: undefined as unknown as never } as Omit<Vendor, 'id' | 'createdAt'>);
        toast.success('Vendor added');
      }
      setIsVendorModalOpen(false);
    } catch {
      toast.error('Failed to save vendor');
    }
  };

  const openAddOwner = () => {
    setEditOwner(null);
    resetOwner({ name: '', email: '', phone: '', status: 'active' });
    setIsOwnerModalOpen(true);
  };

  const openEditOwner = (o: Owner) => {
    setEditOwner(o);
    resetOwner({
      name: o.name, email: o.email, phone: o.phone, companyName: o.companyName ?? '',
      address: o.address ?? '', city: o.city ?? '', state: o.state ?? '',
      zip: o.zip ?? '', taxId: o.taxId ?? '', status: o.status, notes: o.notes ?? '',
    });
    setIsOwnerModalOpen(true);
  };

  const onOwnerSubmit = async (data: OwnerForm) => {
    try {
      if (editOwner) {
        await updateOwner(editOwner.id, data);
        toast.success('Owner updated');
      } else {
        await addOwner({ ...data, properties: [], portalEnabled: false });
        toast.success('Owner added');
      }
      setIsOwnerModalOpen(false);
    } catch {
      toast.error('Failed to save owner');
    }
  };

  const getOwnerProperties = (o: Owner) => {
    return o.properties.map((pid) => {
      const p = properties.find((x) => x.id === pid);
      return p?.address ?? pid;
    }).join(', ') || 'None';
  };

  const getPropertyAddress = (propertyId: string) => {
    const p = properties.find((x) => x.id === propertyId);
    return p ? `${p.address}, ${p.city}` : 'Unknown';
  };

  const statusBadge: Record<string, string> = {
    active: 'badge-green',
    inactive: 'badge-gray',
  };

  const tenantStatusBadge: Record<string, string> = {
    active: 'badge-green',
    inactive: 'badge-gray',
    evicted: 'badge-red',
  };

  return (
    <div>
      <PageHeader
        title="CRM"
        subtitle="Manage vendors, owners, and contacts"
      />

      <div className="flex border-b border-gray-200 mb-4">
        {[
          { key: 'vendors', label: 'Vendors', icon: <Wrench size={14} />, count: vendors.length },
          { key: 'owners', label: 'Owners', icon: <Building size={14} />, count: owners.length },
          { key: 'tenants', label: 'Tenants', icon: <Users size={14} />, count: tenants.length },
        ].map((tab) => (
          <button
            key={tab.key}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab(tab.key as 'vendors' | 'owners' | 'tenants')}
          >
            {tab.icon} {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {activeTab === 'vendors' && (
        <div>
          <div className="flex justify-end mb-3">
            <button onClick={openAddVendor} className="btn-primary">
              <Plus size={16} /> Add Vendor
            </button>
          </div>
          <div className="page-card overflow-x-auto">
            {vendors.length === 0 ? (
              <EmptyState icon={<Wrench />} title="No vendors" description="Add your first vendor" action={<button onClick={openAddVendor} className="btn-primary"><Plus size={16} /> Add Vendor</button>} />
            ) : (
              <table className="w-full min-w-[700px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-th">Name</th>
                    <th className="table-th">Category</th>
                    <th className="table-th">Email</th>
                    <th className="table-th">Phone</th>
                    <th className="table-th">Location</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.map((v) => (
                    <tr key={v.id} className="hover:bg-gray-50">
                      <td className="table-td font-medium">{v.name}</td>
                      <td className="table-td capitalize">{v.category}</td>
                      <td className="table-td text-gray-500">{v.email}</td>
                      <td className="table-td">{v.phone}</td>
                      <td className="table-td">{[v.city, v.state].filter(Boolean).join(', ') || '-'}</td>
                      <td className="table-td"><span className={statusBadge[v.status]}>{v.status}</span></td>
                      <td className="table-td">
                        <div className="flex gap-1">
                          <button onClick={() => openEditVendor(v)} className="btn btn-ghost btn-sm p-1.5"><Edit2 size={14} /></button>
                          <button onClick={() => setDeleteVendorTarget(v)} className="btn btn-sm p-1.5 text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === 'owners' && (
        <div>
          <div className="flex justify-end mb-3">
            <button onClick={openAddOwner} className="btn-primary">
              <Plus size={16} /> Add Owner
            </button>
          </div>
          <div className="page-card overflow-x-auto">
            {owners.length === 0 ? (
              <EmptyState icon={<Building />} title="No owners" description="Add your first owner" action={<button onClick={openAddOwner} className="btn-primary"><Plus size={16} /> Add Owner</button>} />
            ) : (
              <table className="w-full min-w-[700px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-th">Name</th>
                    <th className="table-th">Company</th>
                    <th className="table-th">Email</th>
                    <th className="table-th">Phone</th>
                    <th className="table-th">Properties</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {owners.map((o) => (
                    <tr key={o.id} className="hover:bg-gray-50">
                      <td className="table-td font-medium">{o.name}</td>
                      <td className="table-td">{o.companyName || '-'}</td>
                      <td className="table-td text-gray-500">{o.email}</td>
                      <td className="table-td">{o.phone}</td>
                      <td className="table-td text-xs">{getOwnerProperties(o)}</td>
                      <td className="table-td"><span className={statusBadge[o.status]}>{o.status}</span></td>
                      <td className="table-td">
                        <div className="flex gap-1">
                          <button onClick={() => openEditOwner(o)} className="btn btn-ghost btn-sm p-1.5"><Edit2 size={14} /></button>
                          <button onClick={() => setDeleteOwnerTarget(o)} className="btn btn-sm p-1.5 text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === 'tenants' && (
        <div className="page-card overflow-x-auto">
          {tenants.length === 0 ? (
            <EmptyState icon={<Users />} title="No tenants" description="Add tenants in the Tenants section" />
          ) : (
            <table className="w-full min-w-[700px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-th">Name</th>
                  <th className="table-th">Email</th>
                  <th className="table-th">Phone</th>
                  <th className="table-th">Property</th>
                  <th className="table-th">Status</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="table-td font-medium">{t.firstName} {t.lastName}</td>
                    <td className="table-td text-gray-500">{t.email}</td>
                    <td className="table-td">{t.phone}</td>
                    <td className="table-td">{getPropertyAddress(t.propertyId)}</td>
                    <td className="table-td"><span className={tenantStatusBadge[t.status] || 'badge-gray'}>{t.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Vendor Modal */}
      <Modal
        isOpen={isVendorModalOpen}
        onClose={() => setIsVendorModalOpen(false)}
        title={editVendor ? 'Edit Vendor' : 'Add Vendor'}
        size="lg"
        footer={
          <>
            <button onClick={() => setIsVendorModalOpen(false)} className="btn-outline">Cancel</button>
            <button onClick={handleVendorSubmit(onVendorSubmit)} className="btn-primary">
              {editVendor ? 'Save Changes' : 'Add Vendor'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Name</label>
            <input {...regVendor('name')} className="input-field" placeholder="Joe's Plumbing" />
            {vendorErrors.name && <p className="text-red-500 text-xs mt-1">{vendorErrors.name.message}</p>}
          </div>
          <div>
            <label className="label">Category</label>
            <select {...regVendor('category')} className="input-field">
              <option value="plumber">Plumber</option>
              <option value="electrician">Electrician</option>
              <option value="hvac">HVAC</option>
              <option value="painter">Painter</option>
              <option value="contractor">Contractor</option>
              <option value="landscaper">Landscaper</option>
              <option value="cleaning">Cleaning</option>
              <option value="locksmith">Locksmith</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="label">Email</label>
            <input {...regVendor('email')} type="email" className="input-field" />
            {vendorErrors.email && <p className="text-red-500 text-xs mt-1">{vendorErrors.email.message}</p>}
          </div>
          <div>
            <label className="label">Phone</label>
            <input {...regVendor('phone')} className="input-field" placeholder="(215) 555-0000" />
            {vendorErrors.phone && <p className="text-red-500 text-xs mt-1">{vendorErrors.phone.message}</p>}
          </div>
          <div>
            <label className="label">City</label>
            <input {...regVendor('city')} className="input-field" />
          </div>
          <div>
            <label className="label">State</label>
            <input {...regVendor('state')} className="input-field" />
          </div>
          <div>
            <label className="label">EIN (optional)</label>
            <input {...regVendor('ein')} className="input-field" placeholder="12-3456789" />
          </div>
          <div>
            <label className="label">License # (optional)</label>
            <input {...regVendor('licenseNumber')} className="input-field" />
          </div>
          <div>
            <label className="label">Status</label>
            <select {...regVendor('status')} className="input-field">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="label">Notes (optional)</label>
            <textarea {...regVendor('notes')} className="input-field" rows={2} />
          </div>
        </div>
      </Modal>

      {/* Owner Modal */}
      <Modal
        isOpen={isOwnerModalOpen}
        onClose={() => setIsOwnerModalOpen(false)}
        title={editOwner ? 'Edit Owner' : 'Add Owner'}
        size="lg"
        footer={
          <>
            <button onClick={() => setIsOwnerModalOpen(false)} className="btn-outline">Cancel</button>
            <button onClick={handleOwnerSubmit(onOwnerSubmit)} className="btn-primary">
              {editOwner ? 'Save Changes' : 'Add Owner'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Name</label>
            <input {...regOwner('name')} className="input-field" />
            {ownerErrors.name && <p className="text-red-500 text-xs mt-1">{ownerErrors.name.message}</p>}
          </div>
          <div>
            <label className="label">Company Name (optional)</label>
            <input {...regOwner('companyName')} className="input-field" />
          </div>
          <div>
            <label className="label">Email</label>
            <input {...regOwner('email')} type="email" className="input-field" />
            {ownerErrors.email && <p className="text-red-500 text-xs mt-1">{ownerErrors.email.message}</p>}
          </div>
          <div>
            <label className="label">Phone</label>
            <input {...regOwner('phone')} className="input-field" />
            {ownerErrors.phone && <p className="text-red-500 text-xs mt-1">{ownerErrors.phone.message}</p>}
          </div>
          <div>
            <label className="label">City</label>
            <input {...regOwner('city')} className="input-field" />
          </div>
          <div>
            <label className="label">State</label>
            <input {...regOwner('state')} className="input-field" />
          </div>
          <div>
            <label className="label">Tax ID (optional)</label>
            <input {...regOwner('taxId')} className="input-field" />
          </div>
          <div>
            <label className="label">Status</label>
            <select {...regOwner('status')} className="input-field">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="label">Notes (optional)</label>
            <textarea {...regOwner('notes')} className="input-field" rows={2} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteVendorTarget}
        onClose={() => setDeleteVendorTarget(null)}
        onConfirm={async () => { if (deleteVendorTarget) { try { await deleteVendor(deleteVendorTarget.id); toast.success('Vendor deleted'); setDeleteVendorTarget(null); } catch { toast.error('Failed to delete vendor'); } } }}
        title="Delete Vendor"
        message={`Are you sure you want to delete "${deleteVendorTarget?.name}"?`}
        confirmLabel="Delete Vendor"
      />

      <ConfirmDialog
        isOpen={!!deleteOwnerTarget}
        onClose={() => setDeleteOwnerTarget(null)}
        onConfirm={async () => { if (deleteOwnerTarget) { try { await deleteOwner(deleteOwnerTarget.id); toast.success('Owner deleted'); setDeleteOwnerTarget(null); } catch { toast.error('Failed to delete owner'); } } }}
        title="Delete Owner"
        message={`Are you sure you want to delete "${deleteOwnerTarget?.name}"?`}
        confirmLabel="Delete Owner"
      />
    </div>
  );
}
