import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { useDataStore } from '../../store/dataStore';
import { useAuthStore } from '../../store/authStore';
import { PageHeader } from '../../components/layout/PageHeader';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { toast } from '../../components/ui/Toast';
import type { MaintenanceRequest } from '../../types';

const statusUpdateSchema = z.object({
  status: z.enum(['pending', 'assigned', 'in-progress', 'completed', 'cancelled']),
  vendorId: z.string().optional(),
  estimatedCost: z.coerce.number().optional(),
  actualCost: z.coerce.number().optional(),
});

type StatusUpdateForm = z.infer<typeof statusUpdateSchema>;

const noteSchema = z.object({
  text: z.string().min(1, 'Note text required'),
});

type NoteForm = z.infer<typeof noteSchema>;

export function Maintenance() {
  const { maintenanceRequests, tenants, properties, vendors, updateMaintenanceRequest } = useDataStore();
  const { currentUser } = useAuthStore();
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterProperty, setFilterProperty] = useState('');
  const [viewTarget, setViewTarget] = useState<MaintenanceRequest | null>(null);
  const [statusTarget, setStatusTarget] = useState<MaintenanceRequest | null>(null);
  const [noteTarget, setNoteTarget] = useState<MaintenanceRequest | null>(null);

  const {
    register: regStatus,
    handleSubmit: handleStatusSubmit,
    reset: resetStatus,
    formState: { errors: statusErrors },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<StatusUpdateForm>({ resolver: zodResolver(statusUpdateSchema) as any });

  const {
    register: regNote,
    handleSubmit: handleNoteSubmit,
    reset: resetNote,
    formState: { errors: noteErrors },
  } = useForm<NoteForm>({ resolver: zodResolver(noteSchema) });

  const filtered = maintenanceRequests
    .filter((r) => {
      if (filterStatus && r.status !== filterStatus) return false;
      if (filterPriority && r.priority !== filterPriority) return false;
      if (filterProperty && r.propertyId !== filterProperty) return false;
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const getTenantName = (tenantId: string) => {
    const t = tenants.find((x) => x.id === tenantId);
    return t ? `${t.firstName} ${t.lastName}` : 'Unknown';
  };

  const getPropertyAddress = (propertyId: string) => {
    const p = properties.find((x) => x.id === propertyId);
    return p ? p.address : 'Unknown';
  };

  const getVendorName = (vendorId?: string) => {
    if (!vendorId) return 'Unassigned';
    const v = vendors.find((x) => x.id === vendorId);
    return v?.name ?? 'Unknown';
  };

  const openStatusModal = (r: MaintenanceRequest) => {
    setStatusTarget(r);
    resetStatus({
      status: r.status,
      vendorId: r.vendorId ?? '',
      estimatedCost: r.estimatedCost,
      actualCost: r.actualCost,
    });
  };

  const onStatusSubmit = (data: StatusUpdateForm) => {
    if (!statusTarget) return;
    const updates: Partial<MaintenanceRequest> = {
      status: data.status,
      vendorId: data.vendorId || undefined,
      estimatedCost: data.estimatedCost,
      actualCost: data.actualCost,
    };
    if (data.status === 'completed' && !statusTarget.completedDate) {
      updates.completedDate = new Date().toISOString();
    }
    if (data.vendorId && !statusTarget.assignedDate) {
      updates.assignedDate = new Date().toISOString();
    }
    updateMaintenanceRequest(statusTarget.id, updates);
    toast.success('Status updated');
    setStatusTarget(null);
  };

  const onNoteSubmit = (data: NoteForm) => {
    if (!noteTarget) return;
    const newNote = {
      text: data.text,
      author: currentUser?.name ?? 'Admin',
      timestamp: new Date().toISOString(),
    };
    updateMaintenanceRequest(noteTarget.id, {
      notes: [...noteTarget.notes, newNote],
    });
    toast.success('Note added');
    setNoteTarget(null);
    resetNote();
    if (viewTarget?.id === noteTarget.id) {
      setViewTarget({ ...noteTarget, notes: [...noteTarget.notes, newNote] });
    }
  };

  const priorityBadge: Record<string, string> = {
    low: 'badge-gray',
    medium: 'badge-yellow',
    high: 'badge-red',
    emergency: 'badge-red',
  };

  const statusBadge: Record<string, string> = {
    pending: 'badge-yellow',
    assigned: 'badge-blue',
    'in-progress': 'badge-blue',
    completed: 'badge-green',
    cancelled: 'badge-gray',
  };

  return (
    <div>
      <PageHeader
        title="Maintenance"
        subtitle={`${maintenanceRequests.length} total requests`}
      />

      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="input-field w-44"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="assigned">Assigned</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="input-field w-44"
        >
          <option value="">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="emergency">Emergency</option>
        </select>
        <select
          value={filterProperty}
          onChange={(e) => setFilterProperty(e.target.value)}
          className="input-field w-52"
        >
          <option value="">All Properties</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>{p.address}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="page-card">
          <EmptyState
            icon={<Plus />}
            title="No maintenance requests"
            description="No requests match your current filters"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((r) => (
            <div
              key={r.id}
              className="page-card cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setViewTarget(r)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 text-sm mb-1">{r.title}</h3>
                  <p className="text-xs text-gray-500">{getPropertyAddress(r.propertyId)}</p>
                  <p className="text-xs text-gray-500">{getTenantName(r.tenantId)}</p>
                </div>
                <div className="flex flex-col gap-1 items-end ml-2">
                  <span className={priorityBadge[r.priority]}>{r.priority}</span>
                  <span className={statusBadge[r.status]}>{r.status}</span>
                </div>
              </div>
              <p className="text-xs text-gray-600 mb-3 line-clamp-2">{r.description}</p>
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <div className="text-xs text-gray-400">
                  {format(new Date(r.submittedDate), 'MMM d, yyyy')}
                </div>
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => openStatusModal(r)}
                    className="btn btn-ghost btn-sm text-xs"
                  >
                    Update
                  </button>
                  <button
                    onClick={() => {
                      setNoteTarget(r);
                      resetNote();
                    }}
                    className="btn btn-ghost btn-sm p-1.5"
                    title="Add note"
                  >
                    <MessageSquare size={13} />
                  </button>
                </div>
              </div>
              {r.notes.length > 0 && (
                <p className="text-xs text-gray-400 mt-1">{r.notes.length} note(s)</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* View Details Modal */}
      <Modal
        isOpen={!!viewTarget}
        onClose={() => setViewTarget(null)}
        title="Maintenance Request Details"
        size="lg"
      >
        {viewTarget && (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-800">{viewTarget.title}</h3>
                <p className="text-sm text-gray-500">{getPropertyAddress(viewTarget.propertyId)} — {getTenantName(viewTarget.tenantId)}</p>
              </div>
              <div className="flex gap-2">
                <span className={priorityBadge[viewTarget.priority]}>{viewTarget.priority}</span>
                <span className={statusBadge[viewTarget.status]}>{viewTarget.status}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-500 font-medium">Category</p>
                <p className="capitalize">{viewTarget.category}</p>
              </div>
              <div>
                <p className="text-gray-500 font-medium">Submitted</p>
                <p>{format(new Date(viewTarget.submittedDate), 'MMM d, yyyy')}</p>
              </div>
              {viewTarget.vendorId && (
                <div>
                  <p className="text-gray-500 font-medium">Vendor</p>
                  <p>{getVendorName(viewTarget.vendorId)}</p>
                </div>
              )}
              {viewTarget.estimatedCost !== undefined && (
                <div>
                  <p className="text-gray-500 font-medium">Est. Cost</p>
                  <p>${viewTarget.estimatedCost.toLocaleString()}</p>
                </div>
              )}
              {viewTarget.actualCost !== undefined && (
                <div>
                  <p className="text-gray-500 font-medium">Actual Cost</p>
                  <p>${viewTarget.actualCost.toLocaleString()}</p>
                </div>
              )}
            </div>

            <div>
              <p className="text-gray-500 font-medium text-sm mb-1">Description</p>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{viewTarget.description}</p>
            </div>

            {viewTarget.notes.length > 0 && (
              <div>
                <p className="text-gray-500 font-medium text-sm mb-2">Notes</p>
                <div className="space-y-2">
                  {viewTarget.notes.map((note, i) => (
                    <div key={i} className="bg-blue-50 rounded-lg p-3 text-sm">
                      <p className="text-gray-800">{note.text}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {note.author} — {format(new Date(note.timestamp), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  openStatusModal(viewTarget);
                  setViewTarget(null);
                }}
                className="btn-primary btn-sm"
              >
                Update Status
              </button>
              <button
                onClick={() => {
                  setNoteTarget(viewTarget);
                  setViewTarget(null);
                  resetNote();
                }}
                className="btn-outline btn-sm"
              >
                <MessageSquare size={14} /> Add Note
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Status Update Modal */}
      <Modal
        isOpen={!!statusTarget}
        onClose={() => setStatusTarget(null)}
        title="Update Request"
        size="md"
        footer={
          <>
            <button onClick={() => setStatusTarget(null)} className="btn-outline">Cancel</button>
            <button onClick={handleStatusSubmit(onStatusSubmit as SubmitHandler<StatusUpdateForm>)} className="btn-primary">Save Changes</button>
          </>
        }
      >
        {statusTarget && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <p className="font-medium text-gray-800">{statusTarget.title}</p>
              <p className="text-gray-500">{getPropertyAddress(statusTarget.propertyId)}</p>
            </div>
            <div>
              <label className="label">Status</label>
              <select {...regStatus('status')} className="input-field">
                <option value="pending">Pending</option>
                <option value="assigned">Assigned</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              {statusErrors.status && <p className="text-red-500 text-xs mt-1">{statusErrors.status.message}</p>}
            </div>
            <div>
              <label className="label">Assign Vendor</label>
              <select {...regStatus('vendorId')} className="input-field">
                <option value="">Unassigned</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>{v.name} ({v.category})</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Estimated Cost ($)</label>
                <input {...regStatus('estimatedCost')} type="number" className="input-field" min={0} />
              </div>
              <div>
                <label className="label">Actual Cost ($)</label>
                <input {...regStatus('actualCost')} type="number" className="input-field" min={0} />
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Note Modal */}
      <Modal
        isOpen={!!noteTarget}
        onClose={() => setNoteTarget(null)}
        title="Add Note"
        size="sm"
        footer={
          <>
            <button onClick={() => setNoteTarget(null)} className="btn-outline">Cancel</button>
            <button onClick={handleNoteSubmit(onNoteSubmit as SubmitHandler<NoteForm>)} className="btn-primary">Add Note</button>
          </>
        }
      >
        {noteTarget && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 font-medium">{noteTarget.title}</p>
            <div>
              <label className="label">Note</label>
              <textarea
                {...regNote('text')}
                className="input-field"
                rows={4}
                placeholder="Add a note about this request..."
              />
              {noteErrors.text && <p className="text-red-500 text-xs mt-1">{noteErrors.text.message}</p>}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
