import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

// Transform database parameter to frontend format
function transformParameterFromDB(param: any): any {
  return {
    id: param.custom_id,
    name: param.name,
    description: param.description,
    type: param.type_name || 'text',
    metadata: {
      llm_instructions: param.llm_instructions,
      llm_description: param.llm_description,
      priority: param.priority_level || 1,
      format: param.format,
    },
    condition: param.condition,
    display: {
      group: param.group_name || null,
      subgroup: param.subgroup_name || null,
      label: param.display_label,
      input: param.input_type_name || 'textbox',
    },
    options: param.options ? param.options.split(',') : undefined,
    defaults: {
      global_default: param.global_default,
      jurisdictions: [], // Skip for now as requested
    },
  };
}

// Transform frontend parameter to database format
function transformParameterToDB(param: any, templateId: number): any {
  return {
    template_id: templateId,
    custom_id: param.id,
    name: param.name,
    description: param.description,
    llm_instructions: param.metadata?.llm_instructions,
    llm_description: param.metadata?.llm_description,
    format: param.metadata?.format,
    condition: param.condition || null,
    display_label: param.display?.label || param.name,
    options: param.options ? param.options.join(',') : null,
    global_default: param.defaults?.global_default || null,
  };
}

// GET /api/admin/parameters - Load parameters and config
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('templateId');

    if (!templateId) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    // 🚀 PERFORMANCE: Use parameters_full view - single efficient query!
    const { data: parameters, error: parametersError } = await supabase
      .from('parameters_full')
      .select('*')
      .eq('template_id', parseInt(templateId))
      .order('id');

    if (parametersError) {
      throw new Error(`Failed to fetch parameters: ${parametersError.message}`);
    }

    // Fetch configuration for dropdowns
    const [
      { data: parameterTypes, error: typesError },
      { data: inputTypes, error: inputError },
      { data: priorityLevels, error: priorityError },
      { data: groups, error: groupsError },
      { data: subgroups, error: subgroupsError },
    ] = await Promise.all([
      supabase.from('parameter_types').select('name').order('sort_order'),
      supabase.from('input_types').select('name').order('sort_order'),
      supabase.from('priority_levels').select('level').order('sort_order'),
      supabase.from('parameter_groups').select('name').eq('template_id', parseInt(templateId)).order('sort_order'),
      supabase.from('parameter_subgroups').select('name').eq('template_id', parseInt(templateId)).order('sort_order'),
    ]);

    if (typesError || inputError || priorityError || groupsError || subgroupsError) {
      console.warn('Some configuration data could not be loaded');
    }

    // Transform parameters to frontend format using JOIN results
    const transformedParameters = (parameters || []).map(param => ({
      id: param.custom_id, // Keep custom_id as id for frontend compatibility
      dbId: param.id, // Add database primary key for API operations
      name: param.name,
      description: param.description,
      type: param.type_name || 'text',
      metadata: {
        llm_instructions: param.llm_instructions,
        llm_description: param.llm_description,
        priority: param.priority_level || 1,
        format: param.format,
      },
      condition: param.condition,
      display: {
        group: param.group_name || null,
        subgroup: param.subgroup_name || null,
        label: param.display_label,
        input: param.input_type_name || 'textbox',
      },
      options: param.options ? param.options.split(',') : undefined,
      defaults: {
        global_default: param.global_default,
        jurisdictions: [],
      },
    }));

    // Build config object with proper subgroup grouping and deduplication
    const subgroupsMap = new Map<string, Set<string>>();
    
    // First, collect all subgroups and group them properly
    if (subgroups) {
      for (const sg of subgroups) {
        // Find the group this subgroup belongs to
        const group = groups.find((g: any) => g.id === sg.group_id);
        if (group) {
          if (!subgroupsMap.has(group.name)) {
            subgroupsMap.set(group.name, new Set());
          }
          subgroupsMap.get(group.name)!.add(sg.name);
        }
      }
    }
    
    // Convert to the expected format
    const subgroupsConfig: Record<string, string[]> = {};
    for (const [group, subgroupSet] of subgroupsMap) {
      subgroupsConfig[group] = Array.from(subgroupSet).sort();
    }
    
    const config = {
      groups: groups?.map(g => g.name) || [],
      subgroups: subgroupsConfig,
    };

    console.log(`GET request - Retrieved ${transformedParameters.length} parameters for template ${templateId}`);

    return NextResponse.json({
      parameters: transformedParameters,
      config,
    });
  } catch (error) {
    console.error('Error loading parameters:', error);
    return NextResponse.json({ error: 'Failed to load parameters' }, { status: 500 });
  }
}

// POST /api/admin/parameters - Save parameters
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { parameters, templateId } = await request.json();

    // Validate the data
    if (!Array.isArray(parameters)) {
      return NextResponse.json({ error: 'Parameters must be an array' }, { status: 400 });
    }

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }

    console.log(`POST request - Saving ${parameters.length} parameters for template ${templateId}`);

    // Get reference data for lookups
    const [
      { data: parameterTypes },
      { data: inputTypes },
      { data: priorityLevels },
      { data: groups },
      { data: subgroups },
    ] = await Promise.all([
      supabase.from('parameter_types').select('id, name'),
      supabase.from('input_types').select('id, name'),
      supabase.from('priority_levels').select('id, level'),
      supabase.from('parameter_groups').select('id, name').eq('template_id', parseInt(templateId)),
      supabase.from('parameter_subgroups').select('id, name').eq('template_id', parseInt(templateId)),
    ]);

    // Create lookup maps
    const typeMap = new Map(parameterTypes?.map(t => [t.name, t.id]) || []);
    const inputMap = new Map(inputTypes?.map(i => [i.name, i.id]) || []);
    const priorityMap = new Map(priorityLevels?.map(p => [p.level, p.id]) || []);
    const groupMap = new Map(groups?.map(g => [g.name, g.id]) || []);
    const subgroupMap = new Map(subgroups?.map(sg => [sg.name, sg.id]) || []);

    // Delete existing parameters for this template
    const { error: deleteError } = await supabase
      .from('parameters')
      .delete()
      .eq('template_id', parseInt(templateId));

    if (deleteError) {
      throw new Error(`Failed to delete existing parameters: ${deleteError.message}`);
    }

    // Insert new parameters
    for (const param of parameters) {
      const paramData = transformParameterToDB(param, parseInt(templateId));

      // Add foreign key references
      paramData.type_id = typeMap.get(param.type) || null;
      paramData.display_input_id = inputMap.get(param.display?.input) || null;
      paramData.priority_id = priorityMap.get(param.metadata?.priority) || null;
      paramData.display_group_id = groupMap.get(param.display?.group) || null;
      paramData.display_subgroup_id = subgroupMap.get(param.display?.subgroup) || null;

      const { error: insertError } = await supabase
        .from('parameters')
        .insert(paramData);

      if (insertError) {
        throw new Error(`Failed to insert parameter ${param.id}: ${insertError.message}`);
      }
    }

    console.log(`Parameters saved successfully for template ${templateId}`);

    return NextResponse.json({
      success: true,
      message: 'Parameters saved successfully',
      parameterCount: parameters.length,
    });
  } catch (error) {
    console.error('Error saving parameters:', error);
    return NextResponse.json({ error: 'Failed to save parameters' }, { status: 500 });
  }
}
