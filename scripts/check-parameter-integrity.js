const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkParameterIntegrity() {
  console.log('🔍 Checking parameter data integrity...\n');

  let totalIssues = 0;

  // 1. Check for invalid parameter types
  console.log('1. Checking parameter types...');
  
  // Get all valid type IDs
  const { data: validTypes } = await supabase
    .from('parameter_types')
    .select('id');
  
  const validTypeIds = new Set(validTypes?.map(t => t.id) || []);
  
  // Get all parameters
  const { data: allParams } = await supabase
    .from('parameters')
    .select('id, custom_id, name, type_id');
  
  const invalidTypeParams = allParams?.filter(p => !validTypeIds.has(p.type_id)) || [];
  
  if (invalidTypeParams.length > 0) {
    console.log(`   ❌ Found ${invalidTypeParams.length} parameters with invalid types:`);
    invalidTypeParams.forEach(p => {
      console.log(`      - ${p.custom_id} (${p.name}): type_id ${p.type_id} not found`);
    });
    totalIssues += invalidTypeParams.length;
  } else {
    console.log('   ✅ All parameter types are valid');
  }

  // 2. Check for invalid input types
  console.log('\n2. Checking input types...');
  const { data: validInputTypes } = await supabase
    .from('input_types')
    .select('id');
  
  const validInputTypeIds = new Set(validInputTypes?.map(t => t.id) || []);
  
  const { data: allParamsInputs } = await supabase
    .from('parameters')
    .select('id, custom_id, name, display_input_id');
  
  const invalidInputParams = allParamsInputs?.filter(p => p.display_input_id !== null && !validInputTypeIds.has(p.display_input_id)) || [];
  
  if (invalidInputParams.length > 0) {
    console.log(`   ❌ Found ${invalidInputParams.length} parameters with invalid input types:`);
    invalidInputParams.forEach(p => {
      console.log(`      - ${p.custom_id} (${p.name}): display_input_id ${p.display_input_id} not found`);
    });
    totalIssues += invalidInputParams.length;
  } else {
    console.log('   ✅ All input types are valid');
  }

  // 3. Check for invalid priority levels
  console.log('\n3. Checking priority levels...');
  const { data: validPriorities } = await supabase
    .from('priority_levels')
    .select('id');
  
  const validPriorityIds = new Set(validPriorities?.map(p => p.id) || []);
  
  const { data: allParamsPriorities } = await supabase
    .from('parameters')
    .select('id, custom_id, name, priority_id');
  
  const invalidPriorityParams = allParamsPriorities?.filter(p => p.priority_id !== null && !validPriorityIds.has(p.priority_id)) || [];
  
  if (invalidPriorityParams.length > 0) {
    console.log(`   ❌ Found ${invalidPriorityParams.length} parameters with invalid priority levels:`);
    invalidPriorityParams.forEach(p => {
      console.log(`      - ${p.custom_id} (${p.name}): priority_id ${p.priority_id} not found`);
    });
    totalIssues += invalidPriorityParams.length;
  } else {
    console.log('   ✅ All priority levels are valid');
  }

  // 4. Check for invalid display groups
  console.log('\n4. Checking display groups...');
  const { data: validGroups } = await supabase
    .from('parameter_groups')
    .select('id');
  
  const validGroupIds = new Set(validGroups?.map(g => g.id) || []);
  
  const { data: allParamsGroups } = await supabase
    .from('parameters')
    .select('id, custom_id, name, display_group_id')
    .not('display_group_id', 'is', null);
  
  const invalidGroupParams = allParamsGroups?.filter(p => !validGroupIds.has(p.display_group_id)) || [];
  
  if (invalidGroupParams.length > 0) {
    console.log(`   ❌ Found ${invalidGroupParams.length} parameters with invalid display groups:`);
    invalidGroupParams.forEach(p => {
      console.log(`      - ${p.custom_id} (${p.name}): display_group_id ${p.display_group_id} not found`);
    });
    totalIssues += invalidGroupParams.length;
  } else {
    console.log('   ✅ All display groups are valid');
  }

  // 5. Check for invalid display subgroups
  console.log('\n5. Checking display subgroups...');
  const { data: validSubgroups } = await supabase
    .from('parameter_subgroups')
    .select('id');
  
  const validSubgroupIds = new Set(validSubgroups?.map(s => s.id) || []);
  
  const { data: allParamsSubgroups } = await supabase
    .from('parameters')
    .select('id, custom_id, name, display_subgroup_id')
    .not('display_subgroup_id', 'is', null);
  
  const invalidSubgroupParams = allParamsSubgroups?.filter(p => !validSubgroupIds.has(p.display_subgroup_id)) || [];
  
  if (invalidSubgroupParams.length > 0) {
    console.log(`   ❌ Found ${invalidSubgroupParams.length} parameters with invalid display subgroups:`);
    invalidSubgroupParams.forEach(p => {
      console.log(`      - ${p.custom_id} (${p.name}): display_subgroup_id ${p.display_subgroup_id} not found`);
    });
    totalIssues += invalidSubgroupParams.length;
  } else {
    console.log('   ✅ All display subgroups are valid');
  }

  // 6. Check for orphaned groups
  console.log('\n6. Checking for orphaned parameter groups...');
  const { data: allGroups } = await supabase
    .from('parameter_groups')
    .select('id, name');
  
  const { data: usedGroups } = await supabase
    .from('parameters')
    .select('display_group_id')
    .not('display_group_id', 'is', null);
  
  const usedGroupIds = new Set(usedGroups?.map(p => p.display_group_id) || []);
  const orphanedGroups = allGroups?.filter(g => !usedGroupIds.has(g.id)) || [];
  
  if (orphanedGroups.length > 0) {
    console.log(`   ⚠️  Found ${orphanedGroups.length} orphaned parameter groups:`);
    orphanedGroups.forEach(g => {
      console.log(`      - Group "${g.name}" (ID: ${g.id}) has no associated parameters`);
    });
  } else {
    console.log('   ✅ No orphaned parameter groups');
  }

  // 7. Check for orphaned subgroups
  console.log('\n7. Checking for orphaned parameter subgroups...');
  const { data: allSubgroups } = await supabase
    .from('parameter_subgroups')
    .select('id, name');
  
  const { data: usedSubgroups } = await supabase
    .from('parameters')
    .select('display_subgroup_id')
    .not('display_subgroup_id', 'is', null);
  
  const usedSubgroupIds = new Set(usedSubgroups?.map(p => p.display_subgroup_id) || []);
  const orphanedSubgroups = allSubgroups?.filter(s => !usedSubgroupIds.has(s.id)) || [];
  
  if (orphanedSubgroups.length > 0) {
    console.log(`   ⚠️  Found ${orphanedSubgroups.length} orphaned parameter subgroups:`);
    orphanedSubgroups.forEach(s => {
      console.log(`      - Subgroup "${s.name}" (ID: ${s.id}) has no associated parameters`);
    });
  } else {
    console.log('   ✅ No orphaned parameter subgroups');
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  if (totalIssues === 0) {
    console.log('✅ DATA INTEGRITY CHECK PASSED');
    console.log('All parameters have valid references to config tables.');
  } else {
    console.log(`❌ DATA INTEGRITY CHECK FAILED`);
    console.log(`Found ${totalIssues} parameters with invalid references.`);
    console.log('\nRecommendation: Fix these issues before continuing.');
  }
  console.log('='.repeat(50));
}

checkParameterIntegrity().catch(console.error);
