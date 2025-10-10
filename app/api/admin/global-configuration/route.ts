import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();

    // Fetch all global configuration tables
    const [
      { data: parameterTypes, error: parameterTypesError },
      { data: inputTypes, error: inputTypesError },
      { data: priorityLevels, error: priorityLevelsError },
    ] = await Promise.all([
      supabase.from('parameter_types').select('*').order('sort_order'),
      supabase.from('input_types').select('*').order('sort_order'),
      supabase.from('priority_levels').select('*').order('sort_order'),
    ]);

    if (parameterTypesError) {
      throw new Error(`Failed to fetch parameter types: ${parameterTypesError.message}`);
    }

    if (inputTypesError) {
      throw new Error(`Failed to fetch input types: ${inputTypesError.message}`);
    }

    if (priorityLevelsError) {
      throw new Error(`Failed to fetch priority levels: ${priorityLevelsError.message}`);
    }

    return NextResponse.json({
      success: true,
      parameterTypes: parameterTypes || [],
      inputTypes: inputTypes || [],
      priorityLevels: priorityLevels || [],
    });
  } catch (error) {
    console.error('Error fetching global configuration:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch global configuration' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { parameterTypes, inputTypes, priorityLevels } = await request.json();

    console.log(`POST request received - Saving global configuration`);

    // Update parameter types
    if (parameterTypes) {
      for (const type of parameterTypes) {
        if (type.id === 0) {
          // Create new parameter type
          const { error } = await supabase
            .from('parameter_types')
            .insert({
              name: type.name,
              sort_order: type.sort_order,
            });

          if (error) {
            throw new Error(`Failed to create parameter type: ${error.message}`);
          }
        } else {
          // Update existing parameter type
          const { error } = await supabase
            .from('parameter_types')
            .update({
              name: type.name,
              sort_order: type.sort_order,
            })
            .eq('id', type.id);

          if (error) {
            throw new Error(`Failed to update parameter type: ${error.message}`);
          }
        }
      }
    }

    // Update input types
    if (inputTypes) {
      for (const type of inputTypes) {
        if (type.id === 0) {
          // Create new input type
          const { error } = await supabase
            .from('input_types')
            .insert({
              name: type.name,
              sort_order: type.sort_order,
            });

          if (error) {
            throw new Error(`Failed to create input type: ${error.message}`);
          }
        } else {
          // Update existing input type
          const { error } = await supabase
            .from('input_types')
            .update({
              name: type.name,
              sort_order: type.sort_order,
            })
            .eq('id', type.id);

          if (error) {
            throw new Error(`Failed to update input type: ${error.message}`);
          }
        }
      }
    }

    // Update priority levels
    if (priorityLevels) {
      for (const level of priorityLevels) {
        if (level.id === 0) {
          // Create new priority level
          const { error } = await supabase
            .from('priority_levels')
            .insert({
              level: level.level,
              name: level.name,
              sort_order: level.sort_order,
            });

          if (error) {
            throw new Error(`Failed to create priority level: ${error.message}`);
          }
        } else {
          // Update existing priority level
          const { error } = await supabase
            .from('priority_levels')
            .update({
              level: level.level,
              name: level.name,
              sort_order: level.sort_order,
            })
            .eq('id', level.id);

          if (error) {
            throw new Error(`Failed to update priority level: ${error.message}`);
          }
        }
      }
    }

    console.log(`Global configuration saved successfully`);

    return NextResponse.json({
      success: true,
      message: 'Global configuration saved successfully',
    });
  } catch (error) {
    console.error('Error saving global configuration:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save global configuration' },
      { status: 500 }
    );
  }
}
