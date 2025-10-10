'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Condition, ConditionBuilder } from '@/components/admin/condition-builder';
import { ConditionEditor } from '@/components/admin/condition-editor';
import { MarkdownEditor } from '@/components/admin/markdown-editor';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

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
    condition?: Condition | string;
    metadata?: {
      llm_description?: string;
    };
    paragraphs: Array<{
      id: string;
      title: string;
      content: string;
      description: string | null;
      condition?: Condition | string;
      metadata?: {
        llm_description?: string;
      };
    }>;
  }>;
}

export default function DocumentPartEditPage() {
  const params = useParams();
  const router = useRouter();
  const { templateId, partType, partId } = params;

  const [template, setTemplate] = useState<DocumentTemplate | null>(null);
  const [part, setPart] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableParameters, setAvailableParameters] = useState<string[]>([]);

  // Handle navigation warning for unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return 'You have unsaved changes. Are you sure you want to leave?';
      }
    };

    const handleRouteChange = () => {
      if (hasUnsavedChanges) {
        const confirmed = window.confirm(
          'You have unsaved changes. Are you sure you want to leave?'
        );
        if (!confirmed) {
          throw new Error('Route change cancelled');
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // For Next.js router navigation, we'll handle this in the Cancel button and other navigation
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  useEffect(() => {
    async function fetchTemplate() {
      try {
        const response = await fetch('/api/admin/document-templates');
        if (!response.ok) {
          throw new Error('Failed to fetch document templates');
        }
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch document templates');
        }

        const templates = result.data;
        const foundTemplate = templates.find((t: DocumentTemplate) => t.id === parseInt(templateId as string));

        if (!foundTemplate) {
          throw new Error(`Template not found: ${templateId}`);
        }

        setTemplate(foundTemplate);

        // Find the specific part to edit
        let foundPart = null;
        if (partType === 'introduction') {
          foundPart = foundTemplate.introduction;
        } else if (partType === 'clause') {
          console.log(`🔍 Looking for clause with ID: ${partId}`);
          console.log(`📋 Available clause IDs:`, foundTemplate.clauses.map(c => c.id));
          console.log(`📋 Available clause titles:`, foundTemplate.clauses.map(c => c.title));
          
          foundPart = foundTemplate.clauses.find((c: any) => c.id === parseInt(partId as string));
          
          if (!foundPart) {
            console.warn(`❌ Clause with ID ${partId} not found in template data`);
            console.log(`🔍 This might be a race condition or data inconsistency`);
            
            // If clause not found in saved data, it might be a newly added unsaved clause
            // Create a temporary clause object for editing
            foundPart = {
              id: partId as string,
              title: 'New Clause',
              content: 'Enter clause content here...',
              description: null,
              condition: undefined,
              paragraphs: []
            };
            console.log(`🆕 Created temporary clause for editing`);
          } else {
            console.log(`✅ Found clause: "${foundPart.title}" (ID: ${foundPart.id})`);
          }
        } else if (partType === 'paragraph') {
          for (const clause of foundTemplate.clauses) {
            foundPart = clause.paragraphs.find((p: any) => p.id === parseInt(partId as string));
            if (foundPart) break;
          }
          // If paragraph not found in saved data, it might be a newly added unsaved paragraph
          // Create a temporary paragraph object for editing
          if (!foundPart) {
            foundPart = {
              id: partId as string,
              title: 'New Paragraph',
              content: 'Enter paragraph content here...',
              description: null,
              condition: undefined
            };
          }
        }

        if (!foundPart) {
          throw new Error(`Part not found: ${partType}/${partId}`);
        }

        setPart(foundPart);

        // Fetch available parameters for the rich text editor
        try {
          const paramsResponse = await fetch(`/api/admin/parameters?templateId=${templateId}`);
          if (paramsResponse.ok) {
            const paramsResult = await paramsResponse.json();
            // The API returns { parameters: [...], config: {...} }
            if (paramsResult.parameters && Array.isArray(paramsResult.parameters)) {
              const parameterIds = paramsResult.parameters.map((p: any) => p.id);
              setAvailableParameters(parameterIds);
            }
          }
        } catch (paramsErr) {
          console.warn('Failed to load parameters:', paramsErr);
          setAvailableParameters([]);
        }
      } catch (err) {
        console.error('Error in fetchTemplate:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        toast.error(`Failed to load template data: ${errorMessage}`);
        setError(errorMessage);
        // Don't redirect immediately - let user see the error
        // router.push('/admin/document-templates');
      } finally {
        setLoading(false);
      }
    }

    fetchTemplate();
  }, [templateId, partType, partId, router]);

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

  const handleSave = async () => {
    if (!template || !part) return;

    setSaving(true);
    
    try {
      let apiEndpoint = '';
      let requestData = {};

      if (partType === 'introduction') {
        // For introduction, we need to find the clause with sort_order = -1
        // First, get the introduction clause from the database
        const introResponse = await fetch(`/api/admin/document-templates/clauses?clauseId=${part.id}`);
        if (introResponse.ok) {
          const introResult = await introResponse.json();
          if (introResult.success) {
            apiEndpoint = '/api/admin/document-templates/clauses';
            requestData = {
              clauseId: introResult.data.id,
              title: part.title,
              content: part.content,
              description: part.description,
              condition: part.condition,
              llm_description: part.metadata?.llm_description,
            };
          }
        }
      } else if (partType === 'clause') {
        console.log(`💾 Saving clause with ID: ${partId}`);
        apiEndpoint = '/api/admin/document-templates/clauses';
        requestData = {
          clauseId: partId,
          title: part.title,
          content: part.content,
          description: part.description,
          condition: part.condition,
          llm_description: part.metadata?.llm_description,
        };
      } else if (partType === 'paragraph') {
        console.log(`💾 Saving paragraph with ID: ${partId}`);
        apiEndpoint = '/api/admin/document-templates/paragraphs';
        requestData = {
          paragraphId: partId,
          title: part.title,
          content: part.content,
          description: part.description,
          condition: part.condition,
          llm_description: part.metadata?.llm_description,
        };
      }

      if (!apiEndpoint) {
        throw new Error('Invalid part type');
      }

      // Debug: Log the request data
      console.log('Saving with data:', { apiEndpoint, requestData });

      // Save only the specific part being edited
      const saveResponse = await fetch(apiEndpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json().catch(() => ({}));
        console.error('Save failed:', {
          status: saveResponse.status,
          statusText: saveResponse.statusText,
          errorData
        });
        throw new Error(errorData.error || `Failed to save changes (${saveResponse.status})`);
      }

      const saveResult = await saveResponse.json();
      if (!saveResult.success) {
        throw new Error(saveResult.error || 'Failed to save changes');
      }

      console.log(`✅ ${partType} saved successfully`);
      toast.success('Changes saved successfully!');
      setHasUnsavedChanges(false);

      // Navigate back to template editor
      router.push(`/admin/document-templates/edit/${templateId}`);
    } catch (err) {
      console.error('Save error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save changes';
      
      // Check if it's an ID format error
      if (errorMessage.includes('Invalid clause ID format')) {
        toast.error('Please refresh the page and try again. The clause ID format is invalid.');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: string, value: string | Condition | null) => {
    setPart((prev: any) => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const handleContentChange = (content: string) => {
    setPart((prev: any) => ({ ...prev, content }));
    setHasUnsavedChanges(true);
  };

  const getBreadcrumbTitle = () => {
    if (partType === 'introduction') return 'Introduction';
    if (partType === 'clause') return `Clause ${part?.title || ''}`;
    if (partType === 'paragraph') return `Paragraph ${part?.title || ''}`;
    return 'Part';
  };

  const getPartTitle = () => {
    if (partType === 'introduction') return 'Edit Introduction';
    if (partType === 'clause') return 'Edit Clause';
    if (partType === 'paragraph') return 'Edit Paragraph';
    return 'Edit Part';
  };

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <div className="text-center">
          <div className="border-primary mx-auto h-8 w-8 animate-spin rounded-full border-b-2"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
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
            <Button
              onClick={() => handleNavigation(`/admin/document-templates/edit/${templateId}`)}
              variant="outline"
            >
              Back to Template Editor
            </Button>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!template || !part) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <div className="text-center text-red-600">
          <p className="text-lg">Error: Template or part not found</p>
          <Button
            onClick={() => handleNavigation(`/admin/document-templates/edit/${templateId}`)}
            className="mt-4"
          >
            Back to Template Editor
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
            <BreadcrumbLink
              href={`/admin/document-templates/edit/${templateId}`}
              onClick={(e) => {
                e.preventDefault();
                handleNavigation(`/admin/document-templates/edit/${templateId}`);
              }}
            >
              {template.title}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{getBreadcrumbTitle()}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{getPartTitle()}</h1>
            <p className="mt-1 text-sm text-gray-600">
              {template.title} • {part.title}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={() => handleNavigation(`/admin/document-templates/edit/${templateId}`)}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !hasUnsavedChanges}>
              {saving ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                'Save & Exit'
              )}
            </Button>
          </div>
        </div>

        {hasUnsavedChanges && (
          <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
            <div className="flex items-center">
              <div className="text-sm text-yellow-600">⚠️</div>
              <span className="ml-2 text-sm text-yellow-800">
                You have unsaved changes. Don't forget to save your work!
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Edit Form */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <CardContent className="space-y-6 p-6">

          {/* Title Field */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={part.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className="w-full"
            />
          </div>

          {/* Description Field (for clauses, paragraphs, and introduction) */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <div className="w-full">
              <MarkdownEditor
                content={part.description || ''}
                onChange={(content) => handleChange('description', content)}
                placeholder="Enter description..."
                enableParameters={false}
              />
            </div>
          </div>

          {/* LLM Description Field (for clauses, paragraphs, and introduction) */}
          <div className="space-y-2">
            <Label htmlFor="llm_description">LLM Description</Label>
            <Textarea
              id="llm_description"
              value={part.metadata?.llm_description || ''}
              onChange={(e) => {
                const updatedPart = {
                  ...part,
                  metadata: {
                    ...part.metadata,
                    llm_description: e.target.value
                  }
                };
                setPart(updatedPart);
                setHasUnsavedChanges(true);
              }}
              className="w-full"
              rows={12}
              placeholder="Detailed description for AI processing..."
            />
          </div>

          {/* Condition Field (for clauses, paragraphs, and introduction) */}
          <ConditionEditor
            condition={part.condition}
            onConditionChange={(condition) => handleChange('condition', condition)}
            availableParameters={availableParameters}
            label="Condition"
          />

          {/* Content Field */}
          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <div className="w-full">
              <MarkdownEditor
                content={part.content || ''}
                onChange={handleContentChange}
                availableParameters={availableParameters}
                placeholder="Start typing your content..."
                enableParameters={true}
              />
            </div>
          </div>
        </CardContent>
      </div>
    </div>
  );
}
