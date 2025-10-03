'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { toast } from 'sonner';
import { DocumentTemplateAccordion } from '@/components/admin/document-template-accordion';
import { usePermissions } from '@/hooks/usePermissions';

interface DocumentTemplate {
  id: string;
  title: string;
  version: string;
  description: string;
  active?: boolean;
  introduction: {
    id: string;
    title: string;
    content: string;
  };
  clauses: Array<{
    id: string;
    title: string;
    content: string;
    description: string | null;
    condition?: string;
    paragraphs: Array<{
      id: string;
      title: string;
      content: string;
      description: string | null;
      condition?: string;
    }>;
  }>;
}

export default function TemplateEditorPage() {
  const params = useParams();
  const router = useRouter();
  const { templateId } = params;
  const { canExport } = usePermissions();
  
  const [template, setTemplate] = useState<DocumentTemplate | null>(null);
  const [allTemplates, setAllTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle navigation warning for unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return 'You have unsaved changes. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  const handleNavigation = (path: string) => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave?');
      if (confirmed) {
        router.push(path);
      }
    } else {
      router.push(path);
    }
  };

  useEffect(() => {
    async function fetchTemplate() {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/document-templates');
        if (!response.ok) {
          throw new Error('Failed to fetch document templates');
        }
        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch document templates');
        }
        
        const templates = result.data;
        const foundTemplate = templates.find((t: DocumentTemplate) => t.id === templateId);
        
        if (!foundTemplate) {
          throw new Error(`Template not found: ${templateId}`);
        }

        setTemplate(foundTemplate);
        setAllTemplates(templates);

      } catch (err) {
        console.error('Error in fetchTemplate:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        toast.error(`Failed to load template: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    }

    if (templateId) {
      fetchTemplate();
    }
  }, [templateId]);

  const handleSave = async () => {
    if (!template) return;

    setSaving(true);
    try {
      // Update the specific template in the all templates array
      const updatedTemplates = allTemplates.map(t =>
        t.id === templateId ? template : t
      );

      const response = await fetch('/api/admin/document-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          documentTemplates: updatedTemplates
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save template');
      }

      toast.success('Template saved successfully!');
      setHasUnsavedChanges(false);
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error(`Failed to save template: ${errorMessage}`);
      return { success: false, error: errorMessage };
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    if (!template) return;
    
    const dataStr = JSON.stringify(template, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `document-templates.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('Document templates exported successfully!');
  };

  const handleTemplateChange = (updatedTemplate: any) => {
    setTemplate(updatedTemplate);
    setHasUnsavedChanges(true);
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading template...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="text-center text-red-600">
          <p className="text-lg">Error: {error}</p>
          <div className="mt-4 space-x-2">
            <Button onClick={() => handleNavigation('/admin/document-templates')} variant="outline">
              Back to Templates
            </Button>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="text-center text-red-600">
          <p className="text-lg">Error: Template not found</p>
          <Button onClick={() => handleNavigation('/admin/document-templates')} className="mt-4">
            Back to Document Templates
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink 
              href="/admin/document-templates"
              onClick={(e) => {
                e.preventDefault();
                handleNavigation('/admin/document-templates');
              }}
            >
              Document Templates
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{template.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header with Save/Cancel */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Template Editor</h2>
            <p className="text-sm text-gray-600 mt-1">
              Editing: {template.title}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={!canExport}
              className="flex items-center space-x-2"
            >
              <span>📥</span>
              <span>Export</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/admin/document-templates')}
              className="flex items-center space-x-2"
            >
              <span>←</span>
              <span>Back to Templates</span>
            </Button>
            <Button
              onClick={() => handleSave()}
              disabled={saving || !hasUnsavedChanges}
              className="flex items-center space-x-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span>💾</span>
                  <span>Save Changes</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {hasUnsavedChanges && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center">
              <div className="text-yellow-600 text-sm">⚠️</div>
              <span className="ml-2 text-sm text-yellow-800">
                You have unsaved changes. Don't forget to save your work!
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Template Editor */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6">
          <DocumentTemplateAccordion
            template={template}
            onTemplateChange={handleTemplateChange}
          />
        </div>
      </div>
    </div>
  );
}
