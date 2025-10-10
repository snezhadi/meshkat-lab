import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

// POST - Create a new paragraph
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { clause_id, title, content, description, condition, llm_description, sort_order } = await request.json();
    
    console.log('POST paragraph request - clause_id:', clause_id, 'data:', { title, content, description, condition, llm_description, sort_order });

    if (!clause_id || !title) {
      return NextResponse.json(
        { success: false, error: 'Clause ID and title are required' },
        { status: 400 }
      );
    }

    // Create the paragraph
    const { data: newParagraph, error } = await supabase
      .from('template_paragraphs')
      .insert({
        clause_id,
        title,
        content,
        description,
        condition,
        llm_description,
        sort_order: sort_order || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      throw new Error(`Failed to create paragraph: ${error.message}`);
    }

    console.log(`✅ Created paragraph ${newParagraph.id}: "${newParagraph.title}"`);

    return NextResponse.json({
      success: true,
      data: newParagraph,
      message: 'Paragraph created successfully',
    });
  } catch (error) {
    console.error('Error creating paragraph:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create paragraph' },
      { status: 500 }
    );
  }
}

// GET - Fetch a specific paragraph
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const paragraphId = searchParams.get('paragraphId');

    if (!paragraphId) {
      return NextResponse.json(
        { success: false, error: 'Paragraph ID is required' },
        { status: 400 }
      );
    }

    const { data: paragraph, error } = await supabase
      .from('template_paragraphs')
      .select('*')
      .eq('id', paragraphId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch paragraph: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      data: paragraph,
    });
  } catch (error) {
    console.error('Error fetching paragraph:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch paragraph' },
      { status: 500 }
    );
  }
}

// PUT - Update a specific paragraph
export async function PUT(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { paragraphId, ...paragraphData } = await request.json();

    if (!paragraphId) {
      return NextResponse.json(
        { success: false, error: 'Paragraph ID is required' },
        { status: 400 }
      );
    }

    // Handle both integer IDs (from database) and string IDs (temporary frontend IDs)
    let actualParagraphId = paragraphId;
    
    // If paragraphId is a string (temporary ID), we need to find the actual database ID
    if (typeof paragraphId === 'string' && isNaN(Number(paragraphId))) {
      console.log('Temporary string ID detected for paragraph, this should not happen in production');
      return NextResponse.json(
        { success: false, error: 'Invalid paragraph ID format. Please refresh the page and try again.' },
        { status: 400 }
      );
    }
    
    // Convert to integer if it's a string number
    actualParagraphId = parseInt(paragraphId);

    // Prepare update data
    const updateData: any = {
      title: paragraphData.title,
      content: paragraphData.content,
      description: paragraphData.description,
      condition: paragraphData.condition,
      llm_description: paragraphData.llm_description,
      updated_at: new Date().toISOString(),
    };

    // Only include sort_order if it's explicitly provided (including 0)
    if (paragraphData.sort_order !== undefined) {
      updateData.sort_order = paragraphData.sort_order;
    }

    // Update the paragraph
    const { data: updatedParagraph, error } = await supabase
      .from('template_paragraphs')
      .update(updateData)
      .eq('id', actualParagraphId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update paragraph: ${error.message}`);
    }

    console.log(`✅ Updated paragraph ${paragraphId}: "${updatedParagraph.title}"`);

    return NextResponse.json({
      success: true,
      data: updatedParagraph,
      message: 'Paragraph updated successfully',
    });
  } catch (error) {
    console.error('Error updating paragraph:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update paragraph' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a specific paragraph
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const paragraphId = searchParams.get('paragraphId');
    
    console.log('DELETE paragraph request - paragraphId:', paragraphId);

    if (!paragraphId) {
      return NextResponse.json(
        { success: false, error: 'Paragraph ID is required' },
        { status: 400 }
      );
    }

    // Convert to integer if it's a string number
    const actualParagraphId = parseInt(paragraphId);

    // Delete the paragraph
    const { error } = await supabase
      .from('template_paragraphs')
      .delete()
      .eq('id', actualParagraphId);

    if (error) {
      console.error('Supabase delete error:', error);
      throw new Error(`Failed to delete paragraph: ${error.message}`);
    }

    console.log(`✅ Deleted paragraph ${paragraphId}`);

    return NextResponse.json({
      success: true,
      message: 'Paragraph deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting paragraph:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete paragraph' },
      { status: 500 }
    );
  }
}
