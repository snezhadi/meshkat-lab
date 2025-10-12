'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Pencil, Check, X } from 'lucide-react';
import { Condition } from '@/components/admin/condition-builder';
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
import { usePermissions } from '@/hooks/usePermissions';

interface DocumentTemplate {
  id: number;
  title: string;
  version: string;
  description: string;
  active?: boolean;
  introduction: {
    id: string;
    title: string;
    content: string;
    description: string | null;
    condition?: Condition | string;
    metadata?: {
      llm_description?: string;
    };
  };
  clauses: Array<{
    id: string;
    title: string;
    content: string;
    description: string | null;
    condition?: string;
    metadata?: {
      llm_description?: string;
    };
    paragraphs: Array<{
      id: string;
      title: string;
      content: string;
      description: string | null;
      condition?: string;
      metadata?: {
        llm_description?: string;
      };
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
  const [error, setError] = useState<string | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');


  const fetchTemplate = async (retryCount = 0) => {
      try {
        setLoading(true);
        console.log(`🔍 Fetching single template: ${templateId}`);
        
        // 🚀 PERFORMANCE: Fetch only this specific template, not all templates!
        const response = await fetch(`/api/admin/document-templates/${templateId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch template');
        }
        const result = await response.json();

        if (!result.success) {
          // If this is a new template and we haven't retried yet, wait and retry
          const templateIdStr = Array.isArray(templateId) ? templateId[0] : templateId;
          if (templateIdStr && templateIdStr.startsWith('new_template_') && retryCount < 5) {
            console.log(`Template not found, retrying... (attempt ${retryCount + 1}/5)`);
            // Increase delay with each retry
            const delay = (retryCount + 1) * 1000; // 1s, 2s, 3s, 4s, 5s
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchTemplate(retryCount + 1);
          }
          throw new Error(result.error || 'Template not found');
        }

        const foundTemplate = result.data;
        
        console.log(`✅ Loaded template: ${foundTemplate.title} with ${foundTemplate.clauses.length} clauses`);
        
        setTemplate(foundTemplate);
        // Note: We don't need allTemplates anymore since we're not fetching all templates
        setAllTemplates([foundTemplate]);
        setError(null); // Clear any previous errors
      } catch (err) {
        console.error('Error in fetchTemplate:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        toast.error(`Failed to load template: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    if (templateId) {
      fetchTemplate();
    }
  }, [templateId]);

  const handleSave = async (shouldExit = true) => {
    if (!template) return;

    setSaving(true);
    try {
      // Update the specific template in the all templates array
      const updatedTemplates = allTemplates.map((t) => (t.id === parseInt(templateId as string) ? template : t));

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

  const handleTemplateChange = async (updatedTemplate: any) => {
    setTemplate(updatedTemplate);
    
    // Refresh the template data to ensure we have the latest IDs from database
    // This is especially important after creating, updating, or deleting clauses/paragraphs
    await fetchTemplate();
    
    // Note: No auto-save needed here. We use individual API endpoints for:
    // - Creating clauses/paragraphs (POST /api/admin/document-templates/clauses or /paragraphs)
    // - Updating clauses/paragraphs (PUT /api/admin/document-templates/clauses or /paragraphs)
    // - Deleting clauses/paragraphs (DELETE /api/admin/document-templates/clauses or /paragraphs)
    // Auto-saving the entire template would overwrite these changes with stale data
  };

  const handleStartEditingTitle = () => {
    if (!template) return;
    setEditedTitle(template.title);
    setIsEditingTitle(true);
  };

  const handleCancelEditingTitle = () => {
    setIsEditingTitle(false);
    setEditedTitle('');
  };

  const handleSaveTitle = async () => {
    if (!template || !editedTitle.trim()) return;
    
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/document-templates/${template.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: editedTitle.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save template title');
      }

      // Update local state
      setTemplate({ ...template, title: editedTitle.trim() });
      setIsEditingTitle(false);
      toast.success('Template title saved!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error(`Failed to save: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      handleCancelEditingTitle();
    }
  };

  const handleAddClause = async () => {
    if (!template) return;
    
    try {
      // Create the clause directly in the database
      const response = await fetch('/api/admin/document-templates/clauses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template_id: template.id,
          title: 'New Clause',
          content: 'Enter clause content here...',
          description: null,
          condition: null,
          llm_description: '',
          sort_order: template.clauses.length, // Add at the end
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create clause');
      }

      const result = await response.json();
      const newClause = {
        id: result.data.id, // Use the real database ID
        title: result.data.title,
        content: result.data.content,
        description: result.data.description,
        condition: result.data.condition,
        metadata: {
          llm_description: result.data.llm_description || ''
        },
        paragraphs: []
      };
      
      // Update the template with the new clause using the real database ID
      const updatedTemplate = {
        ...template,
        clauses: [...template.clauses, newClause]
      };
      
      setTemplate(updatedTemplate);
      toast.success('New clause added successfully!');
      
      // Refresh the template data to ensure we have the latest clause IDs
      await fetchTemplate();
      
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
      
    } catch (error) {
      console.error('Error creating clause:', error);
      toast.error('Failed to create new clause');
    }
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
            <Button onClick={() => router.push('/admin/document-templates')} variant="outline">
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
          <Button onClick={() => router.push('/admin/document-templates')} className="mt-4">
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
                router.push('/admin/document-templates');
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
            <div className="mt-1 flex items-center gap-2">
              {isEditingTitle ? (
                <>
                  <Input
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    onKeyDown={handleTitleKeyDown}
                    className="text-sm"
                    placeholder="Enter template name..."
                    autoFocus
                    disabled={saving}
                  />
                  <Button
                    size="sm"
                    onClick={handleSaveTitle}
                    disabled={saving || !editedTitle.trim()}
                    className="flex items-center gap-1"
                  >
                    {saving ? (
                      <div className="h-3 w-3 animate-spin rounded-full border-b-2 border-white"></div>
                    ) : (
                      <Check className="h-3 w-3" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancelEditingTitle}
                    disabled={saving}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-600">Editing: <span className="font-medium">{template.title}</span></p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleStartEditingTitle}
                    className="flex items-center gap-1 text-gray-400 hover:text-gray-600 h-6 px-1"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                </>
              )}
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
              onClick={() => router.push('/admin/document-templates')}
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
          </div>
        </div>

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
