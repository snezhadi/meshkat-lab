'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { DocumentTemplateAccordion } from '@/components/admin/document-template-accordion';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    async function fetchTemplate(retryCount = 0) {
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
          // If this is a new template (starts with 'new_template_') and we haven't retried yet, wait and retry
          const templateIdStr = Array.isArray(templateId) ? templateId[0] : templateId;
          if (templateIdStr && templateIdStr.startsWith('new_template_') && retryCount < 5) {
            console.log(`Template not found, retrying... (attempt ${retryCount + 1}/5)`);
            // Increase delay with each retry
            const delay = (retryCount + 1) * 1000; // 1s, 2s, 3s, 4s, 5s
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchTemplate(retryCount + 1);
          }
          throw new Error(`Template not found: ${templateIdStr}`);
        }

        setTemplate(foundTemplate);
        setAllTemplates(templates);
        setError(null); // Clear any previous errors
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
      const updatedTemplates = allTemplates.map((t) => (t.id === templateId ? template : t));

      const response = await fetch('/api/admin/document-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentTemplates: updatedTemplates,
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

  const handleTemplateTitleChange = (newTitle: string) => {
    if (!template) return;
    
    const updatedTemplate = {
      ...template,
      title: newTitle
    };
    
    setTemplate(updatedTemplate);
    setHasUnsavedChanges(true);
  };

  const handleAddClause = () => {
    if (!template) return;
    
    const newClause = {
      id: `clause_${Date.now()}`,
      title: 'New Clause',
      content: 'Enter clause content here...',
      description: null,
      condition: undefined,
      paragraphs: []
    };
    
    const updatedTemplate = {
      ...template,
      clauses: [...template.clauses, newClause]
    };
    
    setTemplate(updatedTemplate);
    setHasUnsavedChanges(true);
    toast.success('New clause added!');
    
    // Scroll to the newly added clause after a short delay to allow DOM update
    setTimeout(() => {
      const newClauseElement = document.getElementById(`clause-${newClause.id}`);
      if (newClauseElement) {
        newClauseElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }
    }, 100);
  };

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <div className="text-center">
          <div className="border-primary mx-auto h-8 w-8 animate-spin rounded-full border-b-2"></div>
          <p className="mt-2 text-gray-600">Loading template...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <div className="text-center text-red-600">
          <p className="text-lg">Error: {error}</p>
          <div className="mt-4 space-x-2">
            <Button onClick={() => handleNavigation('/admin/document-templates')} variant="outline">
              Back to Templates
            </Button>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
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
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">Template Editor</h2>
            <div className="mt-3 space-y-2">
              <Label htmlFor="template-title" className="text-sm font-medium text-gray-700">
                Template Name
              </Label>
              <Input
                id="template-title"
                value={template.title}
                onChange={(e) => handleTemplateTitleChange(e.target.value)}
                className="max-w-md"
                placeholder="Enter template name..."
              />
            </div>
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
              onClick={() => handleNavigation('/admin/document-templates')}
              className="flex items-center space-x-2"
            >
              <span>←</span>
              <span>Back to Templates</span>
            </Button>
                   <Button
                     onClick={handleAddClause}
                     className="flex items-center space-x-2"
                   >
                     <span className="flex items-center justify-center w-5 h-5 text-white text-base font-bold">+</span>
                     <span>Add Clause</span>
                   </Button>
            <Button
              onClick={() => handleSave()}
              disabled={saving || !hasUnsavedChanges}
              className="flex items-center space-x-2"
            >
              {saving ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
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
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
            <div className="flex items-center">
              <div className="text-sm text-yellow-600">⚠️</div>
              <span className="ml-2 text-sm text-yellow-800">
                You have unsaved changes. Don't forget to save your work!
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Template Editor */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="p-6">
          <DocumentTemplateAccordion template={template} onTemplateChange={handleTemplateChange} />
        </div>
      </div>
    </div>
  );
}
