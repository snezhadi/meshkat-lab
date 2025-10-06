'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
  id: string;
  title: string;
  version: string;
  description: string;
  introduction: {
    id: string;
    title: string;
    content: string;
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
}: DocumentTemplateAccordionProps) {
  const router = useRouter();
  const [expandedIntroduction, setExpandedIntroduction] = useState(true);
  const [expandedClauses, setExpandedClauses] = useState<Set<string>>(new Set());

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

  const handleClauseDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = template.clauses.findIndex((clause) => clause.id === active.id);
      const newIndex = template.clauses.findIndex((clause) => clause.id === over.id);

      const updatedTemplate = {
        ...template,
        clauses: arrayMove(template.clauses, oldIndex, newIndex),
      };

      onTemplateChange(updatedTemplate);
    }
  };

  const handleParagraphDragEnd = (clauseId: string, event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const clause = template.clauses.find((c) => c.id === clauseId);
      if (!clause) return;

      const oldIndex = clause.paragraphs.findIndex((paragraph) => paragraph.id === active.id);
      const newIndex = clause.paragraphs.findIndex((paragraph) => paragraph.id === over.id);

      const updatedParagraphs = arrayMove(clause.paragraphs, oldIndex, newIndex);

      const updatedTemplate = {
        ...template,
        clauses: template.clauses.map((c) =>
          c.id === clauseId ? { ...c, paragraphs: updatedParagraphs } : c
        ),
      };

      onTemplateChange(updatedTemplate);
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
          id: template.introduction.id,
          title: template.introduction.title,
          content: '',
        },
      };
      onTemplateChange(updatedTemplate);
    }
  };

  const handleDeleteClause = (clauseId: string) => {
    if (
      window.confirm(
        'Are you sure you want to delete this entire clause and all its paragraphs? This action cannot be undone.'
      )
    ) {
      const updatedTemplate = {
        ...template,
        clauses: template.clauses.filter((clause) => clause.id !== clauseId),
      };
      onTemplateChange(updatedTemplate);
    }
  };

  const handleDeleteParagraph = (clauseId: string, paragraphId: string) => {
    if (
      window.confirm(
        'Are you sure you want to delete this paragraph? This action cannot be undone.'
      )
    ) {
      const updatedTemplate = {
        ...template,
        clauses: template.clauses.map((clause) => {
          if (clause.id === clauseId) {
            return {
              ...clause,
              paragraphs: clause.paragraphs.filter((paragraph) => paragraph.id !== paragraphId),
            };
          }
          return clause;
        }),
      };
      onTemplateChange(updatedTemplate);
    }
  };

  const handleEditPart = (part: any, type: 'introduction' | 'clause' | 'paragraph') => {
    const editUrl = `/admin/document-templates/edit/${template.id}/${type}/${part.id}`;
    router.push(editUrl);
  };

  const handleAddParagraph = (clauseId: string) => {
    const newParagraph = {
      id: `paragraph_${Date.now()}`,
      title: 'New Paragraph',
      content: 'Enter paragraph content here...',
      description: null,
      condition: undefined,
    };

    const updatedTemplate = {
      ...template,
      clauses: template.clauses.map((clause) => {
        if (clause.id === clauseId) {
          return {
            ...clause,
            paragraphs: [...clause.paragraphs, newParagraph],
          };
        }
        return clause;
      }),
    };

    onTemplateChange(updatedTemplate);
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
                <h4 className="font-medium text-gray-900">{template.introduction.title}</h4>
                <p className="text-sm text-gray-600">Introduction</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditPart(template.introduction, 'introduction');
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
              <ContentRenderer content={template.introduction.content} />
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
          items={template.clauses.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {template.clauses.map((clause, clauseIndex) => (
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
