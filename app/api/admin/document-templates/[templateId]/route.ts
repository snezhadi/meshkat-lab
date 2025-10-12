import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

// Transform database template to frontend format
function transformTemplateFromDB(template: any, clauses: any[], paragraphs: any[]): any {
  // Group paragraphs by clause_id
  const paragraphsByClause = paragraphs.reduce((acc, paragraph) => {
    if (!acc[paragraph.clause_id]) {
      acc[paragraph.clause_id] = [];
    }
    acc[paragraph.clause_id].push({
      id: paragraph.id,
      title: paragraph.title,
      content: paragraph.content,
      description: paragraph.description,
      condition: paragraph.condition,
      sort_order: paragraph.sort_order,
      metadata: paragraph.llm_description ? { llm_description: paragraph.llm_description } : {}
    });
    return acc;
  }, {} as Record<number, any[]>);

  // Transform clauses with their paragraphs
  const transformedClauses = clauses
    .filter(clause => clause.sort_order >= 0) // Exclude introduction (sort_order = -1)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(clause => ({
      id: clause.id,
      title: clause.title,
      content: clause.content,
      description: clause.description,
      condition: clause.condition,
      sort_order: clause.sort_order,
      metadata: clause.llm_description ? { llm_description: clause.llm_description } : {},
      paragraphs: (paragraphsByClause[clause.id] || [])
        .sort((a, b) => a.sort_order - b.sort_order)
    }));

  // Get introduction clause (sort_order = -1)
  const introductionClause = clauses.find(clause => clause.sort_order === -1);

  return {
    id: template.id,
    title: template.title,
    version: "1.0", // Default version for compatibility
    active: template.active,
    metadata: template.llm_description ? { llm_description: template.llm_description } : {},
    introduction: introductionClause ? {
      id: introductionClause.id,
      title: introductionClause.title,
      content: introductionClause.content,
      description: introductionClause.description,
      condition: introductionClause.condition,
      sort_order: introductionClause.sort_order,
      metadata: introductionClause.llm_description ? { llm_description: introductionClause.llm_description } : {}
    } : {
      id: `${template.id}_introduction`,
      title: "Introduction",
      content: "",
      description: null,
      condition: undefined,
      sort_order: -1,
      metadata: {}
    },
    clauses: transformedClauses
  };
}

// GET - Fetch a single template by ID
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ templateId: string }> | { templateId: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    // Handle both async and sync params for Next.js 15 compatibility
    const resolvedParams = context.params instanceof Promise ? await context.params : context.params;
    const { templateId } = resolvedParams;

    if (!templateId) {
      return NextResponse.json(
        { success: false, error: 'Template ID is required' },
        { status: 400 }
      );
    }

    const templateIdNum = parseInt(templateId);
    if (isNaN(templateIdNum)) {
      return NextResponse.json(
        { success: false, error: 'Invalid template ID' },
        { status: 400 }
      );
    }

    console.log(`🔍 GET single template by ID: ${templateId}`);

    // 🚀 PERFORMANCE: Fetch only the specific template, not all templates!
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .select('*')
      .eq('id', templateIdNum)
      .single();

    if (templateError || !template) {
      console.error('❌ Template not found:', templateId, templateError);
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    // Fetch clauses for this template only
    const { data: clauses, error: clausesError } = await supabase
      .from('template_clauses')
      .select('*')
      .eq('template_id', templateIdNum)
      .order('sort_order');

    if (clausesError) {
      throw new Error(`Failed to fetch clauses: ${clausesError.message}`);
    }

    // Fetch paragraphs for these clauses
    const clauseIds = (clauses || []).map(c => c.id);
    let paragraphs: any[] = [];
    
    if (clauseIds.length > 0) {
      const { data: paragraphsData, error: paragraphsError } = await supabase
        .from('template_paragraphs')
        .select('*')
        .in('clause_id', clauseIds)
        .order('sort_order');

      if (paragraphsError) {
        throw new Error(`Failed to fetch paragraphs: ${paragraphsError.message}`);
      }
      
      paragraphs = paragraphsData || [];
    }

    // Transform to frontend format
    const transformedTemplate = transformTemplateFromDB(template, clauses || [], paragraphs);

    console.log(`✅ Retrieved template: ${template.title} with ${(clauses || []).length} clauses and ${paragraphs.length} paragraphs`);

    return NextResponse.json({
      success: true,
      data: transformedTemplate,
    });
  } catch (error) {
    console.error('Error fetching template:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch template' },
      { status: 500 }
    );
  }
}

// PATCH - Update template title only (lightweight update)
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ templateId: string }> | { templateId: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    // Handle both async and sync params for Next.js 15 compatibility
    const resolvedParams = context.params instanceof Promise ? await context.params : context.params;
    const { templateId } = resolvedParams;
    const { title } = await request.json();

    if (!templateId) {
      return NextResponse.json(
        { success: false, error: 'Template ID is required' },
        { status: 400 }
      );
    }

    if (!title || !title.trim()) {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      );
    }

    const templateIdNum = parseInt(templateId);
    if (isNaN(templateIdNum)) {
      return NextResponse.json(
        { success: false, error: 'Invalid template ID' },
        { status: 400 }
      );
    }

    // Update only the title
    const { error } = await supabase
      .from('templates')
      .update({ 
        title: title.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', templateIdNum);

    if (error) {
      throw new Error(`Failed to update template: ${error.message}`);
    }

    console.log(`✅ Updated template title: ${title}`);

    return NextResponse.json({
      success: true,
      message: 'Template title updated successfully',
    });
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update template' },
      { status: 500 }
    );
  }
}
