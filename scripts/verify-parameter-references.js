require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Supabase URL or Service Role Key is missing. Make sure .env.local is configured.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Regular expression to find parameter references in content
const parameterRegex = /@([a-zA-Z_][a-zA-Z0-9_]*)/g;

// Function to extract parameter references from text
function extractParameterReferences(text) {
  if (!text || typeof text !== 'string') return [];
  
  const matches = [];
  let match;
  while ((match = parameterRegex.exec(text)) !== null) {
    matches.push(match[1]);
  }
  return [...new Set(matches)]; // Remove duplicates
}

// Function to extract parameter references from JSON conditions
function extractParameterReferencesFromCondition(condition) {
  if (!condition) return [];
  
  let references = [];
  
  if (typeof condition === 'string') {
    references = extractParameterReferences(condition);
  } else if (typeof condition === 'object') {
    // Handle JSON condition structure
    const conditionStr = JSON.stringify(condition);
    references = extractParameterReferences(conditionStr);
  }
  
  return references;
}

async function verifyParameterReferences() {
  console.log('🔍 Starting parameter reference verification...');
  
  try {
    // 1. Fetch all parameters to create a lookup map
    console.log('📊 Fetching all parameters...');
    const { data: parameters, error: paramError } = await supabase
      .from('parameters')
      .select('custom_id, template_id');
    
    if (paramError) {
      console.error('❌ Error fetching parameters:', paramError);
      return;
    }
    
    console.log(`📋 Found ${parameters.length} parameters in database`);
    
    // Create lookup map: template_id -> Set of custom_ids
    const parameterMap = new Map();
    for (const param of parameters) {
      if (!parameterMap.has(param.template_id)) {
        parameterMap.set(param.template_id, new Set());
      }
      parameterMap.get(param.template_id).add(param.custom_id);
    }
    
    console.log(`🗺️  Created parameter lookup map for ${parameterMap.size} templates`);
    
    // 2. Fetch all clauses
    console.log('\n📋 Fetching all clauses...');
    const { data: clauses, error: clauseError } = await supabase
      .from('template_clauses')
      .select('id, template_id, title, content, condition');
    
    if (clauseError) {
      console.error('❌ Error fetching clauses:', clauseError);
      return;
    }
    
    console.log(`📄 Found ${clauses.length} clauses to verify`);
    
    // 3. Fetch all paragraphs
    console.log('\n📄 Fetching all paragraphs...');
    const { data: paragraphs, error: paragraphError } = await supabase
      .from('template_paragraphs')
      .select('id, clause_id, title, content, condition');
    
    if (paragraphError) {
      console.error('❌ Error fetching paragraphs:', paragraphError);
      return;
    }
    
    console.log(`📝 Found ${paragraphs.length} paragraphs to verify`);
    
    // 4. Get template information for better reporting
    console.log('\n📊 Fetching template information...');
    const { data: templates, error: templateError } = await supabase
      .from('templates')
      .select('id, title');
    
    if (templateError) {
      console.error('❌ Error fetching templates:', templateError);
      return;
    }
    
    const templateMap = new Map();
    for (const template of templates) {
      templateMap.set(template.id, template.title);
    }
    
    // 5. Verify clause parameter references
    console.log('\n🔍 Verifying clause parameter references...');
    let totalClauseReferences = 0;
    let invalidClauseReferences = 0;
    
    for (const clause of clauses) {
      const templateId = clause.template_id;
      const templateTitle = templateMap.get(templateId) || `Template ${templateId}`;
      const availableParams = parameterMap.get(templateId) || new Set();
      
      // Check content references
      const contentRefs = extractParameterReferences(clause.content);
      totalClauseReferences += contentRefs.length;
      
      for (const ref of contentRefs) {
        if (!availableParams.has(ref)) {
          console.log(`❌ Clause "${clause.title}" (ID: ${clause.id}) in ${templateTitle}:`);
          console.log(`   Missing parameter: @${ref} in content`);
          invalidClauseReferences++;
        }
      }
      
      // Check condition references
      const conditionRefs = extractParameterReferencesFromCondition(clause.condition);
      totalClauseReferences += conditionRefs.length;
      
      for (const ref of conditionRefs) {
        if (!availableParams.has(ref)) {
          console.log(`❌ Clause "${clause.title}" (ID: ${clause.id}) in ${templateTitle}:`);
          console.log(`   Missing parameter: @${ref} in condition`);
          invalidClauseReferences++;
        }
      }
    }
    
    // 6. Verify paragraph parameter references
    console.log('\n🔍 Verifying paragraph parameter references...');
    let totalParagraphReferences = 0;
    let invalidParagraphReferences = 0;
    
    // Create clause to template mapping
    const clauseToTemplateMap = new Map();
    for (const clause of clauses) {
      clauseToTemplateMap.set(clause.id, clause.template_id);
    }
    
    for (const paragraph of paragraphs) {
      const templateId = clauseToTemplateMap.get(paragraph.clause_id);
      if (!templateId) {
        console.log(`⚠️  Paragraph "${paragraph.title}" (ID: ${paragraph.id}) has no associated template`);
        continue;
      }
      
      const templateTitle = templateMap.get(templateId) || `Template ${templateId}`;
      const availableParams = parameterMap.get(templateId) || new Set();
      
      // Check content references
      const contentRefs = extractParameterReferences(paragraph.content);
      totalParagraphReferences += contentRefs.length;
      
      for (const ref of contentRefs) {
        if (!availableParams.has(ref)) {
          console.log(`❌ Paragraph "${paragraph.title}" (ID: ${paragraph.id}) in ${templateTitle}:`);
          console.log(`   Missing parameter: @${ref} in content`);
          invalidParagraphReferences++;
        }
      }
      
      // Check condition references
      const conditionRefs = extractParameterReferencesFromCondition(paragraph.condition);
      totalParagraphReferences += conditionRefs.length;
      
      for (const ref of conditionRefs) {
        if (!availableParams.has(ref)) {
          console.log(`❌ Paragraph "${paragraph.title}" (ID: ${paragraph.id}) in ${templateTitle}:`);
          console.log(`   Missing parameter: @${ref} in condition`);
          invalidParagraphReferences++;
        }
      }
    }
    
    // 7. Summary
    console.log('\n============================================================');
    console.log('📊 VERIFICATION SUMMARY');
    console.log('============================================================');
    console.log(`📋 Total parameters in database: ${parameters.length}`);
    console.log(`📄 Total clauses verified: ${clauses.length}`);
    console.log(`📝 Total paragraphs verified: ${paragraphs.length}`);
    console.log(`🔗 Total clause parameter references: ${totalClauseReferences}`);
    console.log(`🔗 Total paragraph parameter references: ${totalParagraphReferences}`);
    console.log(`❌ Invalid clause references: ${invalidClauseReferences}`);
    console.log(`❌ Invalid paragraph references: ${invalidParagraphReferences}`);
    console.log(`✅ Valid references: ${totalClauseReferences + totalParagraphReferences - invalidClauseReferences - invalidParagraphReferences}`);
    
    if (invalidClauseReferences === 0 && invalidParagraphReferences === 0) {
      console.log('\n🎉 SUCCESS: All parameter references are valid!');
    } else {
      console.log(`\n⚠️  WARNING: Found ${invalidClauseReferences + invalidParagraphReferences} invalid parameter references`);
    }
    
    // 8. Show parameter count per template
    console.log('\n📊 Parameters per template:');
    for (const [templateId, paramSet] of parameterMap) {
      const templateTitle = templateMap.get(templateId) || `Template ${templateId}`;
      console.log(`   ${templateTitle} (ID: ${templateId}): ${paramSet.size} parameters`);
    }
    
  } catch (error) {
    console.error('❌ Error during verification:', error);
  }
}

verifyParameterReferences().catch(console.error);
