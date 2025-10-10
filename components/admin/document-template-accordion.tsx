'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ChevronDown, ChevronRight, Edit, GripVertical, Trash2 } from 'lucide-react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Condition } from './condition-builder';
import { ConditionPreview } from './condition-preview';
import { ContentRenderer } from './content-renderer';

// Define DragEndEvent type locally since it's not exported from @dnd-kit/core
interface DragEndEvent {
  active: any;
  over: any;
  delta: any;
  collisions: any;
}

interface DocumentTemplate {
  id: number;
  title: string;
  version: string;
  description: string;
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

interface DocumentTemplateAccordionProps {
  template: DocumentTemplate;
  onTemplateChange: (template: DocumentTemplate) => void;
  onClauseAdded?: (clauseId: string) => void;
}

// Sortable Clause Component
function SortableClause({
  clause,
  clauseIndex,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onEditParagraph,
  onDeleteParagraph,
  onAddParagraph,
  onDragEnd,
}: {
  clause: any;
  clauseIndex: number;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onEditParagraph: (paragraph: any) => void;
  onDeleteParagraph: (paragraphId: string) => void;
  onAddParagraph: (clauseId: string) => void;
  onDragEnd: (clauseId: string, event: DragEndEvent) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: clause.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="rounded-lg border border-gray-200" id={`clause-${clause.id}`}>
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <div className="flex cursor-pointer items-center justify-between rounded-t-lg border-b border-gray-200 bg-blue-50 p-4 transition-colors hover:bg-blue-100">
            <div className="flex items-center space-x-3">
              <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
                <GripVertical className="h-4 w-4 text-gray-400" />
              </div>
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-600" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-600" />
              )}
              <div>
                <h4 className="font-medium text-gray-900">{clause.title}</h4>
                <p className="text-sm text-gray-600">
                  Clause {clauseIndex + 1} • {clause.paragraphs.length} paragraph(s)
                  {clause.condition && ' • Conditional'}
                </p>
                {clause.condition && (
                  <div className="mt-2">
                    <ConditionPreview
                      condition={typeof clause.condition === 'object' ? clause.condition : null}
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddParagraph(clause.id);
                }}
                className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                title="Add Paragraph"
              >
                <span className="text-sm">➕</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="h-8 w-8 p-0"
                title="Edit Clause"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                title="Delete Clause"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="space-y-3 p-4">
            {/* Clause Content */}
            {clause.content && (
              <div className="rounded border bg-gray-50 p-3">
                <div className="prose max-w-none text-sm">
                  <ContentRenderer content={clause.content} />
                </div>
              </div>
            )}

            {/* Paragraphs */}
            <SortableParagraphs
              paragraphs={clause.paragraphs}
              clauseId={clause.id}
              onEditParagraph={onEditParagraph}
              onDeleteParagraph={onDeleteParagraph}
              onDragEnd={onDragEnd}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// Sortable Paragraph Component
function SortableParagraph({
  paragraph,
  paragraphIndex,
  onEdit,
  onDelete,
}: {
  paragraph: any;
  paragraphIndex: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: paragraph.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start space-x-3 rounded border border-gray-200 bg-white p-3"
    >
      <div {...attributes} {...listeners} className="mt-1 cursor-grab active:cursor-grabbing">
        <GripVertical className="h-4 w-4 text-gray-400" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h5 className="text-sm font-medium text-gray-900">{paragraph.title}</h5>
            <p className="text-xs text-gray-600">
              Paragraph {paragraphIndex + 1}
              {paragraph.condition && ' • Conditional'}
            </p>
            {paragraph.condition && (
              <div className="mt-2">
                <ConditionPreview
                  condition={typeof paragraph.condition === 'object' ? paragraph.condition : null}
                />
              </div>
            )}
          </div>
          <div className="flex items-center space-x-1">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onEdit} 
              className="h-7 w-7 p-0"
              title="Edit Paragraph"
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
              title="Delete Paragraph"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <ContentRenderer content={paragraph.content} className="text-sm" />
      </div>
    </div>
  );
}

// Sortable Paragraphs Container
function SortableParagraphs({
  paragraphs,
  clauseId,
  onEditParagraph,
  onDeleteParagraph,
  onDragEnd,
}: {
  paragraphs: any[];
  clauseId: string;
  onEditParagraph: (paragraph: any) => void;
  onDeleteParagraph: (paragraphId: string) => void;
  onDragEnd: (clauseId: string, event: DragEndEvent) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    onDragEnd(clauseId, event);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={paragraphs.map((p) => p.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {paragraphs.map((paragraph, index) => (
            <SortableParagraph
              key={paragraph.id}
              paragraph={paragraph}
              paragraphIndex={index}
              onEdit={() => onEditParagraph(paragraph)}
              onDelete={() => onDeleteParagraph(paragraph.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

export function DocumentTemplateAccordion({
  template,
  onTemplateChange,
  onClauseAdded,
}: DocumentTemplateAccordionProps) {
  const router = useRouter();
  
  // Load expanded state from localStorage
  const [expandedIntroduction, setExpandedIntroduction] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`template-${template.id}-intro-expanded`);
      return saved !== null ? saved === 'true' : true; // Default to true
    }
    return true;
  });
  
  const [expandedClauses, setExpandedClauses] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`template-${template.id}-clauses-expanded`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return new Set(parsed);
        } catch (error) {
          console.error('Error parsing saved clause state:', error);
        }
      }
    }
    return new Set();
  });
  
  const [clauseWithNewParagraph, setClauseWithNewParagraph] = useState<string | null>(null);
  
  // Local template state to avoid re-rendering issues during drag operations
  const [localTemplate, setLocalTemplate] = useState(template);
  
  // Update local template when prop changes
  useEffect(() => {
    setLocalTemplate(template);
  }, [template]);
  
  // Save expanded introduction state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`template-${template.id}-intro-expanded`, expandedIntroduction.toString());
    }
  }, [expandedIntroduction, template.id]);
  
  // Save expanded clauses state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`template-${template.id}-clauses-expanded`, JSON.stringify(Array.from(expandedClauses)));
    }
  }, [expandedClauses, template.id]);
  
  // Function to expand a specific clause (used by parent component)
  const expandClause = (clauseId: string) => {
    const newExpanded = new Set(expandedClauses);
    newExpanded.add(clauseId);
    setExpandedClauses(newExpanded);
  };

  // Auto-expand newly created clauses
  const [previousClauseCount, setPreviousClauseCount] = useState(localTemplate.clauses.length);
  
  useEffect(() => {
    const currentClauseCount = localTemplate.clauses.length;
    
    // If a new clause was added (count increased), expand the newest clause
    if (currentClauseCount > previousClauseCount) {
      const newestClause = localTemplate.clauses[localTemplate.clauses.length - 1];
      if (newestClause) {
        expandClause(newestClause.id);
      }
    }
    
    // If a paragraph was added to a clause, expand that clause
    if (clauseWithNewParagraph) {
      expandClause(clauseWithNewParagraph);
      setClauseWithNewParagraph(null); // Reset the flag
    }
    
    setPreviousClauseCount(currentClauseCount);
  }, [localTemplate.clauses, previousClauseCount, clauseWithNewParagraph]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const toggleClauseExpansion = (clauseId: string) => {
    const newExpanded = new Set(expandedClauses);
    if (newExpanded.has(clauseId)) {
      newExpanded.delete(clauseId);
    } else {
      newExpanded.add(clauseId);
    }
    setExpandedClauses(newExpanded);
  };

  const handleClauseDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    console.log('🎯 Clause drag end event:', { activeId: active.id, overId: over?.id });

    if (over && active.id !== over.id) {
      const oldIndex = localTemplate.clauses.findIndex((clause) => clause.id === active.id);
      const newIndex = localTemplate.clauses.findIndex((clause) => clause.id === over.id);
      
      console.log('📍 Clause indices:', { oldIndex, newIndex });
      console.log('📋 Current clauses:', localTemplate.clauses.map(c => ({ id: c.id, title: c.title })));

      // Update local state immediately for responsive UI
      const updatedClauses = arrayMove(localTemplate.clauses, oldIndex, newIndex);
      console.log('📋 Updated clauses order:', updatedClauses.map(c => ({ id: c.id, title: c.title })));
      
      const updatedTemplate = {
        ...localTemplate,
        clauses: updatedClauses,
      };

      // Update local state first (without triggering full refresh)
      setLocalTemplate(updatedTemplate);
      console.log('✅ Local state updated');

      try {
        // Update sort_order in database for all affected clauses
        // When moving from position A to position B, all items between A and B need their sort_order updated
        const minIndex = Math.min(oldIndex, newIndex);
        const maxIndex = Math.max(oldIndex, newIndex);
        
        console.log(`📦 Moving clause from position ${oldIndex} to ${newIndex} - updating positions ${minIndex} to ${maxIndex}`);
        console.log(`📦 Number of clauses to update: ${maxIndex - minIndex + 1}`);
        
        // Update all clauses in the affected range with their new positions
        const clausesToUpdate = updatedClauses.slice(minIndex, maxIndex + 1);
        console.log('📦 Clauses to update:', clausesToUpdate.map(c => ({ id: c.id, title: c.title })));
        
        const updates = clausesToUpdate.map((clause, relativeIndex) => {
          const newSortOrder = minIndex + relativeIndex;
          console.log(`  🔄 Updating clause ${clause.id} (${clause.title}) to sort_order ${newSortOrder}`);
          
          return fetch(`/api/admin/document-templates/clauses`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clauseId: clause.id,
              title: clause.title,
              content: clause.content,
              description: clause.description || null,
              condition: clause.condition || null,
              llm_description: clause.metadata?.llm_description || null,
              sort_order: newSortOrder,
            }),
          });
        });

        console.log('⏳ Waiting for all clause updates to complete...');
        const responses = await Promise.all(updates);
        console.log('📨 Received responses:', responses.map(r => r.status));
        
        // Check if all updates succeeded
        for (let i = 0; i < responses.length; i++) {
          const response = responses[i];
          if (!response.ok) {
            const errorData = await response.json();
            console.error(`❌ Failed to update clause at index ${i}:`, errorData);
            throw new Error(errorData.error || 'Failed to update clause order');
          }
        }

        console.log('✅ All clause updates successful');
        toast.success('Clause order updated!');
      } catch (error) {
        console.error('Error updating clause order:', error);
        toast.error('Failed to update clause order');
        // Revert local state on error
        setLocalTemplate(template);
      }
    }
  };

  const handleParagraphDragEnd = async (clauseId: string, event: DragEndEvent) => {
    const { active, over } = event;
    
    console.log('🎯 Paragraph drag end event:', { clauseId, activeId: active.id, overId: over?.id });

    if (over && active.id !== over.id) {
      const clause = localTemplate.clauses.find((c) => c.id === clauseId);
      if (!clause) {
        console.error('❌ Clause not found:', clauseId);
        return;
      }

      const oldIndex = clause.paragraphs.findIndex((paragraph) => paragraph.id === active.id);
      const newIndex = clause.paragraphs.findIndex((paragraph) => paragraph.id === over.id);
      
      console.log('📍 Paragraph indices:', { oldIndex, newIndex });
      console.log('📄 Current paragraphs:', clause.paragraphs.map(p => ({ id: p.id, title: p.title })));

      // Update local state immediately for responsive UI
      const updatedParagraphs = arrayMove(clause.paragraphs, oldIndex, newIndex);
      console.log('📄 Updated paragraphs order:', updatedParagraphs.map(p => ({ id: p.id, title: p.title })));
      
      const updatedTemplate = {
        ...localTemplate,
        clauses: localTemplate.clauses.map((c) =>
          c.id === clauseId ? { ...c, paragraphs: updatedParagraphs } : c
        ),
      };

      // Update local state first (without triggering full refresh)
      setLocalTemplate(updatedTemplate);
      console.log('✅ Local state updated');

      try {
        // Update sort_order in database for all affected paragraphs
        // When moving from position A to position B, all items between A and B need their sort_order updated
        const minIndex = Math.min(oldIndex, newIndex);
        const maxIndex = Math.max(oldIndex, newIndex);
        
        console.log(`📦 Moving paragraph from position ${oldIndex} to ${newIndex} - updating positions ${minIndex} to ${maxIndex}`);
        console.log(`📦 Number of paragraphs to update: ${maxIndex - minIndex + 1}`);
        
        // Update all paragraphs in the affected range with their new positions
        const paragraphsToUpdate = updatedParagraphs.slice(minIndex, maxIndex + 1);
        console.log('📦 Paragraphs to update:', paragraphsToUpdate.map(p => ({ id: p.id, title: p.title })));
        
        const updates = paragraphsToUpdate.map((paragraph, relativeIndex) => {
          const newSortOrder = minIndex + relativeIndex;
          console.log(`  🔄 Updating paragraph ${paragraph.id} (${paragraph.title}) to sort_order ${newSortOrder}`);
          
          return fetch(`/api/admin/document-templates/paragraphs`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paragraphId: paragraph.id,
              title: paragraph.title,
              content: paragraph.content,
              description: paragraph.description || null,
              condition: paragraph.condition || null,
              llm_description: paragraph.metadata?.llm_description || null,
              sort_order: newSortOrder,
            }),
          });
        });

        console.log('⏳ Waiting for all paragraph updates to complete...');
        const responses = await Promise.all(updates);
        console.log('📨 Received responses:', responses.map(r => r.status));
        
        // Check if all updates succeeded
        for (let i = 0; i < responses.length; i++) {
          const response = responses[i];
          if (!response.ok) {
            const errorData = await response.json();
            console.error(`❌ Failed to update paragraph at index ${i}:`, errorData);
            throw new Error(errorData.error || 'Failed to update paragraph order');
          }
        }

        console.log('✅ All paragraph updates successful');
        toast.success('Paragraph order updated!');
      } catch (error) {
        console.error('Error updating paragraph order:', error);
        toast.error('Failed to update paragraph order');
        // Revert local state on error
        setLocalTemplate(template);
      }
    }
  };

  const handleDeleteIntroduction = () => {
    if (
      window.confirm(
        'Are you sure you want to delete the introduction? This action cannot be undone.'
      )
    ) {
      const updatedTemplate = {
        ...template,
        introduction: {
          id: localTemplate.introduction.id,
          title: localTemplate.introduction.title,
          content: '',
        },
      };
      onTemplateChange(updatedTemplate);
    }
  };

  const handleDeleteClause = async (clauseId: string) => {
    if (
      window.confirm(
        'Are you sure you want to delete this entire clause and all its paragraphs? This action cannot be undone.'
      )
    ) {
      try {
        // Delete the clause from the database (paragraphs will be deleted automatically due to CASCADE)
        const response = await fetch(`/api/admin/document-templates/clauses?clauseId=${clauseId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete clause');
        }

        // Show success message
        toast.success('Clause deleted successfully!');
        
        // Refresh the template data to ensure we have the latest state
        onTemplateChange(template); // This will trigger fetchTemplate() and get correct data
        
      } catch (error) {
        console.error('Error deleting clause:', error);
        toast.error('Failed to delete clause');
      }
    }
  };

  const handleDeleteParagraph = async (clauseId: string, paragraphId: string) => {
    if (
      window.confirm(
        'Are you sure you want to delete this paragraph? This action cannot be undone.'
      )
    ) {
      try {
        // Delete the paragraph from the database
        const response = await fetch(`/api/admin/document-templates/paragraphs?paragraphId=${paragraphId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete paragraph');
        }

        // Show success message
        toast.success('Paragraph deleted successfully!');
        
        // Refresh the template data to ensure we have the latest state
        onTemplateChange(template); // This will trigger fetchTemplate() and get correct data
        
      } catch (error) {
        console.error('Error deleting paragraph:', error);
        toast.error('Failed to delete paragraph');
      }
    }
  };

  const handleEditPart = (part: any, type: 'introduction' | 'clause' | 'paragraph') => {
    const editUrl = `/admin/document-templates/edit/${localTemplate.id}/${type}/${part.id}`;
    router.push(editUrl);
  };

  const handleAddParagraph = async (clauseId: string) => {
    try {
      
      // Create the paragraph directly in the database
      const response = await fetch('/api/admin/document-templates/paragraphs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clause_id: clauseId,
          title: 'New Paragraph',
          content: 'Enter paragraph content here...',
          description: null,
          condition: null,
          llm_description: '',
          sort_order: localTemplate.clauses.find(c => c.id === clauseId)?.paragraphs.length || 0, // Add at the end
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create paragraph');
      }

      const result = await response.json();
      
      // Don't update local state - let the template refresh handle it
      // This ensures we get the correct paragraph ID from the database
      onTemplateChange(template); // This will trigger fetchTemplate() and get correct data
      
      // Mark this clause as having a new paragraph - the useEffect will expand it
      setClauseWithNewParagraph(clauseId);
      
      // Show success message
      toast.success('New paragraph added successfully!');
    } catch (error) {
      console.error('Error creating paragraph:', error);
      // You might want to show a toast error here
    }
  };


  return (
    <div className="space-y-4">
      {/* Introduction */}
      <Collapsible open={expandedIntroduction} onOpenChange={setExpandedIntroduction}>
        <CollapsibleTrigger asChild>
          <div className="flex cursor-pointer items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4 transition-colors hover:bg-gray-100">
            <div className="flex items-center space-x-3">
              <GripVertical className="h-4 w-4 text-gray-400" />
              {expandedIntroduction ? (
                <ChevronDown className="h-4 w-4 text-gray-600" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-600" />
              )}
              <div>
                <h4 className="font-medium text-gray-900">{localTemplate.introduction.title}</h4>
                <p className="text-sm text-gray-600">Introduction</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditPart(localTemplate.introduction, 'introduction');
                }}
                className="h-8 w-8 p-0"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteIntroduction();
                }}
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="prose markdown-content max-w-none">
              <ContentRenderer content={localTemplate.introduction.content} />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Clauses with Drag and Drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleClauseDragEnd}
      >
        <SortableContext
          items={localTemplate.clauses.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {localTemplate.clauses.map((clause, clauseIndex) => (
              <SortableClause
                key={clause.id}
                clause={clause}
                clauseIndex={clauseIndex}
                isExpanded={expandedClauses.has(clause.id)}
                onToggle={() => toggleClauseExpansion(clause.id)}
                onEdit={() => handleEditPart(clause, 'clause')}
                onDelete={() => handleDeleteClause(clause.id)}
                onEditParagraph={(paragraph) => handleEditPart(paragraph, 'paragraph')}
                onDeleteParagraph={(paragraphId) => handleDeleteParagraph(clause.id, paragraphId)}
                onAddParagraph={handleAddParagraph}
                onDragEnd={handleParagraphDragEnd}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* CSS for Markdown rendering */}
      <style jsx global>{`
        .markdown-content strong {
          font-weight: bold;
        }
        .markdown-content em {
          font-style: italic;
        }
        .markdown-content ul {
          list-style-type: disc;
          margin-left: 1.5rem;
          margin-bottom: 1rem;
        }
        .markdown-content ol {
          list-style-type: decimal;
          margin-left: 1.5rem;
          margin-bottom: 1rem;
        }
        .markdown-content li {
          margin-bottom: 0.25rem;
          display: list-item;
        }
        .markdown-content h1 {
          font-size: 1.5rem;
          font-weight: bold;
          margin: 1rem 0 0.5rem 0;
        }
        .markdown-content h2 {
          font-size: 1.25rem;
          font-weight: bold;
          margin: 1rem 0 0.5rem 0;
        }
        .markdown-content h3 {
          font-size: 1.125rem;
          font-weight: bold;
          margin: 0.75rem 0 0.5rem 0;
        }
        .markdown-content h4 {
          font-size: 1rem;
          font-weight: bold;
          margin: 0.75rem 0 0.5rem 0;
        }
        .markdown-content h5 {
          font-size: 0.875rem;
          font-weight: bold;
          margin: 0.75rem 0 0.5rem 0;
        }
        .markdown-content h6 {
          font-size: 0.75rem;
          font-weight: bold;
          margin: 0.75rem 0 0.5rem 0;
        }
        .markdown-content br {
          margin-bottom: 0.5rem;
        }
        .bg-gray-200.text-gray-800 {
          background-color: #e5e7eb;
          color: #374151;
          padding: 2px 4px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 12px;
        }
      `}</style>
    </div>
  );
}
