import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

// POST - Create a new clause
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { template_id, title, content, description, condition, llm_description, sort_order } = await request.json();
    
    console.log('POST clause request - template_id:', template_id, 'data:', { title, content, description, condition, llm_description, sort_order });

    if (!template_id || !title) {
      return NextResponse.json(
        { success: false, error: 'Template ID and title are required' },
        { status: 400 }
      );
    }

    // Create the clause
    const { data: newClause, error } = await supabase
      .from('template_clauses')
      .insert({
        template_id,
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
      throw new Error(`Failed to create clause: ${error.message}`);
    }

    console.log(`✅ Created clause ${newClause.id}: "${newClause.title}"`);

    return NextResponse.json({
      success: true,
      data: newClause,
      message: 'Clause created successfully',
    });
  } catch (error) {
    console.error('Error creating clause:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create clause' },
      { status: 500 }
    );
  }
}

// GET - Fetch a specific clause
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const clauseId = searchParams.get('clauseId');
    
    console.log('GET clause request - clauseId:', clauseId);

    if (!clauseId) {
      return NextResponse.json(
        { success: false, error: 'Clause ID is required' },
        { status: 400 }
      );
    }

    const { data: clause, error } = await supabase
      .from('template_clauses')
      .select('*')
      .eq('id', clauseId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch clause: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      data: clause,
    });
  } catch (error) {
    console.error('Error fetching clause:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch clause' },
      { status: 500 }
    );
  }
}

// PUT - Update a specific clause
export async function PUT(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { clauseId, ...clauseData } = await request.json();
    
    console.log('PUT clause request - clauseId:', clauseId, 'data:', clauseData);

    if (!clauseId) {
      return NextResponse.json(
        { success: false, error: 'Clause ID is required' },
        { status: 400 }
      );
    }

    // Handle both integer IDs (from database) and string IDs (temporary frontend IDs)
    let actualClauseId = clauseId;
    
    // If clauseId is a string (temporary ID), we need to find the actual database ID
    if (typeof clauseId === 'string' && isNaN(Number(clauseId))) {
      console.log('Temporary string ID detected, this should not happen in production');
      return NextResponse.json(
        { success: false, error: 'Invalid clause ID format. Please refresh the page and try again.' },
        { status: 400 }
      );
    }
    
    // Convert to integer if it's a string number
    actualClauseId = parseInt(clauseId);

    // Prepare update data
    const updateData: any = {
      title: clauseData.title,
      content: clauseData.content,
      description: clauseData.description,
      condition: clauseData.condition,
      llm_description: clauseData.llm_description,
      updated_at: new Date().toISOString(),
    };

    // Only include sort_order if it's explicitly provided (including 0)
    if (clauseData.sort_order !== undefined) {
      updateData.sort_order = clauseData.sort_order;
    }

    // Update the clause
    const { data: updatedClause, error } = await supabase
      .from('template_clauses')
      .update(updateData)
      .eq('id', actualClauseId)
      .select()
      .single();

    if (error) {
      console.error('Supabase update error:', error);
      throw new Error(`Failed to update clause: ${error.message}`);
    }

    console.log(`✅ Updated clause ${clauseId}: "${updatedClause.title}"`);

    return NextResponse.json({
      success: true,
      data: updatedClause,
      message: 'Clause updated successfully',
    });
  } catch (error) {
    console.error('Error updating clause:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update clause' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a specific clause
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const clauseId = searchParams.get('clauseId');
    
    console.log('DELETE clause request - clauseId:', clauseId);

    if (!clauseId) {
      return NextResponse.json(
        { success: false, error: 'Clause ID is required' },
        { status: 400 }
      );
    }

    // Convert to integer if it's a string number
    const actualClauseId = parseInt(clauseId);

    // Delete the clause (paragraphs will be deleted automatically due to CASCADE)
    const { error } = await supabase
      .from('template_clauses')
      .delete()
      .eq('id', actualClauseId);

    if (error) {
      console.error('Supabase delete error:', error);
      throw new Error(`Failed to delete clause: ${error.message}`);
    }

    console.log(`✅ Deleted clause ${clauseId}`);

    return NextResponse.json({
      success: true,
      message: 'Clause deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting clause:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete clause' },
      { status: 500 }
    );
  }
}
