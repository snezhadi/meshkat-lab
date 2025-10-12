import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

// GET - Fetch a specific parameter by database ID
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ parameterId: string }> | { parameterId: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    // Handle both async and sync params for Next.js 15 compatibility
    const resolvedParams = context.params instanceof Promise ? await context.params : context.params;
    const { parameterId } = resolvedParams;

    if (!parameterId) {
      return NextResponse.json(
        { success: false, error: 'Parameter ID is required' },
        { status: 400 }
      );
    }

    // Fetch parameter using database ID (not custom_id)
    // Convert parameterId to integer since it comes from URL as string
    const paramId = parseInt(parameterId);
    console.log('🔍 GET parameter by ID:', parameterId, '→', paramId);
    
    if (isNaN(paramId)) {
      console.error('❌ Invalid parameter ID:', parameterId);
      return NextResponse.json(
        { success: false, error: 'Invalid parameter ID' },
        { status: 400 }
      );
    }

    console.log('📡 Fetching parameter from database using view...');
    // 🚀 PERFORMANCE: Use parameters_full view - single query instead of 6!
    const { data: param, error } = await supabase
      .from('parameters_full')
      .select('*')
      .eq('id', paramId)
      .single();

    console.log('📊 Query result:', { found: !!param, error });

    if (error || !param) {
      console.error('❌ Parameter not found:', parameterId, error);
      return NextResponse.json(
        { success: false, error: 'Parameter not found' },
        { status: 404 }
      );
    }

    // Transform to frontend format (much simpler now!)
    const transformedParameter = {
      id: param.custom_id,
      dbId: param.id,
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
        label: param.display_label || param.name,
        input: param.input_type_name || 'text',
      },
      options: param.options ? param.options.split(',') : [],
      defaults: {
        global_default: param.global_default,
      },
    };

    // 🚀 PERFORMANCE: Fetch config and jurisdictions directly from database (no internal HTTP calls!)
    const [
      { data: parameterTypes },
      { data: inputTypes },
      { data: priorityLevels },
      { data: groups },
      { data: subgroups },
      { data: jurisdictions },
      { data: jurisdictionDefaults },
    ] = await Promise.all([
      supabase.from('parameter_types').select('*').order('sort_order'),
      supabase.from('input_types').select('*').order('sort_order'),
      supabase.from('priority_levels').select('*').order('level'),
      supabase.from('parameter_groups').select('*').eq('template_id', param.template_id).order('sort_order'),
      supabase.from('parameter_subgroups').select('*').eq('template_id', param.template_id).order('sort_order'),
      supabase.from('jurisdictions').select('*').order('name'),
      supabase.from('parameter_defaults').select('*, jurisdictions(name)').eq('parameter_id', paramId),
    ]);

    // Build config object with proper subgroup grouping
    const subgroupsMap = new Map<string, Set<string>>();
    (subgroups || []).forEach((subgroup: any) => {
      // Find the group this subgroup belongs to
      const group = (groups || []).find((g: any) => g.id === subgroup.group_id);
      if (group) {
        if (!subgroupsMap.has(group.name)) {
          subgroupsMap.set(group.name, new Set());
        }
        subgroupsMap.get(group.name)!.add(subgroup.name);
      }
    });

    const config = {
      groups: (groups || []).map((g: any) => g.name),
      subgroups: Object.fromEntries(
        Array.from(subgroupsMap.entries()).map(([group, subgroupSet]) => [
          group,
          Array.from(subgroupSet),
        ])
      ),
    };

    // Add jurisdiction defaults to the transformed parameter
    transformedParameter.defaults.jurisdictions = (jurisdictionDefaults || []).map((jd: any) => ({
      jurisdiction: jd.jurisdictions?.name || '',
      default: jd.default_value
    }));

    return NextResponse.json({
      success: true,
      parameter: transformedParameter,
      templateId: param.template_id.toString(),
      config: config,
      jurisdictions: (jurisdictions || []).map((j: any) => ({
        jurisdiction: j.name,
        country: j.country || '',
        code: j.code,
      })),
    });
  } catch (error) {
    console.error('Error fetching parameter:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch parameter' },
      { status: 500 }
    );
  }
}

// PUT - Update a specific parameter
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ parameterId: string }> | { parameterId: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    // Handle both async and sync params for Next.js 15 compatibility
    const resolvedParams = context.params instanceof Promise ? await context.params : context.params;
    const { parameterId } = resolvedParams;
    const parameterData = await request.json();

    console.log('🔍 PUT /api/admin/parameters/[parameterId] - Received:', {
      parameterId,
      parameterData
    });

    if (!parameterId) {
      console.error('❌ Parameter ID is missing');
      return NextResponse.json(
        { success: false, error: 'Parameter ID is required' },
        { status: 400 }
      );
    }

    // Look up foreign key IDs
    console.log('🔍 Looking up foreign key IDs...');
    console.log('🔍 parameterData.type:', parameterData.type);
    console.log('🔍 parameterData.input_type:', parameterData.input_type);
    console.log('🔍 parameterData.priority:', parameterData.priority, 'type:', typeof parameterData.priority);
    
    const typeId = parameterData.type ? await getParameterTypeId(supabase, parameterData.type) : null;
    console.log('🔍 typeId result:', typeId);
    
    const inputTypeId = parameterData.input_type ? await getInputTypeId(supabase, parameterData.input_type) : null;
    console.log('🔍 inputTypeId result:', inputTypeId);
    
    console.log('🔍 About to call getPriorityId with:', parameterData.priority);
    const priorityId = parameterData.priority ? await getPriorityId(supabase, parameterData.priority) : null;
    console.log('🔍 priorityId result:', priorityId);
    
    // Handle optional display fields - only create groups/subgroups if explicitly provided
    let actualGroupId = null;
    let actualSubgroupId = null;
    
    if (parameterData.display_group) {
      console.log('🔍 Processing display_group:', parameterData.display_group);
      console.log('🔍 template_id for group lookup:', parameterData.template_id, typeof parameterData.template_id);
      const parsedTemplateId = parseInt(parameterData.template_id);
      console.log('🔍 parsed template_id:', parsedTemplateId);
      
      const groupId = await getGroupId(supabase, parsedTemplateId, parameterData.display_group);
      console.log('🔍 groupId result:', groupId);
      
      if (!groupId) {
        // Create the group if it doesn't exist
        const { data: newGroup } = await supabase
          .from('parameter_groups')
          .insert({
            template_id: parseInt(parameterData.template_id),
            name: parameterData.display_group,
            sort_order: 0
          })
          .select()
          .single();
        actualGroupId = newGroup?.id;
      } else {
        actualGroupId = groupId;
      }
      
      // Only create subgroup if group exists and subgroup is provided
      if (actualGroupId && parameterData.display_subgroup) {
        const subgroupId = await getSubgroupId(supabase, actualGroupId, parameterData.display_subgroup);
        
        if (!subgroupId) {
          // Create the subgroup if it doesn't exist
          const { data: newSubgroup } = await supabase
            .from('parameter_subgroups')
            .insert({
              group_id: actualGroupId,
              name: parameterData.display_subgroup,
              sort_order: 0
            })
            .select()
            .single();
          actualSubgroupId = newSubgroup?.id;
        } else {
          actualSubgroupId = subgroupId;
        }
      }
    }

    // Update the parameter
    const updateData = {
      custom_id: parameterData.custom_id,
      name: parameterData.name,
      description: parameterData.description,
      type_id: typeId,
      display_input_id: inputTypeId, // Can be null if not provided
      priority_id: priorityId,
      display_group_id: actualGroupId, // Can be null if not provided
      display_subgroup_id: actualSubgroupId, // Can be null if not provided
      display_label: parameterData.display_label,
      options: parameterData.options ? parameterData.options.join(',') : null,
      condition: parameterData.condition, // Add condition field
      format: parameterData.format, // Add format field
      global_default: parameterData.global_default, // Add global_default field
      llm_instructions: parameterData.llm_instructions,
      llm_description: parameterData.llm_description,
      updated_at: new Date().toISOString(),
    };

    console.log('🔍 About to update parameter in database:', {
      parameterId,
      updateData,
      typeId,
      inputTypeId,
      priorityId,
      actualGroupId,
      actualSubgroupId
    });

    // First, update the parameter using database ID
    console.log('🔍 Executing database update...');
    const { error: updateError } = await supabase
      .from('parameters')
      .update(updateData)
      .eq('id', parameterId);

    if (updateError) {
      console.error('❌ Database update error:', updateError);
      throw new Error(`Failed to update parameter: ${updateError.message}`);
    }
    
    console.log('✅ Database update successful');

    // Handle jurisdiction defaults if provided
    console.log('🔍 Checking jurisdiction_defaults:', {
      exists: !!parameterData.jurisdiction_defaults,
      isArray: Array.isArray(parameterData.jurisdiction_defaults),
      length: parameterData.jurisdiction_defaults?.length,
      data: parameterData.jurisdiction_defaults
    });
    
    if (parameterData.jurisdiction_defaults && Array.isArray(parameterData.jurisdiction_defaults)) {
      console.log('🔍 Processing jurisdiction defaults:', JSON.stringify(parameterData.jurisdiction_defaults, null, 2));
      
      // First, delete existing jurisdiction defaults for this parameter
      console.log('🗑️ Deleting existing jurisdiction defaults...');
      const { error: deleteError } = await supabase
        .from('parameter_defaults')
        .delete()
        .eq('parameter_id', parameterId);

      if (deleteError) {
        console.error('❌ Error deleting existing jurisdiction defaults:', deleteError);
        throw new Error(`Failed to delete existing jurisdiction defaults: ${deleteError.message}`);
      }
      console.log('✅ Existing jurisdiction defaults deleted');

      // Insert new jurisdiction defaults
      if (parameterData.jurisdiction_defaults.length > 0) {
        // Get jurisdiction IDs for the jurisdiction names
        console.log('🔍 Fetching jurisdictions from database...');
        const { data: jurisdictions } = await supabase
          .from('jurisdictions')
          .select('id, name');
        console.log('📍 Available jurisdictions:', jurisdictions?.length);

        const jurisdictionDefaultsToInsert = [];
        
        for (const jd of parameterData.jurisdiction_defaults) {
          console.log('🔍 Processing jurisdiction default:', jd);
          if (jd.jurisdiction && jd.default !== undefined && jd.default !== '') {
            // Find the jurisdiction ID by name
            const jurisdiction = jurisdictions?.find((j: any) => j.name === jd.jurisdiction);
            console.log('🔍 Found jurisdiction:', jurisdiction);
            if (jurisdiction) {
              jurisdictionDefaultsToInsert.push({
                parameter_id: parameterId,
                jurisdiction_id: jurisdiction.id,
                default_value: jd.default
              });
            } else {
              console.log('⚠️ Jurisdiction not found:', jd.jurisdiction);
            }
          } else {
            console.log('⚠️ Skipping invalid jurisdiction default:', jd);
          }
        }

        console.log('📦 Jurisdiction defaults to insert:', jurisdictionDefaultsToInsert.length);
        if (jurisdictionDefaultsToInsert.length > 0) {
          console.log('💾 Inserting jurisdiction defaults:', JSON.stringify(jurisdictionDefaultsToInsert, null, 2));
          const { error: insertError } = await supabase
            .from('parameter_defaults')
            .insert(jurisdictionDefaultsToInsert);

          if (insertError) {
            console.error('❌ Error inserting jurisdiction defaults:', insertError);
            throw new Error(`Failed to insert jurisdiction defaults: ${insertError.message}`);
          }
          console.log('✅ Successfully saved jurisdiction defaults');
        } else {
          console.log('ℹ️ No valid jurisdiction defaults to insert');
        }
      } else {
        console.log('ℹ️ No jurisdiction defaults provided (empty array)');
      }
    } else {
      console.log('ℹ️ No jurisdiction defaults to process');
    }

    // Then, fetch the updated parameter using database ID
    console.log('🔍 Fetching updated parameter...');
    const { data: updatedParameters, error: fetchError } = await supabase
      .from('parameters')
      .select('*')
      .eq('id', parameterId);

    if (fetchError) {
      console.error('❌ Database fetch error:', fetchError);
      throw new Error(`Failed to fetch updated parameter: ${fetchError.message}`);
    }

    if (!updatedParameters || updatedParameters.length === 0) {
      console.error('❌ No parameter found after update');
      throw new Error(`Parameter with id "${parameterId}" not found after update`);
    }

    const updatedParameter = updatedParameters[0];
    console.log('✅ Successfully fetched updated parameter:', updatedParameter.name);

    return NextResponse.json({
      success: true,
      data: updatedParameter,
      message: 'Parameter updated successfully',
    });
  } catch (error) {
    console.error('❌ Error updating parameter:', error);
    console.error('❌ Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { success: false, error: `Failed to update parameter: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

// DELETE - Delete a specific parameter
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ parameterId: string }> | { parameterId: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    // Handle both async and sync params for Next.js 15 compatibility
    const resolvedParams = context.params instanceof Promise ? await context.params : context.params;
    const parameterId = resolvedParams.parameterId;
    
    console.log('DELETE parameter request - parameterId:', parameterId);

    if (!parameterId) {
      return NextResponse.json(
        { success: false, error: 'Parameter ID is required' },
        { status: 400 }
      );
    }

    // Convert to integer if it's a string number
    const actualParameterId = parseInt(parameterId);

    // Delete the parameter
    const { error } = await supabase
      .from('parameters')
      .delete()
      .eq('id', actualParameterId);

    if (error) {
      console.error('Supabase delete error:', error);
      throw new Error(`Failed to delete parameter: ${error.message}`);
    }

    console.log(`✅ Deleted parameter ${parameterId}`);

    return NextResponse.json({
      success: true,
      message: 'Parameter deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting parameter:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete parameter' },
      { status: 500 }
    );
  }
}

// Helper functions for foreign key lookups
async function getParameterTypeId(supabase: any, typeName: string): Promise<number | null> {
  const { data } = await supabase
    .from('parameter_types')
    .select('id')
    .eq('name', typeName)
    .single();
  return data?.id || null;
}

async function getInputTypeId(supabase: any, inputTypeName: string): Promise<number | null> {
  const { data } = await supabase
    .from('input_types')
    .select('id')
    .eq('name', inputTypeName)
    .single();
  return data?.id || null;
}

async function getPriorityId(supabase: any, priorityLevel: number): Promise<number | null> {
  console.log('🔍 getPriorityId called with:', priorityLevel, 'type:', typeof priorityLevel);
  
  // First, let's see all priority levels
  const { data: allPriorities } = await supabase
    .from('priority_levels')
    .select('*');
  console.log('📋 All priority levels in database:', allPriorities);
  
  const { data, error } = await supabase
    .from('priority_levels')
    .select('id')
    .eq('level', priorityLevel)
    .single();
  console.log('🔍 getPriorityId query result:', { data, error, priorityLevel });
  
  if (!data && !error) {
    console.log('⚠️ No data and no error - priority level not found');
  }
  
  return data?.id || null;
}

async function getGroupId(supabase: any, templateId: number, groupName: string): Promise<number | null> {
  const { data } = await supabase
    .from('parameter_groups')
    .select('id')
    .eq('template_id', templateId)
    .eq('name', groupName)
    .single();
  return data?.id || null;
}

async function getSubgroupId(supabase: any, groupId: number | null, subgroupName: string): Promise<number | null> {
  if (!groupId) return null;
  const { data } = await supabase
    .from('parameter_subgroups')
    .select('id')
    .eq('group_id', groupId)
    .eq('name', subgroupName)
    .single();
  return data?.id || null;
}
