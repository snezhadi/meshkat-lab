const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Initialize Supabase client (server-side only)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables:');
  console.error('   SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Data paths
const DATA_DIR = path.join(__dirname, '..', 'data');
const DOCUMENT_TEMPLATES_FILES = [
  path.join(DATA_DIR, 'document-templates-2.json'), // Employment Agreement
  path.join(DATA_DIR, 'document-templates-3.json')  // Independent Contractor Agreement
];
const PARAMETERS_FILE = path.join(DATA_DIR, 'parameters-3.json');
const PARAMETER_CONFIG_FILE = path.join(DATA_DIR, 'parameter-config.json');
const JURISDICTIONS_FILE = path.join(DATA_DIR, 'jurisdictions.json');

async function migrateData() {
  console.log('🚀 Starting migration to Supabase...\n');

  try {
    // 1. Migrate Global Configuration
    console.log('📋 Step 1: Migrating global configuration...');
    await migrateGlobalConfig();
    
    // 2. Migrate Jurisdictions
    console.log('🌍 Step 2: Migrating jurisdictions...');
    await migrateJurisdictions();
    
    // 3. Migrate Templates and their clauses/paragraphs
    console.log('📄 Step 3: Migrating templates...');
    await migrateTemplates();
    
    // 4. Migrate Parameters
    console.log('⚙️  Step 4: Migrating parameters...');
    await migrateParameters();
    
    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

async function migrateGlobalConfig() {
  const config = JSON.parse(fs.readFileSync(PARAMETER_CONFIG_FILE, 'utf8'));
  
  // Migrate parameter types
  for (let i = 0; i < config.types.length; i++) {
    const typeName = config.types[i];
    const { error } = await supabase
      .from('parameter_types')
      .insert({
        name: typeName,
        sort_order: i
      });
    
    if (error) {
      console.log(`   ⚠️  Parameter type "${typeName}" already exists or error:`, error.message);
    } else {
      console.log(`   ✅ Added parameter type: ${typeName}`);
    }
  }
  
  // Migrate input types
  for (let i = 0; i < config.inputs.length; i++) {
    const inputName = config.inputs[i];
    const { error } = await supabase
      .from('input_types')
      .insert({
        name: inputName,
        sort_order: i
      });
    
    if (error) {
      console.log(`   ⚠️  Input type "${inputName}" already exists or error:`, error.message);
    } else {
      console.log(`   ✅ Added input type: ${inputName}`);
    }
  }
  
  // Migrate priority levels
  for (let i = 0; i < config.priorities.length; i++) {
    const priority = config.priorities[i];
    const { error } = await supabase
      .from('priority_levels')
      .insert({
        level: priority,
        name: `Priority ${priority}`,
        sort_order: i
      });
    
    if (error) {
      console.log(`   ⚠️  Priority level "${priority}" already exists or error:`, error.message);
    } else {
      console.log(`   ✅ Added priority level: ${priority}`);
    }
  }
}

async function migrateJurisdictions() {
  const jurisdictions = JSON.parse(fs.readFileSync(JURISDICTIONS_FILE, 'utf8'));
  
  for (const jurisdiction of jurisdictions) {
    const { error } = await supabase
      .from('jurisdictions')
      .insert({
        name: jurisdiction.jurisdiction,
        code: jurisdiction.jurisdiction,
        country: jurisdiction.country
      });
    
    if (error) {
      console.log(`   ⚠️  Jurisdiction "${jurisdiction.jurisdiction}" already exists or error:`, error.message);
    } else {
      console.log(`   ✅ Added jurisdiction: ${jurisdiction.jurisdiction}, ${jurisdiction.country}`);
    }
  }
}

async function migrateTemplates() {
  // Load templates from multiple files
  const allTemplates = [];
  
  for (const templateFile of DOCUMENT_TEMPLATES_FILES) {
    console.log(`   📂 Loading: ${path.basename(templateFile)}`);
    const templates = JSON.parse(fs.readFileSync(templateFile, 'utf8'));
    
    // Handle both array and single object formats
    const templatesArray = Array.isArray(templates) ? templates : [templates];
    allTemplates.push(...templatesArray);
  }
  
  console.log(`   📋 Total templates to migrate: ${allTemplates.length}\n`);
  
  for (const template of allTemplates) {
    console.log(`\n   📄 Processing template: ${template.title}`);
    
    // Insert template
    const { data: templateData, error: templateError } = await supabase
      .from('templates')
      .insert({
        title: template.title,
        description: template.description,
        active: template.active,
        llm_description: template.metadata?.llm_description
      })
      .select()
      .single();
    
    if (templateError) {
      console.log(`   ❌ Error inserting template: ${templateError.message}`);
      continue;
    }
    
    const templateId = templateData.id;
    console.log(`   ✅ Created template with ID: ${templateId}`);
    
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
        console.log(`   ❌ Error inserting introduction: ${introError.message}`);
      } else {
        console.log(`   ✅ Added introduction clause`);
      }
    }
    
    // Insert clauses
    if (template.clauses && template.clauses.length > 0) {
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
          console.log(`   ❌ Error inserting clause "${clause.title}": ${clauseError.message}`);
          continue;
        }
        
        const clauseId = clauseData.id;
        console.log(`   ✅ Added clause: ${clause.title} (ID: ${clauseId})`);
        
        // Insert paragraphs
        if (clause.paragraphs && clause.paragraphs.length > 0) {
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
              console.log(`     ❌ Error inserting paragraph "${paragraph.title}": ${paragraphError.message}`);
            } else {
              console.log(`     ✅ Added paragraph: ${paragraph.title}`);
            }
          }
        }
      }
    }
  }
}

async function migrateParameters() {
  const parameters = JSON.parse(fs.readFileSync(PARAMETERS_FILE, 'utf8'));
  const config = JSON.parse(fs.readFileSync(PARAMETER_CONFIG_FILE, 'utf8'));
  
  // Get all templates to map parameters correctly
  const { data: templates, error: templatesError } = await supabase
    .from('templates')
    .select('id, title');
  
  if (templatesError) {
    throw new Error(`Failed to fetch templates: ${templatesError.message}`);
  }
  
  // Create template mapping
  const templateMap = {};
  templates.forEach(template => {
    if (template.title.toLowerCase().includes('employment')) {
      templateMap['employment'] = template.id;
    } else if (template.title.toLowerCase().includes('independent contractor')) {
      templateMap['indepcont'] = template.id;
    }
  });
  
  console.log('   📋 Template mapping:', templateMap);
  
  if (Object.keys(templateMap).length === 0) {
    console.log('   ⚠️  No templates found. Skipping parameter migration.');
    return;
  }
  
  // Create parameter groups and subgroups for each template
  const groupMaps = {};
  const subgroupMaps = {};
  
  for (const [prefix, templateId] of Object.entries(templateMap)) {
    console.log(`\n   📋 Creating groups for ${prefix} template (ID: ${templateId})`);
    
    groupMaps[templateId] = new Map();
    subgroupMaps[templateId] = new Map();
    
    for (let i = 0; i < config.groups.length; i++) {
      const groupName = config.groups[i];
      const { data: groupData, error: groupError } = await supabase
        .from('parameter_groups')
        .insert({
          template_id: templateId,
          name: groupName,
          sort_order: i
        })
        .select()
        .single();
      
      if (groupError) {
        console.log(`   ❌ Error creating group "${groupName}": ${groupError.message}`);
        continue;
      }
      
      groupMaps[templateId].set(groupName, groupData.id);
      console.log(`   ✅ Created group: ${groupName} (ID: ${groupData.id})`);
      
      // Create subgroups for this group
      const subgroups = config.subgroups[groupName] || [];
      for (let j = 0; j < subgroups.length; j++) {
        const subgroupName = subgroups[j];
        const { data: subgroupData, error: subgroupError } = await supabase
          .from('parameter_subgroups')
          .insert({
            template_id: templateId,
            group_id: groupData.id,
            name: subgroupName,
            sort_order: j
          })
          .select()
          .single();
        
        if (subgroupError) {
          console.log(`     ❌ Error creating subgroup "${subgroupName}": ${subgroupError.message}`);
          continue;
        }
        
        subgroupMaps[templateId].set(`${groupName}.${subgroupName}`, subgroupData.id);
        console.log(`     ✅ Created subgroup: ${subgroupName} (ID: ${subgroupData.id})`);
      }
    }
  }
  
  // Now migrate parameters
  for (const param of parameters) {
    // Determine template based on parameter ID prefix
    let templateId = null;
    let cleanCustomId = param.id;
    
    if (param.id.startsWith('employment_')) {
      templateId = templateMap['employment'];
      cleanCustomId = param.id.replace('employment_', '');
    } else if (param.id.startsWith('indepcont_')) {
      templateId = templateMap['indepcont'];
      cleanCustomId = param.id.replace('indepcont_', '');
    } else {
      console.log(`   ⚠️  Parameter "${param.name}" has no recognized prefix, skipping`);
      continue;
    }
    
    if (!templateId) {
      console.log(`   ⚠️  No template found for parameter "${param.name}"`);
      continue;
    }
    
    // Get type ID
    const { data: typeData, error: typeError } = await supabase
      .from('parameter_types')
      .select('id')
      .eq('name', param.type)
      .single();
    
    if (typeError) {
      console.log(`   ❌ Parameter type "${param.type}" not found for parameter "${param.name}"`);
      continue;
    }
    
    // Get priority ID
    let priorityId = null;
    if (param.metadata?.priority !== undefined) {
      const { data: priorityData, error: priorityError } = await supabase
        .from('priority_levels')
        .select('id')
        .eq('level', param.metadata.priority)
        .single();
      
      if (!priorityError) {
        priorityId = priorityData.id;
      }
    }
    
    // Get input type ID
    let inputTypeId = null;
    if (param.display?.input) {
      const { data: inputData, error: inputError } = await supabase
        .from('input_types')
        .select('id')
        .eq('name', param.display.input)
        .single();
      
      if (!inputError) {
        inputTypeId = inputData.id;
      }
    }
    
    // Get group and subgroup IDs (optional)
    let groupId = null;
    let subgroupId = null;
    
    if (param.display?.group && param.display?.subgroup) {
      groupId = groupMaps[templateId].get(param.display.group);
      subgroupId = subgroupMaps[templateId].get(`${param.display.group}.${param.display.subgroup}`);
    }
    
    // Use default group/subgroup if not found or not specified
    if (!groupId) {
      const defaultGroup = groupMaps[templateId].get('General Parameters');
      groupId = defaultGroup || Array.from(groupMaps[templateId].values())[0];
    }
    
    if (!subgroupId) {
      const defaultSubgroup = subgroupMaps[templateId].get('General Parameters.Basic');
      subgroupId = defaultSubgroup || Array.from(subgroupMaps[templateId].values())[0];
    }
    
    // Insert parameter
    const { error: paramError } = await supabase
      .from('parameters')
      .insert({
        template_id: templateId,
        custom_id: cleanCustomId, // Clean ID without prefix
        name: param.name,
        description: param.description,
        type_id: typeData.id,
        condition: param.condition || null,
        llm_instructions: param.metadata?.llm_instructions,
        llm_description: param.metadata?.llm_description,
        priority_id: priorityId,
        format: param.metadata?.format,
        display_group_id: groupId,
        display_subgroup_id: subgroupId,
        display_label: param.display.label,
        display_input_id: inputTypeId,
        options: param.options?.join(',') || null,
        global_default: param.defaults?.global_default
      });
    
    if (paramError) {
      console.log(`   ❌ Error inserting parameter "${param.name}": ${paramError.message}`);
      continue;
    }
    
    console.log(`   ✅ Added parameter: ${param.name} (${cleanCustomId}) -> Template ${templateId}`);
    
    // Note: Skipping jurisdiction defaults for now as requested
    if (param.defaults?.jurisdictions?.length > 0) {
      console.log(`     ℹ️  Skipping ${param.defaults.jurisdictions.length} jurisdiction defaults for now`);
    }
  }
}

// Run migration
if (require.main === module) {
  migrateData();
}

module.exports = { migrateData };
