import { useEffect, useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Wrench } from 'lucide-react';
import { format } from 'date-fns';
import { useDataStore } from '../../store/dataStore';
import { useAuthStore } from '../../store/authStore';
import { PageHeader } from '../../components/layout/PageHeader';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { toast } from '../../components/ui/toastStore';
import { supabase } from '../../lib/supabase';

const schema = z.object({
  title: z.string().min(1, 'Title required').max(100),
  description: z.string().min(10, 'Please provide more detail (at least 10 characters)'),
  category: z.enum(['plumbing', 'electrical', 'hvac', 'appliance', 'structural', 'general', 'other']),
  priority: z.enum(['low', 'medium', 'high', 'emergency']),
});

type FormData = z.infer<typeof schema>;

export function TenantMaintenance() {
  const { currentUser } = useAuthStore();
  const { tenants, maintenanceRequests, addMaintenanceRequest } = useDataStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  const tenant = tenants.find((t) => t.id === currentUser?.tenantId);

  const myRequests = maintenanceRequests
    .filter((r) => r.tenantId === tenant?.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  useEffect(() => {
    const paths = Array.from(new Set(myRequests.flatMap((r) => r.photos)));

    if (paths.length === 0) {
      setPhotoUrls({});
      return;
    }

    let cancelled = false;

    void Promise.all(
      paths.map(async (path) => {
        const { data, error } = await supabase.storage.from('documents').createSignedUrl(path, 3600);
        return [path, !error && data?.signedUrl ? data.signedUrl : ''] as const;
      })
    ).then((entries) => {
      if (cancelled) return;
      setPhotoUrls(Object.fromEntries(entries.filter(([, url]) => url)));
    });

    return () => {
      cancelled = true;
    };
  }, [myRequests]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const openModal = () => {
    reset({ title: '', description: '', category: 'general', priority: 'medium' });
    setSelectedPhotos([]);
    setIsModalOpen(true);
  };

  const handlePhotoSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedPhotos(Array.from(e.target.files ?? []).slice(0, 5));
  };

  const onSubmit = async (data: FormData) => {
    if (!tenant) return;
    try {
      setIsUploading(true);

      const photoPaths = await Promise.all(
        selectedPhotos.map(async (file, index) => {
          const ext = file.name.split('.').pop() ?? 'jpg';
          const path = `maintenance/${tenant.id}/${Date.now()}-${index}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
          const { error } = await supabase.storage.from('documents').upload(path, file, {
            cacheControl: '3600',
            upsert: false,
          });
          if (error) throw error;
          return path;
        })
      );

      await addMaintenanceRequest({
        tenantId: tenant.id,
        propertyId: tenant.propertyId,
        title: data.title,
        description: data.description,
        category: data.category,
        priority: data.priority,
        status: 'pending',
        photos: photoPaths,
        notes: [],
        submittedDate: format(new Date(), 'yyyy-MM-dd'),
      });
      toast.success('Maintenance request submitted!');
      setIsModalOpen(false);
      setSelectedPhotos([]);
    } catch {
      toast.error('Failed to submit request');
    } finally {
      setIsUploading(false);
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

  if (!tenant) {
    return (
      <div className="page-card text-center py-16">
        <p className="text-gray-500">Tenant profile not found.</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Maintenance Requests"
        subtitle="Submit and track maintenance issues"
        actions={
          <button onClick={openModal} className="btn-primary">
            <Plus size={16} /> Submit Request
          </button>
        }
      />

      {myRequests.length === 0 ? (
        <div className="page-card">
          <EmptyState
            icon={<Wrench />}
            title="No maintenance requests"
            description="Submit a request when you have a maintenance issue"
            action={
              <button onClick={openModal} className="btn-primary">
                <Plus size={16} /> Submit Request
              </button>
            }
          />
        </div>
      ) : (
        <div className="space-y-4">
          {myRequests.map((r) => (
            <div key={r.id} className="page-card">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">{r.title}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Submitted {format(new Date(r.submittedDate), 'MMMM d, yyyy')}
                  </p>
                </div>
                <div className="flex gap-2 ml-4">
                  <span className={priorityBadge[r.priority]}>{r.priority}</span>
                  <span className={statusBadge[r.status]}>{r.status}</span>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-3">{r.description}</p>
              <div className="flex items-center gap-4 text-xs text-gray-400">
                <span className="capitalize">Category: {r.category}</span>
                {r.assignedDate && (
                  <span>Assigned: {format(new Date(r.assignedDate), 'MMM d, yyyy')}</span>
                )}
                {r.completedDate && (
                  <span className="text-green-600">
                    Completed: {format(new Date(r.completedDate), 'MMM d, yyyy')}
                  </span>
                )}
                {r.photos.length > 0 && <span>{r.photos.length} photo(s)</span>}
              </div>
              {r.photos.length > 0 && (
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {r.photos.map((path, index) =>
                    photoUrls[path] ? (
                      <a
                        key={path}
                        href={photoUrls[path]}
                        target="_blank"
                        rel="noreferrer"
                        className="group relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50"
                      >
                        <img src={photoUrls[path]} alt={`Maintenance photo ${index + 1}`} className="h-24 w-full object-cover group-hover:opacity-90" />
                        <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">View</span>
                      </a>
                    ) : null
                  )}
                </div>
              )}
              {r.notes.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                  <p className="text-xs font-medium text-gray-500">Updates from property manager:</p>
                  {r.notes.map((note, i) => (
                    <div key={i} className="bg-blue-50 rounded-lg p-2.5 text-xs">
                      <p className="text-gray-700">{note.text}</p>
                      <p className="text-gray-400 mt-1">
                        {note.author} — {format(new Date(note.timestamp), 'MMM d, yyyy')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Submit Maintenance Request"
        size="md"
        footer={
          <>
            <button onClick={() => setIsModalOpen(false)} className="btn-outline">Cancel</button>
            <button onClick={handleSubmit(onSubmit as SubmitHandler<FormData>)} className="btn-primary" disabled={isUploading}>
              {isUploading ? 'Uploading…' : 'Submit Request'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Title</label>
            <input
              {...register('title')}
              className="input-field"
              placeholder="e.g. Leaking kitchen faucet"
            />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              {...register('description')}
              className="input-field"
              rows={4}
              placeholder="Please describe the issue in detail, including when it started and how severe it is..."
            />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Category</label>
              <select {...register('category')} className="input-field">
                <option value="plumbing">Plumbing</option>
                <option value="electrical">Electrical</option>
                <option value="hvac">HVAC</option>
                <option value="appliance">Appliance</option>
                <option value="structural">Structural</option>
                <option value="general">General</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="label">Priority</label>
              <select {...register('priority')} className="input-field">
                <option value="low">Low — Not urgent</option>
                <option value="medium">Medium — Needs attention</option>
                <option value="high">High — Urgent</option>
                <option value="emergency">Emergency — Immediate</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Photos (optional, up to 5)</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoSelection}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary file:text-white hover:file:bg-primary-light cursor-pointer"
            />
            {selectedPhotos.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Selected: {selectedPhotos.map((file) => file.name).join(', ')}
              </p>
            )}
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
            <strong>Emergency?</strong> For life-threatening emergencies, call 911 first. For urgent maintenance emergencies, please also call your property manager directly.
          </div>
        </div>
      </Modal>
    </div>
  );
}
