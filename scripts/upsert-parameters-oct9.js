/**
 * Script to UPSERT parameters from parameters-oct9.json to Supabase
 * - Strips employment_ and indepcont_ prefixes from custom_id
 * - Maps prefixes to correct template_id
 * - Uses UPSERT (INSERT or UPDATE) based on custom_id + template_id
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Template name to ID mapping (will be fetched from database)
let templateMapping = {};

// Helper function to get or create parameter type
async function getTypeId(typeName) {
  const { data, error } = await supabase
    .from('parameter_types')
    .select('id')
    .eq('name', typeName)
    .single();
  
  if (error || !data) {
    // Create if doesn't exist
    const { data: newType } = await supabase
      .from('parameter_types')
      .insert({ name: typeName })
      .select()
      .single();
    return newType?.id;
  }
  return data.id;
}

// Helper function to get or create input type
async function getInputTypeId(inputName) {
  const { data, error } = await supabase
    .from('input_types')
    .select('id')
    .eq('name', inputName)
    .single();
  
  if (error || !data) {
    // Create if doesn't exist
    const { data: newInput } = await supabase
      .from('input_types')
      .insert({ name: inputName })
      .select()
      .single();
    return newInput?.id;
  }
  return data.id;
}

// Helper function to get or create priority level
async function getPriorityId(priorityLevel) {
  const { data, error } = await supabase
    .from('priority_levels')
    .select('id')
    .eq('level', priorityLevel)
    .single();
  
  if (error || !data) {
    // Create if doesn't exist
    const { data: newPriority } = await supabase
      .from('priority_levels')
      .insert({ level: priorityLevel })
      .select()
      .single();
    return newPriority?.id;
  }
  return data.id;
}

// Helper function to get or create group
async function getGroupId(templateId, groupName) {
  const { data, error } = await supabase
    .from('parameter_groups')
    .select('id')
    .eq('template_id', templateId)
    .eq('name', groupName)
    .single();
  
  if (error || !data) {
    // Create if doesn't exist
    const { data: newGroup } = await supabase
      .from('parameter_groups')
      .insert({
        template_id: templateId,
        name: groupName,
        sort_order: 0
      })
      .select()
      .single();
    return newGroup?.id;
  }
  return data.id;
}

// Helper function to get or create subgroup
async function getSubgroupId(groupId, subgroupName) {
  const { data, error } = await supabase
    .from('parameter_subgroups')
    .select('id')
    .eq('group_id', groupId)
    .eq('name', subgroupName)
    .single();
  
  if (error || !data) {
    // Create if doesn't exist
    const { data: newSubgroup } = await supabase
      .from('parameter_subgroups')
      .insert({
        group_id: groupId,
        name: subgroupName,
        sort_order: 0
      })
      .select()
      .single();
    return newSubgroup?.id;
  }
  return data.id;
}

// Main function to load templates
async function loadTemplates() {
  console.log('📋 Loading templates from database...');
  console.log('🔗 Supabase URL:', supabaseUrl);
  
  const { data, error } = await supabase
    .from('templates')
    .select('id, title');
  
  if (error) {
    console.error('❌ Error loading templates:', error);
    process.exit(1);
  }
  
  console.log('📊 Templates found:', data?.length || 0);
  
  // Create mapping
  data.forEach(template => {
    templateMapping[template.title.toLowerCase()] = template.id;
    console.log(`  - ${template.title} → ID: ${template.id}`);
  });
  
  console.log('✅ Template mapping loaded:', JSON.stringify(templateMapping, null, 2));
}

// Main function to process and upsert parameters
async function upsertParameters() {
  console.log('\n📂 Reading parameters-oct9.json...');
  const filePath = path.join(__dirname, '../data/parameters-oct9.json');
  console.log('📁 File path:', filePath);
  
  const parametersData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  console.log(`📊 Found ${parametersData.length} parameters to process`);
  console.log('🚀 Starting UPSERT process...\n');
  
  let employmentCount = 0;
  let independentContractorCount = 0;
  let insertedCount = 0;
  let updatedCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < parametersData.length; i++) {
    const param = parametersData[i];
    try {
      console.log(`\n[${i + 1}/${parametersData.length}] Processing: ${param.id}`);
      
      // Determine template ID based on prefix
      let templateId;
      let customId = param.id;
      
      if (param.id.startsWith('employment_')) {
        templateId = templateMapping['employment agreement'];
        customId = param.id.replace(/^employment_/, '');
        employmentCount++;
        console.log(`  📋 Template: Employment Agreement`);
      } else if (param.id.startsWith('indepcont_')) {
        templateId = templateMapping['independent contractor agreement'];
        customId = param.id.replace(/^indepcont_/, '');
        independentContractorCount++;
        console.log(`  📋 Template: Independent Contractor Agreement`);
      } else {
        console.warn(`  ⚠️  Skipping parameter with unknown prefix: ${param.id}`);
        continue;
      }
      
      console.log(`  🔑 Custom ID: ${customId}`);
      
      if (!templateId) {
        console.error(`  ❌ Template not found for parameter: ${param.id}`);
        errorCount++;
        continue;
      }
      
      // Get foreign key IDs
      console.log(`  🔍 Looking up type: ${param.type}...`);
      const typeId = await getTypeId(param.type);
      
      console.log(`  🔍 Looking up input type: ${param.display?.input || 'text'}...`);
      const inputTypeId = param.display?.input 
        ? await getInputTypeId(param.display.input) 
        : await getInputTypeId('text');
      
      console.log(`  🔍 Looking up priority: ${param.metadata?.priority !== undefined ? param.metadata.priority : 1}...`);
      const priorityId = param.metadata?.priority !== undefined
        ? await getPriorityId(param.metadata.priority)
        : await getPriorityId(1);
      
      // Get or create group and subgroup if provided
      let groupId = null;
      let subgroupId = null;
      
      if (param.display?.group) {
        console.log(`  🔍 Looking up group: ${param.display.group}...`);
        groupId = await getGroupId(templateId, param.display.group);
        
        if (groupId && param.display?.subgroup) {
          console.log(`  🔍 Looking up subgroup: ${param.display.subgroup}...`);
          subgroupId = await getSubgroupId(groupId, param.display.subgroup);
        }
      }
      
      // Check if parameter exists
      console.log(`  🔍 Checking if parameter exists...`);
      const { data: existing } = await supabase
        .from('parameters')
        .select('id')
        .eq('template_id', templateId)
        .eq('custom_id', customId)
        .single();
      
      const parameterData = {
        custom_id: customId,
        name: param.name,
        description: param.description,
        type_id: typeId,
        display_input_id: inputTypeId,
        priority_id: priorityId,
        display_group_id: groupId,
        display_subgroup_id: subgroupId,
        display_label: param.display?.label || param.name,
        options: param.options ? param.options.join(',') : null,
        llm_instructions: param.metadata?.llm_instructions,
        llm_description: param.metadata?.llm_description,
        global_default: param.defaults?.global_default,
        condition: param.condition || null,
        template_id: templateId,
        updated_at: new Date().toISOString(),
      };
      
      if (existing) {
        // UPDATE
        console.log(`  ✏️  Updating existing parameter (ID: ${existing.id})...`);
        const { error } = await supabase
          .from('parameters')
          .update(parameterData)
          .eq('id', existing.id);
        
        if (error) {
          console.error(`  ❌ Error updating parameter ${customId}:`, error.message);
          errorCount++;
        } else {
          updatedCount++;
          console.log(`  ✅ Updated successfully!`);
        }
      } else {
        // INSERT
        console.log(`  ➕ Inserting new parameter...`);
        parameterData.created_at = new Date().toISOString();
        
        const { error } = await supabase
          .from('parameters')
          .insert(parameterData);
        
        if (error) {
          console.error(`  ❌ Error inserting parameter ${customId}:`, error.message);
          errorCount++;
        } else {
          insertedCount++;
          console.log(`  ✅ Inserted successfully!`);
        }
      }
    } catch (error) {
      console.error(`❌ Error processing parameter ${param.id}:`, error.message);
      errorCount++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 UPSERT Summary:');
  console.log('='.repeat(60));
  console.log(`📝 Total parameters processed: ${parametersData.length}`);
  console.log(`👔 Employment parameters: ${employmentCount}`);
  console.log(`📄 Independent Contractor parameters: ${independentContractorCount}`);
  console.log(`➕ Inserted: ${insertedCount}`);
  console.log(`✏️  Updated: ${updatedCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log('='.repeat(60));
}

// Run the script
async function main() {
  console.log('🚀 Starting parameter UPSERT from parameters-oct9.json...\n');
  
  await loadTemplates();
  await upsertParameters();
  
  console.log('\n✅ UPSERT completed!');
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

