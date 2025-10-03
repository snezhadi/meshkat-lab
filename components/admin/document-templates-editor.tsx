'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { DocumentTemplateAccordion } from './document-template-accordion';
import { VersioningPanel } from './document-templates-versioning';
import { Condition } from './condition-builder';

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
    condition?: Condition | string;
    paragraphs: Array<{
      id: string;
      title: string;
      content: string;
      description: string | null;
      condition?: Condition | string;
    }>;
  }>;
}

interface DocumentTemplatesEditorProps {
  documentTemplates: DocumentTemplate[];
  onSave: (templates: DocumentTemplate[], createCheckpoint?: boolean) => Promise<{ success: boolean; error?: string; checkpoint?: string }>;
}

export function DocumentTemplatesEditor({ documentTemplates, onSave }: DocumentTemplatesEditorProps) {
  const [templates, setTemplates] = useState<DocumentTemplate[]>(documentTemplates);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showVersioning, setShowVersioning] = useState(false);
  const [showTemplateList, setShowTemplateList] = useState(true);

  const handleTemplateChange = (updatedTemplates: DocumentTemplate[]) => {
    setTemplates(updatedTemplates);
    setHasUnsavedChanges(true);
  };

  const handleSave = async (createCheckpoint: boolean = false) => {
    try {
      setSaving(true);
      const result = await onSave(templates, createCheckpoint);
      
      if (result.success) {
        setHasUnsavedChanges(false);
        toast.success(
          createCheckpoint 
            ? 'Document templates saved and checkpoint created successfully!' 
            : 'Document templates saved successfully!'
        );
        if (result.checkpoint) {
          toast.info(`Checkpoint created: ${result.checkpoint}`);
        }
      } else {
        toast.error(result.error || 'Failed to save document templates');
      }
    } catch (error) {
      console.error('Error saving document templates:', error);
      toast.error('An unexpected error occurred while saving');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCheckpoint = () => {
    handleSave(true);
  };

  const handleCreateNewTemplate = () => {
    const newTemplateId = `new_template_${Date.now()}`;
    const newTemplate: DocumentTemplate = {
      id: newTemplateId,
      title: 'New Document Template',
      version: '1.0',
      description: 'A new document template. Click edit to customize.',
      active: true,
      introduction: {
        id: `${newTemplateId}_introduction`,
        title: 'Introduction',
        content: 'This is the introduction section of the new template.'
      },
      clauses: []
    };

    const updatedTemplates = [...templates, newTemplate];
    setTemplates(updatedTemplates);
    setSelectedTemplateId(newTemplateId);
    setShowTemplateList(false);
    setHasUnsavedChanges(true);
  };

  const handleDeactivateTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    const isActive = template?.active !== false;
    
    if (window.confirm(
      `Are you sure you want to ${isActive ? 'deactivate' : 'activate'} this template?`
    )) {
      const updatedTemplates = templates.map(t => 
        t.id === templateId ? { ...t, active: !isActive } : t
      );
      setTemplates(updatedTemplates);
      setHasUnsavedChanges(true);
    }
  };

  const handleSelectTemplate = (templateId: string) => {
    // Navigate to the dedicated template editor page
    window.location.href = `/admin/document-templates/edit/${templateId}`;
  };

  const handleBackToList = () => {
    if (hasUnsavedChanges) {
      const confirmBack = window.confirm(
        'You have unsaved changes. Are you sure you want to go back to the template list? Your changes will be lost if you don\'t save first.'
      );
      if (!confirmBack) {
        return;
      }
    }
    setShowTemplateList(true);
    setSelectedTemplateId('');
  };

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  return (
    <div className="space-y-6">
      {showTemplateList ? (
        // Template List View
        <>
          {/* Header */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Document Templates</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Manage your document templates. Click on a template to edit it.
                </p>
              </div>
              <Button
                onClick={handleCreateNewTemplate}
                className="flex items-center space-x-2"
              >
                <span className="text-white">+</span>
                <span>Create New Template</span>
              </Button>
            </div>
          </div>

          {/* Template Cards */}
          <div className="space-y-4">
            {templates.map((template) => (
              <div
                key={template.id}
                className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer group"
                onClick={() => handleSelectTemplate(template.id)}
              >
                <div className="p-6">
                  <div className="flex items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {template.title}
                        </h3>
                        <div className="flex items-center space-x-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeactivateTemplate(template.id);
                                  }}
                                  className={`h-8 w-8 p-0 ${template.active !== false ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}`}
                                >
                                  <span>{template.active !== false ? '🗑️' : '✅'}</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{template.active !== false ? 'Deactivate template' : 'Activate template'}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            template.active !== false 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {template.active !== false ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-sm text-gray-600">
                          Version: {template.version}, Last Updated: {new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span className="inline-flex items-center">
                            <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                            {template.clauses.length} clauses
                          </span>
                          <span className="inline-flex items-center">
                            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                            {template.clauses.reduce((total, clause) => total + clause.paragraphs.length, 0)} paragraphs
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {templates.length === 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <div className="text-gray-400 text-4xl mb-4">📄</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Document Templates</h3>
              <p className="text-gray-600 mb-4">
                Get started by creating your first document template.
              </p>
              <Button onClick={handleCreateNewTemplate} className="flex items-center space-x-2 mx-auto">
                <span>➕</span>
                <span>Create Your First Template</span>
              </Button>
            </div>
          )}
        </>
      ) : (
        // Template Editor View
        <>
                  {/* Header with Back Button */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <Button
                          variant="outline"
                          onClick={handleBackToList}
                          className="flex items-center space-x-2"
                        >
                          <span>←</span>
                          <span>Back to Templates</span>
                        </Button>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Button
                          variant="outline"
                          onClick={() => setShowVersioning(!showVersioning)}
                          className="flex items-center space-x-2"
                        >
                          <span>📚</span>
                          <span>Versioning</span>
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleCreateCheckpoint}
                          disabled={saving || !hasUnsavedChanges}
                          className="flex items-center space-x-2"
                        >
                          <span>💾</span>
                          <span>Create Checkpoint</span>
                        </Button>
                        <Button
                          onClick={() => handleSave(false)}
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

          {/* Versioning Panel */}
          {showVersioning && (
            <VersioningPanel />
          )}

                  {/* Template Editor */}
                  {selectedTemplate && (
                    <div className="bg-white rounded-lg border border-gray-200">
                      <div className="p-6">
                        <DocumentTemplateAccordion
                          template={selectedTemplate}
                          onTemplateChange={(updatedTemplate) => {
                            const updatedTemplates = templates.map(template =>
                              template.id === selectedTemplateId ? updatedTemplate : template
                            );
                            handleTemplateChange(updatedTemplates);
                          }}
                        />
                      </div>
                    </div>
                  )}
        </>
      )}
    </div>
  );
}
