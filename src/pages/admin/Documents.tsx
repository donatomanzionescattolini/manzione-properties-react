import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Download, Trash2, FolderOpen, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { useDataStore } from '../../store/dataStore';
import { useAuthStore } from '../../store/authStore';
import { PageHeader } from '../../components/layout/PageHeader';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { toast } from '../../components/ui/toastStore';
import { supabase } from '../../lib/supabase';
import type { Document } from '../../types';

const schema = z.object({
  type: z.enum(['lease', 'receipt', 'maintenance-report', 'communication', 'tax', 'other']),
  propertyId: z.string().optional(),
  tenantId: z.string().optional(),
  description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function Documents() {
  const { documents, properties, tenants, addDocument, deleteDocument } = useDataStore();
  const { currentUser } = useAuthStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);
  const [filterType, setFilterType] = useState('');
  const [filterProperty, setFilterProperty] = useState('');
  const [filterTenant, setFilterTenant] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const filtered = documents
    .filter((d) => {
      if (filterType && d.type !== filterType) return false;
      if (filterProperty && d.propertyId !== filterProperty) return false;
      if (filterTenant && d.tenantId !== filterTenant) return false;
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const openModal = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    reset({ type: 'other', propertyId: '', tenantId: '', description: '' });
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
  };

  const onSubmit = async (data: FormData) => {
    if (!selectedFile) {
      toast.error('Please select a file');
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      // Upload to Supabase Storage
      const fileExt = selectedFile.name.split('.').pop();
      const uniqueName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${fileExt}`;
      const storagePath = `${data.propertyId ?? 'general'}/${data.tenantId ?? 'shared'}/${uniqueName}`;

      setUploadProgress(30);

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      setUploadProgress(70);

      setUploadProgress(90);

      await addDocument({
        type: data.type,
        propertyId: data.propertyId || undefined,
        tenantId: data.tenantId || undefined,
        name: selectedFile.name,
        url: storagePath,
        size: selectedFile.size,
        mimeType: selectedFile.type || 'application/octet-stream',
        description: data.description,
        uploadedBy: currentUser?.name ?? 'Admin',
      });

      setUploadProgress(100);
      toast.success('Document uploaded successfully');
      setIsModalOpen(false);
      setSelectedFile(null);
      setUploadProgress(0);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to upload document';
      toast.error(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      const legacyPublicPrefix = '/storage/v1/object/public/documents/';
      const legacySignPrefix = '/storage/v1/object/sign/documents/';
      let storagePath = doc.url;

      if (doc.url.includes(legacyPublicPrefix)) {
        storagePath = doc.url.split(legacyPublicPrefix)[1]?.split('?')[0] ?? doc.url;
      } else if (doc.url.includes(legacySignPrefix)) {
        storagePath = doc.url.split(legacySignPrefix)[1]?.split('?')[0] ?? doc.url;
      }

      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(storagePath, 60);

      if (error || !data?.signedUrl) throw error ?? new Error('Signed URL unavailable');

      window.open(data.signedUrl, '_blank');
      toast.success('Download started');
    } catch {
      toast.error('Failed to prepare secure download');
    }
  };

  const handleDelete = async (doc: Document) => {
    try {
      await deleteDocument(doc.id);
      toast.success('Document deleted');
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to delete document');
    }
  };

  const getPropertyAddress = (propertyId?: string) => {
    if (!propertyId) return '-';
    const p = properties.find((x) => x.id === propertyId);
    return p?.address ?? '-';
  };

  const getTenantName = (tenantId?: string) => {
    if (!tenantId) return '-';
    const t = tenants.find((x) => x.id === tenantId);
    return t ? `${t.firstName} ${t.lastName}` : '-';
  };

  const typeBadge: Record<string, string> = {
    lease: 'badge-blue',
    receipt: 'badge-green',
    'maintenance-report': 'badge-yellow',
    communication: 'badge-gray',
    tax: 'badge-red',
    other: 'badge-gray',
  };

  return (
    <div>
      <PageHeader
        title="Documents"
        subtitle={`${documents.length} documents stored`}
        actions={
          <button onClick={openModal} className="btn-primary">
            <Plus size={16} /> Upload Document
          </button>
        }
      />

      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="input-field w-44"
        >
          <option value="">All Types</option>
          <option value="lease">Lease</option>
          <option value="receipt">Receipt</option>
          <option value="maintenance-report">Maintenance</option>
          <option value="communication">Communication</option>
          <option value="tax">Tax</option>
          <option value="other">Other</option>
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
        <select
          value={filterTenant}
          onChange={(e) => setFilterTenant(e.target.value)}
          className="input-field w-48"
        >
          <option value="">All Tenants</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
          ))}
        </select>
      </div>

      <div className="page-card overflow-x-auto">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<FolderOpen />}
            title="No documents"
            description="Upload your first document"
            action={
              <button onClick={openModal} className="btn-primary">
                <Plus size={16} /> Upload Document
              </button>
            }
          />
        ) : (
          <table className="w-full min-w-[700px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">Name</th>
                <th className="table-th">Type</th>
                <th className="table-th">Property</th>
                <th className="table-th">Tenant</th>
                <th className="table-th">Size</th>
                <th className="table-th">Uploaded By</th>
                <th className="table-th">Date</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="table-td">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-gray-400" />
                      <span className="font-medium truncate max-w-[180px]">{d.name}</span>
                    </div>
                  </td>
                  <td className="table-td">
                    <span className={typeBadge[d.type] || 'badge-gray'}>{d.type}</span>
                  </td>
                  <td className="table-td text-sm">{getPropertyAddress(d.propertyId)}</td>
                  <td className="table-td text-sm">{getTenantName(d.tenantId)}</td>
                  <td className="table-td">{formatBytes(d.size)}</td>
                  <td className="table-td text-gray-500">{d.uploadedBy}</td>
                  <td className="table-td">{format(new Date(d.createdAt), 'MMM d, yyyy')}</td>
                  <td className="table-td">
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleDownload(d)}
                        className="btn btn-ghost btn-sm p-1.5"
                        title="Download"
                      >
                        <Download size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(d)}
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
        title="Upload Document"
        size="md"
        footer={
          <>
            <button onClick={() => setIsModalOpen(false)} className="btn-outline">Cancel</button>
            <button
              onClick={handleSubmit(onSubmit)}
              className="btn-primary"
              disabled={isUploading}
            >
              {isUploading ? `Uploading... ${uploadProgress}%` : 'Upload Document'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">File</label>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary file:text-white hover:file:bg-primary-light cursor-pointer"
            />
            {selectedFile && (
              <p className="text-xs text-gray-500 mt-1">
                Selected: {selectedFile.name} ({formatBytes(selectedFile.size)})
              </p>
            )}
            {isUploading && uploadProgress > 0 && (
              <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
          </div>
          <div>
            <label className="label">Document Type</label>
            <select {...register('type')} className="input-field">
              <option value="lease">Lease</option>
              <option value="receipt">Receipt</option>
              <option value="maintenance-report">Maintenance Report</option>
              <option value="communication">Communication</option>
              <option value="tax">Tax Document</option>
              <option value="other">Other</option>
            </select>
            {errors.type && <p className="text-red-500 text-xs mt-1">{errors.type.message}</p>}
          </div>
          <div>
            <label className="label">Property (optional)</label>
            <select {...register('propertyId')} className="input-field">
              <option value="">No property</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.address}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Tenant (optional)</label>
            <select {...register('tenantId')} className="input-field">
              <option value="">No tenant</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Description (optional)</label>
            <textarea
              {...register('description')}
              className="input-field"
              rows={2}
              placeholder="Brief description of the document"
            />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        title="Delete Document"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This will permanently remove the file.`}
        confirmLabel="Delete Document"
      />
    </div>
  );
}
