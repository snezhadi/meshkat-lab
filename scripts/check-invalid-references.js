require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkInvalidReferences() {
  console.log('🔍 Checking specific paragraphs with invalid parameter references...');
  
  // Check the specific paragraphs mentioned in the verification
  const paragraphIds = [6944, 6968];
  
  for (const paragraphId of paragraphIds) {
    console.log(`\n📄 Checking paragraph ID: ${paragraphId}`);
    
    const { data: paragraph, error } = await supabase
      .from('template_paragraphs')
      .select('id, title, content, condition, clause_id')
      .eq('id', paragraphId)
      .single();
    
    if (error) {
      console.error(`❌ Error fetching paragraph ${paragraphId}:`, error);
      continue;
    }
    
    if (!paragraph) {
      console.log(`⚠️  Paragraph ${paragraphId} not found`);
      continue;
    }
    
    console.log(`📝 Title: ${paragraph.title}`);
    console.log(`📄 Content: ${paragraph.content?.substring(0, 200)}${paragraph.content?.length > 200 ? '...' : ''}`);
    
    if (paragraph.condition) {
      console.log(`🔗 Condition: ${JSON.stringify(paragraph.condition)}`);
    }
    
    // Extract parameter references
    const parameterRegex = /@([a-zA-Z_][a-zA-Z0-9_]*)/g;
    const contentMatches = paragraph.content ? paragraph.content.match(parameterRegex) : [];
    const conditionMatches = paragraph.condition ? JSON.stringify(paragraph.condition).match(parameterRegex) : [];
    
    console.log(`🔍 Parameter references in content: ${contentMatches ? contentMatches.join(', ') : 'None'}`);
    console.log(`🔍 Parameter references in condition: ${conditionMatches ? conditionMatches.join(', ') : 'None'}`);
  }
  
  // Also check what parameters are available for template 12
  console.log('\n📊 Available parameters for EMPLOYMENT AGREEMENT (Template 12):');
  
  const { data: parameters, error: paramError } = await supabase
    .from('parameters')
    .select('custom_id, name')
    .eq('template_id', 12)
    .order('custom_id');
  
  if (paramError) {
    console.error('❌ Error fetching parameters:', paramError);
    return;
  }
  
  // Group parameters by prefix for easier reading
  const groupedParams = {};
  for (const param of parameters) {
    const prefix = param.custom_id.split('_')[0];
    if (!groupedParams[prefix]) {
      groupedParams[prefix] = [];
    }
    groupedParams[prefix].push(param.custom_id);
  }
  
  console.log('\n📋 Parameters grouped by prefix:');
  for (const [prefix, paramList] of Object.entries(groupedParams)) {
    console.log(`   ${prefix}: ${paramList.length} parameters`);
    if (prefix === 'deal' || prefix === 'work' || prefix === 'employment') {
      console.log(`     ${paramList.slice(0, 5).join(', ')}${paramList.length > 5 ? '...' : ''}`);
    }
  }
  
  // Look for similar parameter names
  console.log('\n🔍 Looking for parameters with similar names:');
  const similarNames = [
    'deal_commission_payment_duration',
    'employment_work_day_start_time', 
    'employment_work_day_end_time'
  ];
  
  for (const searchName of similarNames) {
    console.log(`\n🔍 Searching for parameters similar to "${searchName}":`);
    const parts = searchName.split('_');
    
    for (const part of parts) {
      const matching = parameters.filter(p => p.custom_id.includes(part));
      if (matching.length > 0) {
        console.log(`   Found ${matching.length} parameters containing "${part}":`);
        matching.slice(0, 3).forEach(p => {
          console.log(`     - ${p.custom_id}`);
        });
        if (matching.length > 3) {
          console.log(`     ... and ${matching.length - 3} more`);
        }
      }
    }
  }
}

checkInvalidReferences().catch(console.error);
