import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

// GET - Fetch parameter configuration for a template
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('templateId');

    if (!templateId) {
      return NextResponse.json(
        { success: false, error: 'Template ID is required' },
        { status: 400 }
      );
    }

    // Fetch groups and subgroups for the template
    const [
      { data: groups, error: groupsError },
      { data: subgroups, error: subgroupsError },
    ] = await Promise.all([
      supabase.from('parameter_groups').select('*').eq('template_id', parseInt(templateId)).order('sort_order'),
      supabase.from('parameter_subgroups').select('*').eq('template_id', parseInt(templateId)).order('sort_order'),
    ]);

    if (groupsError || subgroupsError) {
      throw new Error(`Failed to fetch configuration: ${groupsError?.message || subgroupsError?.message}`);
    }

    // Build subgroups map
    const subgroupsMap: Record<string, string[]> = {};
    if (subgroups) {
      for (const subgroup of subgroups) {
        const group = groups?.find(g => g.id === subgroup.group_id);
        if (group) {
          if (!subgroupsMap[group.name]) {
            subgroupsMap[group.name] = [];
          }
          subgroupsMap[group.name].push(subgroup.name);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        groups: groups?.map(g => g.name) || [],
        subgroups: subgroupsMap,
      },
    });
  } catch (error) {
    console.error('Error fetching parameter configuration:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch parameter configuration' },
      { status: 500 }
    );
  }
}

// POST - Save parameter configuration for a template
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { templateId, config } = await request.json();

    if (!templateId) {
      return NextResponse.json(
        { success: false, error: 'Template ID is required' },
        { status: 400 }
      );
    }

    console.log(`Saving parameter configuration for template ${templateId}`);

    // Delete existing groups and subgroups for this template
    const { error: deleteSubgroupsError } = await supabase
      .from('parameter_subgroups')
      .delete()
      .eq('template_id', parseInt(templateId));

    if (deleteSubgroupsError) {
      throw new Error(`Failed to delete existing subgroups: ${deleteSubgroupsError.message}`);
    }

    const { error: deleteGroupsError } = await supabase
      .from('parameter_groups')
      .delete()
      .eq('template_id', parseInt(templateId));

    if (deleteGroupsError) {
      throw new Error(`Failed to delete existing groups: ${deleteGroupsError.message}`);
    }

    // Insert new groups
    const groupsToInsert = config.groups.map((name: string, index: number) => ({
      template_id: parseInt(templateId),
      name,
      sort_order: index,
    }));

    const { data: insertedGroups, error: groupsInsertError } = await supabase
      .from('parameter_groups')
      .insert(groupsToInsert)
      .select();

    if (groupsInsertError) {
      throw new Error(`Failed to insert groups: ${groupsInsertError.message}`);
    }

    // Insert new subgroups
    const subgroupsToInsert: any[] = [];
    for (const [groupName, subgroups] of Object.entries(config.subgroups)) {
      const group = insertedGroups?.find(g => g.name === groupName);
      if (group) {
        subgroups.forEach((subgroupName: string, index: number) => {
          subgroupsToInsert.push({
            template_id: parseInt(templateId),
            group_id: group.id,
            name: subgroupName,
            sort_order: index,
          });
        });
      }
    }

    if (subgroupsToInsert.length > 0) {
      const { error: subgroupsInsertError } = await supabase
        .from('parameter_subgroups')
        .insert(subgroupsToInsert);

      if (subgroupsInsertError) {
        throw new Error(`Failed to insert subgroups: ${subgroupsInsertError.message}`);
      }
    }

    console.log(`✅ Parameter configuration saved for template ${templateId}`);

    return NextResponse.json({
      success: true,
      message: 'Parameter configuration saved successfully',
    });
  } catch (error) {
    console.error('Error saving parameter configuration:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save parameter configuration' },
      { status: 500 }
    );
  }
}
