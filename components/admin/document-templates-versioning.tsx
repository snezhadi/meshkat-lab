'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Download, Trash2, Clock, FileText } from 'lucide-react';

interface Checkpoint {
  name: string;
  timestamp: string;
  size: number;
}

export function VersioningPanel() {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCheckpoints = async () => {
    try {
      setLoading(true);
      // In a real implementation, you would call an API to list checkpoints
      // For now, we'll simulate with localStorage or a simple file listing
      const response = await fetch('/api/admin/document-templates/checkpoints');
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setCheckpoints(result.checkpoints || []);
        }
      }
    } catch (error) {
      console.error('Error loading checkpoints:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCheckpoints();
  }, []);

  const handleRestoreCheckpoint = async (checkpointName: string) => {
    if (!window.confirm(`Are you sure you want to restore checkpoint "${checkpointName}"? This will overwrite the current document templates.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/document-templates/checkpoints/${checkpointName}/restore`, {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          toast.success('Checkpoint restored successfully!');
          // Reload the page or trigger a refresh
          window.location.reload();
        } else {
          toast.error(result.error || 'Failed to restore checkpoint');
        }
      } else {
        throw new Error('Failed to restore checkpoint');
      }
    } catch (error) {
      console.error('Error restoring checkpoint:', error);
      toast.error('An error occurred while restoring the checkpoint');
    }
  };

  const handleDeleteCheckpoint = async (checkpointName: string) => {
    if (!window.confirm(`Are you sure you want to delete checkpoint "${checkpointName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/document-templates?checkpoint=${checkpointName}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          toast.success('Checkpoint deleted successfully!');
          loadCheckpoints(); // Reload the list
        } else {
          toast.error(result.error || 'Failed to delete checkpoint');
        }
      } else {
        throw new Error('Failed to delete checkpoint');
      }
    } catch (error) {
      console.error('Error deleting checkpoint:', error);
      toast.error('An error occurred while deleting the checkpoint');
    }
  };

  const handleDownloadCheckpoint = async (checkpointName: string) => {
    try {
      const response = await fetch(`/api/admin/document-templates/checkpoints/${checkpointName}/download`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = checkpointName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Checkpoint downloaded successfully!');
      } else {
        throw new Error('Failed to download checkpoint');
      }
    } catch (error) {
      console.error('Error downloading checkpoint:', error);
      toast.error('An error occurred while downloading the checkpoint');
    }
  };

  const formatDate = (timestamp: string) => {
    try {
      const date = new Date(timestamp.replace(/[-]/g, ':').replace(/T/, ' ').split('.')[0]);
      return date.toLocaleString();
    } catch {
      return timestamp;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Clock className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Document Versioning</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadCheckpoints}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2 text-gray-600">Loading checkpoints...</span>
          </div>
        ) : checkpoints.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Checkpoints</h4>
            <p className="text-gray-600">
              Create your first checkpoint to start versioning your document templates.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {checkpoints.map((checkpoint) => (
              <div
                key={checkpoint.name}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {checkpoint.name}
                      </h4>
                      <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                        <span>Created: {formatDate(checkpoint.timestamp)}</span>
                        <span>Size: {formatFileSize(checkpoint.size)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRestoreCheckpoint(checkpoint.name)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    Restore
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownloadCheckpoint(checkpoint.name)}
                    className="h-8 w-8 p-0"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteCheckpoint(checkpoint.name)}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <div className="text-blue-600 text-sm">ℹ️</div>
          </div>
          <div className="ml-3">
            <h4 className="text-sm font-medium text-blue-800">Versioning Information</h4>
            <div className="mt-1 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Create checkpoints to save versions of your document templates</li>
                <li>Restore a checkpoint to revert to a previous version</li>
                <li>Download checkpoints for backup or sharing</li>
                <li>Delete old checkpoints to free up space</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
