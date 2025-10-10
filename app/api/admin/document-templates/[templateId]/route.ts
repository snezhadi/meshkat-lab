import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

// PATCH - Update template title only
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const supabase = createServerSupabaseClient();
    const { templateId } = await params;
    const { title } = await request.json();

    if (!templateId) {
      return NextResponse.json(
        { success: false, error: 'Template ID is required' },
        { status: 400 }
      );
    }

    if (!title || !title.trim()) {
      return NextResponse.json(
        { success: false, error: 'Template title is required' },
        { status: 400 }
      );
    }

    // Update only the template title
    const { error } = await supabase
      .from('templates')
      .update({
        title: title.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', parseInt(templateId));

    if (error) {
      console.error('Error updating template title:', error);
      throw new Error(`Failed to update template title: ${error.message}`);
    }

    console.log(`✅ Updated template title for template ${templateId}: "${title}"`);

    return NextResponse.json({
      success: true,
      message: 'Template title updated successfully',
    });
  } catch (error) {
    console.error('Error in PATCH /api/admin/document-templates/[templateId]:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update template title' },
      { status: 500 }
    );
  }
}

