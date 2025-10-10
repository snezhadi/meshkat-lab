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
    description: template.description,
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

// Transform frontend template to database format
function transformTemplateToDB(template: any) {
  return {
    title: template.title,
    description: template.description,
    active: template.active,
    llm_description: template.metadata?.llm_description
  };
}

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();

    // Fetch templates with their clauses and paragraphs
    const { data: templates, error: templatesError } = await supabase
      .from('templates')
      .select(`
        *,
        template_clauses (
          *,
          template_paragraphs (*)
        )
      `)
      .order('id');

    if (templatesError) {
      throw new Error(`Failed to fetch templates: ${templatesError.message}`);
    }

    // Transform data to match frontend format
    const transformedTemplates = templates.map(template => {
      const clauses = template.template_clauses || [];
      const paragraphs = clauses.flatMap(clause => clause.template_paragraphs || []);
      
      return transformTemplateFromDB(template, clauses, paragraphs);
    });

    console.log(`GET request - Retrieved ${transformedTemplates.length} templates from Supabase`);
    if (transformedTemplates.length > 0) {
      console.log(`Template IDs: ${transformedTemplates.map((t: any) => t.id).join(', ')}`);
    }

    return NextResponse.json({
      success: true,
      data: transformedTemplates,
    });
  } catch (error) {
    console.error('Error reading document templates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to read document templates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { documentTemplates, createCheckpoint } = await request.json();

    console.log(`POST request received - Templates count: ${documentTemplates?.length || 0}`);
    if (documentTemplates && documentTemplates.length > 0) {
      console.log(`Template IDs: ${documentTemplates.map((t: any) => t.id).join(', ')}`);
      
      // Check if this is just creating new templates (only templates with string IDs starting with 'new_template_')
      const hasExistingTemplates = documentTemplates.some((t: any) => 
        t.id && typeof t.id === 'number'
      );
      
      if (!hasExistingTemplates) {
        console.log('🚀 Detected new template creation only - processing only new templates');
      }
    }

    if (!documentTemplates) {
      return NextResponse.json(
        { success: false, error: 'Document templates data is required' },
        { status: 400 }
      );
    }

    // Start a transaction-like operation
    for (const template of documentTemplates) {
      const templateData = transformTemplateToDB(template);
      
      let templateId: number;
      
      // Check if template exists (for updates)
      const templateIdStr = template.id?.toString();
      const isNewTemplate = !templateIdStr || templateIdStr.startsWith('new_template_');
      
      if (template.id && typeof template.id === 'number' && !isNewTemplate) {
        // Update existing template
        const { data: existingTemplate, error: fetchError } = await supabase
          .from('templates')
          .select('id')
          .eq('id', parseInt(template.id))
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw new Error(`Failed to check existing template: ${fetchError.message}`);
        }

        if (existingTemplate) {
          // Update existing template
          const { error: updateError } = await supabase
            .from('templates')
            .update(templateData)
            .eq('id', template.id);

          if (updateError) {
            throw new Error(`Failed to update template: ${updateError.message}`);
          }

          templateId = parseInt(template.id);
          console.log(`Updated template: ${template.title} (ID: ${templateId})`);
        } else {
          throw new Error(`Template with ID ${template.id} not found`);
        }
      } else {
        // Create new template
        const { data: newTemplate, error: insertError } = await supabase
          .from('templates')
          .insert(templateData)
          .select()
          .single();

        if (insertError) {
          throw new Error(`Failed to create template: ${insertError.message}`);
        }

        templateId = newTemplate.id;
        console.log(`Created new template: ${template.title} (ID: ${templateId})`);
      }

      // Delete existing clauses and paragraphs for this template
      const { error: deleteClausesError } = await supabase
        .from('template_clauses')
        .delete()
        .eq('template_id', templateId);

      if (deleteClausesError) {
        throw new Error(`Failed to delete existing clauses: ${deleteClausesError.message}`);
      }

      // Insert introduction as a clause with sort_order = -1
      if (template.introduction) {
        const { error: introError } = await supabase
          .from('template_clauses')
          .insert({
            template_id: templateId,
            title: template.introduction.title,
            content: template.introduction.content,
            description: null,
            condition: template.introduction.condition || null,
            sort_order: -1,
            llm_description: template.introduction.metadata?.llm_description
          });

        if (introError) {
          throw new Error(`Failed to insert introduction: ${introError.message}`);
        }
      }

      // Insert clauses and their paragraphs
      for (let i = 0; i < template.clauses.length; i++) {
        const clause = template.clauses[i];
        
        const { data: clauseData, error: clauseError } = await supabase
          .from('template_clauses')
          .insert({
            template_id: templateId,
            title: clause.title,
            content: clause.content,
            description: clause.description,
            condition: clause.condition || null,
            sort_order: i,
            llm_description: clause.metadata?.llm_description
          })
          .select()
          .single();

        if (clauseError) {
          throw new Error(`Failed to insert clause: ${clauseError.message}`);
        }

        const clauseId = clauseData.id;

        // Insert paragraphs
        for (let j = 0; j < clause.paragraphs.length; j++) {
          const paragraph = clause.paragraphs[j];
          
          const { error: paragraphError } = await supabase
            .from('template_paragraphs')
            .insert({
              clause_id: clauseId,
              title: paragraph.title,
              content: paragraph.content,
              description: paragraph.description,
              condition: paragraph.condition || null,
              sort_order: j,
              llm_description: paragraph.metadata?.llm_description
            });

          if (paragraphError) {
            throw new Error(`Failed to insert paragraph: ${paragraphError.message}`);
          }
        }
      }
    }

    console.log(`Document templates saved successfully. Count: ${documentTemplates.length}`);

    // For new template creation, return the created template with its new ID
    let createdTemplate = null;
    if (documentTemplates.length === 1 && documentTemplates[0].id && typeof documentTemplates[0].id === 'string' && documentTemplates[0].id.startsWith('new_template_')) {
      // This is a new template creation, find the created template
      const newTemplateId = documentTemplates[0].id;
      const { data: templates } = await supabase
        .from('templates')
        .select('*')
        .order('id', { ascending: false })
        .limit(1);
      
      if (templates && templates.length > 0) {
        createdTemplate = templates[0];
        console.log(`Returning created template with ID: ${createdTemplate.id}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Document templates saved successfully',
      checkpoint: createCheckpoint
        ? `document-templates-checkpoint-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
        : null,
      templateCount: documentTemplates.length,
      template: createdTemplate, // Include the created template with new ID
    });
  } catch (error) {
    console.error('Error saving document templates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save document templates' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { url } = request;
    const templateId = new URL(url).searchParams.get('templateId');

    if (!templateId) {
      return NextResponse.json(
        { success: false, error: 'Template ID is required' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Delete template (cascade will handle clauses and paragraphs)
    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', parseInt(templateId));

    if (error) {
      throw new Error(`Failed to delete template: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}
