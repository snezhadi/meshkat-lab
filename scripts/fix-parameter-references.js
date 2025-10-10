const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixParameterReferences() {
  console.log('🔧 Starting parameter reference fix...');
  
  try {
    // Get all parameters with their mapping
    const { data: parameters, error: paramsError } = await supabase
      .from('parameters')
      .select('id, custom_id, name, template_id');
    
    if (paramsError) {
      throw new Error(`Failed to fetch parameters: ${paramsError.message}`);
    }
    
    console.log(`📊 Found ${parameters.length} parameters to process`);
    
    // Create mapping from old format to new format
    const parameterMapping = new Map();
    
    parameters.forEach(param => {
      // Map both employment_ and indepcont_ prefixes to clean custom_id
      const employmentKey = `employment_${param.custom_id}`;
      const indepcontKey = `indepcont_${param.custom_id}`;
      
      parameterMapping.set(employmentKey, param.custom_id);
      parameterMapping.set(indepcontKey, param.custom_id);
    });
    
    console.log(`🗺️  Created ${parameterMapping.size} parameter mappings`);
    
    // Get all clauses
    const { data: clauses, error: clausesError } = await supabase
      .from('template_clauses')
      .select('id, content, condition, title');
    
    if (clausesError) {
      throw new Error(`Failed to fetch clauses: ${clausesError.message}`);
    }
    
    console.log(`📋 Found ${clauses.length} clauses to process`);
    
    let clausesUpdated = 0;
    let paragraphsUpdated = 0;
    
    // Process clauses
    for (const clause of clauses) {
      let updated = false;
      let newContent = clause.content || '';
      let newCondition = clause.condition || '';
      
            // Update content
            for (const [oldRef, newRef] of parameterMapping) {
              const oldPattern = `@${oldRef}`;
              const newPattern = `@${newRef}`;
              
              if (newContent && newContent.includes(oldPattern)) {
                newContent = newContent.replace(new RegExp(oldPattern, 'g'), newPattern);
                updated = true;
                console.log(`  📝 Updated content in clause "${clause.title}": ${oldPattern} → ${newPattern}`);
              }
              
              // Handle condition as JSON object
              if (newCondition && typeof newCondition === 'object') {
                const conditionStr = JSON.stringify(newCondition);
                if (conditionStr.includes(oldRef)) {
                  // Replace parameter references in the JSON structure
                  const updatedConditionStr = conditionStr.replace(new RegExp(`"${oldRef}"`, 'g'), `"${newRef}"`);
                  newCondition = JSON.parse(updatedConditionStr);
                  updated = true;
                  console.log(`  🔗 Updated condition in clause "${clause.title}": ${oldRef} → ${newRef}`);
                }
              } else if (newCondition && typeof newCondition === 'string' && newCondition.includes(oldPattern)) {
                newCondition = newCondition.replace(new RegExp(oldPattern, 'g'), newPattern);
                updated = true;
                console.log(`  🔗 Updated condition in clause "${clause.title}": ${oldPattern} → ${newPattern}`);
              }
            }
      
      if (updated) {
        const { error: updateError } = await supabase
          .from('template_clauses')
          .update({
            content: newContent,
            condition: newCondition
          })
          .eq('id', clause.id);
        
        if (updateError) {
          console.error(`❌ Error updating clause ${clause.id}:`, updateError);
        } else {
          clausesUpdated++;
          console.log(`✅ Updated clause ${clause.id}: "${clause.title}"`);
        }
      }
    }
    
    // Get all paragraphs
    const { data: paragraphs, error: paragraphsError } = await supabase
      .from('template_paragraphs')
      .select('id, content, condition, title');
    
    if (paragraphsError) {
      throw new Error(`Failed to fetch paragraphs: ${paragraphsError.message}`);
    }
    
    console.log(`📄 Found ${paragraphs.length} paragraphs to process`);
    
    // Process paragraphs
    for (const paragraph of paragraphs) {
      let updated = false;
      let newContent = paragraph.content || '';
      let newCondition = paragraph.condition || '';
      
            // Update content
            for (const [oldRef, newRef] of parameterMapping) {
              const oldPattern = `@${oldRef}`;
              const newPattern = `@${newRef}`;
              
              if (newContent && newContent.includes(oldPattern)) {
                newContent = newContent.replace(new RegExp(oldPattern, 'g'), newPattern);
                updated = true;
                console.log(`  📝 Updated content in paragraph "${paragraph.title}": ${oldPattern} → ${newPattern}`);
              }
              
              // Handle condition as JSON object
              if (newCondition && typeof newCondition === 'object') {
                const conditionStr = JSON.stringify(newCondition);
                if (conditionStr.includes(oldRef)) {
                  // Replace parameter references in the JSON structure
                  const updatedConditionStr = conditionStr.replace(new RegExp(`"${oldRef}"`, 'g'), `"${newRef}"`);
                  newCondition = JSON.parse(updatedConditionStr);
                  updated = true;
                  console.log(`  🔗 Updated condition in paragraph "${paragraph.title}": ${oldRef} → ${newRef}`);
                }
              } else if (newCondition && typeof newCondition === 'string' && newCondition.includes(oldPattern)) {
                newCondition = newCondition.replace(new RegExp(oldPattern, 'g'), newPattern);
                updated = true;
                console.log(`  🔗 Updated condition in paragraph "${paragraph.title}": ${oldPattern} → ${newPattern}`);
              }
            }
      
      if (updated) {
        const { error: updateError } = await supabase
          .from('template_paragraphs')
          .update({
            content: newContent,
            condition: newCondition
          })
          .eq('id', paragraph.id);
        
        if (updateError) {
          console.error(`❌ Error updating paragraph ${paragraph.id}:`, updateError);
        } else {
          paragraphsUpdated++;
          console.log(`✅ Updated paragraph ${paragraph.id}: "${paragraph.title}"`);
        }
      }
    }
    
    console.log('\n============================================================');
    console.log('📊 Parameter Reference Fix Summary:');
    console.log('============================================================');
    console.log(`📋 Clauses updated: ${clausesUpdated}`);
    console.log(`📄 Paragraphs updated: ${paragraphsUpdated}`);
    console.log('============================================================');
    console.log('✅ Parameter reference fix completed!');
    
  } catch (error) {
    console.error('❌ Error fixing parameter references:', error);
    process.exit(1);
  }
}

// Run the fix
fixParameterReferences();
