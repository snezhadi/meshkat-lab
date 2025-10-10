import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

// POST - Create a new parameter
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const parameterData = await request.json();

    // Validate required fields
    if (!parameterData.custom_id || !parameterData.name || !parameterData.template_id) {
      return NextResponse.json(
        { success: false, error: 'Parameter ID, name, and template ID are required' },
        { status: 400 }
      );
    }

    // Check if parameter ID already exists for this template
    const { data: existingParameter } = await supabase
      .from('parameters')
      .select('custom_id')
      .eq('custom_id', parameterData.custom_id)
      .eq('template_id', parameterData.template_id)
      .single();

    if (existingParameter) {
      return NextResponse.json(
        { success: false, error: 'Parameter ID already exists for this template' },
        { status: 400 }
      );
    }

    // Look up foreign key IDs
    const typeId = parameterData.type ? await getParameterTypeId(supabase, parameterData.type) : null;
    const inputTypeId = parameterData.input_type ? await getInputTypeId(supabase, parameterData.input_type) : null;
    const priorityId = parameterData.priority ? await getPriorityId(supabase, parameterData.priority) : null;
    
    // Handle optional display fields - only create groups/subgroups if explicitly provided
    let actualGroupId = null;
    let actualSubgroupId = null;
    
    if (parameterData.display_group) {
      const groupId = await getGroupId(supabase, parameterData.template_id, parameterData.display_group);
      
      if (!groupId) {
        // Create the group if it doesn't exist
        const { data: newGroup } = await supabase
          .from('parameter_groups')
          .insert({
            template_id: parameterData.template_id,
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

    // Insert the new parameter
    const { data: newParameter, error } = await supabase
      .from('parameters')
      .insert({
        template_id: parameterData.template_id,
        custom_id: parameterData.custom_id,
        name: parameterData.name,
        description: parameterData.description,
        type_id: typeId,
        display_input_id: inputTypeId,
        priority_id: priorityId,
        display_group_id: actualGroupId,
        display_subgroup_id: actualSubgroupId,
        required: parameterData.required,
        options: parameterData.options ? parameterData.options.join(',') : null,
        llm_instructions: parameterData.llm_instructions,
        llm_description: parameterData.llm_description,
        condition: parameterData.condition,
        display_label: parameterData.display_label || parameterData.name,
        format: parameterData.format,
        global_default: parameterData.global_default,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create parameter: ${error.message}`);
    }

    console.log(`✅ Created parameter ${parameterData.custom_id}: "${newParameter.name}"`);

    return NextResponse.json({
      success: true,
      data: newParameter,
      message: 'Parameter created successfully',
    });
  } catch (error) {
    console.error('Error creating parameter:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create parameter' },
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

async function getPriorityId(supabase: any, priorityName: string): Promise<number | null> {
  const { data } = await supabase
    .from('priority_levels')
    .select('id')
    .eq('name', priorityName)
    .single();
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
