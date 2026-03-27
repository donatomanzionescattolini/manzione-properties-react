import { Download, FileText, FolderOpen } from 'lucide-react';
import { format } from 'date-fns';
import { useDataStore } from '../../store/dataStore';
import { useAuthStore } from '../../store/authStore';
import { PageHeader } from '../../components/layout/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { toast } from '../../components/ui/toastStore';
import { supabase } from '../../lib/supabase';
import type { Document } from '../../types';

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function TenantDocuments() {
  const { currentUser } = useAuthStore();
  const { documents, tenants } = useDataStore();

  const tenant = tenants.find((t) => t.id === currentUser?.tenantId);

  const myDocuments = documents
    .filter((d) => d.tenantId === tenant?.id || d.propertyId === tenant?.propertyId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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

  const typeBadge: Record<string, string> = {
    lease: 'badge-blue',
    receipt: 'badge-green',
    'maintenance-report': 'badge-yellow',
    communication: 'badge-gray',
    tax: 'badge-red',
    other: 'badge-gray',
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
        title="Documents"
        subtitle="Your lease agreements and property documents"
      />

      <div className="page-card overflow-x-auto">
        {myDocuments.length === 0 ? (
          <EmptyState
            icon={<FolderOpen />}
            title="No documents available"
            description="Your property manager will upload documents here"
          />
        ) : (
          <table className="w-full min-w-[500px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">Name</th>
                <th className="table-th">Type</th>
                <th className="table-th">Size</th>
                <th className="table-th">Date</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {myDocuments.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="table-td">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-gray-400" />
                      <span className="font-medium truncate max-w-[200px]">{d.name}</span>
                    </div>
                    {d.description && (
                      <p className="text-xs text-gray-400 ml-6">{d.description}</p>
                    )}
                  </td>
                  <td className="table-td">
                    <span className={typeBadge[d.type] || 'badge-gray'}>{d.type}</span>
                  </td>
                  <td className="table-td">{formatBytes(d.size)}</td>
                  <td className="table-td">{format(new Date(d.createdAt), 'MMM d, yyyy')}</td>
                  <td className="table-td">
                    <button
                      onClick={() => handleDownload(d)}
                      className="btn btn-ghost btn-sm"
                    >
                      <Download size={14} /> Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
