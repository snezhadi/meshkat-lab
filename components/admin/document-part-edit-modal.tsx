'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from './rich-text-editor';

interface DocumentPartEditModalProps {
  part: {
    id: string;
    title: string;
    content: string;
    description?: string | null;
    condition?: string;
    type: 'introduction' | 'clause' | 'paragraph';
  };
  onSave: (updatedPart: any) => void;
  onCancel: () => void;
}

export function DocumentPartEditModal({ part, onSave, onCancel }: DocumentPartEditModalProps) {
  const [formData, setFormData] = useState({
    title: part.title || '',
    content: part.content || '',
    description: part.description || '',
    condition: part.condition || ''
  });

  const [availableParameters, setAvailableParameters] = useState<string[]>([]);

  useEffect(() => {
    // Load available parameters for autocomplete
    const loadParameters = async () => {
      try {
        const response = await fetch('/api/admin/parameters');
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            const params = result.data.map((p: any) => p.id).filter((id: string) => id.startsWith('employment_'));
            setAvailableParameters(params);
          }
        }
      } catch (error) {
        console.error('Error loading parameters:', error);
      }
    };

    loadParameters();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const updatedPart = {
      ...part,
      title: formData.title,
      content: formData.content,
      description: formData.description || null,
      condition: formData.condition || undefined
    };

    onSave(updatedPart);
  };

  const handleContentChange = (content: string) => {
    setFormData(prev => ({ ...prev, content }));
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Edit {part.type === 'introduction' ? 'Introduction' : part.type === 'clause' ? 'Clause' : 'Paragraph'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter title..."
              required
            />
          </div>

          {/* Description (for clauses and paragraphs) */}
          {(part.type === 'clause' || part.type === 'paragraph') && (
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter description (optional)..."
                rows={3}
              />
            </div>
          )}

          {/* Condition (for clauses and paragraphs) */}
          {(part.type === 'clause' || part.type === 'paragraph') && (
            <div className="space-y-2">
              <Label htmlFor="condition">Condition</Label>
              <Input
                id="condition"
                value={formData.condition}
                onChange={(e) => setFormData(prev => ({ ...prev, condition: e.target.value }))}
                placeholder="Enter condition (optional, e.g., employment_mobility_relocation)..."
              />
              <p className="text-xs text-gray-600">
                Enter a parameter name or condition expression. Leave empty for unconditional parts.
              </p>
            </div>
          )}

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <div className="border border-gray-200 rounded-lg">
              <RichTextEditor
                content={formData.content}
                onChange={handleContentChange}
                availableParameters={availableParameters}
                placeholder="Enter content... Use @ to insert parameters."
              />
            </div>
            <p className="text-xs text-gray-600">
              Use @ to insert parameters. The editor supports HTML formatting including bold, italic, and lists.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
