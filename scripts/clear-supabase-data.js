const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Initialize Supabase client (server-side only)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearAllData() {
  console.log('🗑️  Clearing all data from Supabase...\n');

  try {
    // Delete in reverse order of dependencies
    console.log('   🗑️  Deleting parameter defaults...');
    await supabase.from('parameter_defaults').delete().neq('id', 0);
    
    console.log('   🗑️  Deleting parameters...');
    await supabase.from('parameters').delete().neq('id', 0);
    
    console.log('   🗑️  Deleting parameter subgroups...');
    await supabase.from('parameter_subgroups').delete().neq('id', 0);
    
    console.log('   🗑️  Deleting parameter groups...');
    await supabase.from('parameter_groups').delete().neq('id', 0);
    
    console.log('   🗑️  Deleting template paragraphs...');
    await supabase.from('template_paragraphs').delete().neq('id', 0);
    
    console.log('   🗑️  Deleting template clauses...');
    await supabase.from('template_clauses').delete().neq('id', 0);
    
    console.log('   🗑️  Deleting templates...');
    await supabase.from('templates').delete().neq('id', 0);
    
    console.log('   🗑️  Deleting jurisdictions...');
    await supabase.from('jurisdictions').delete().neq('id', 0);
    
    console.log('   🗑️  Deleting priority levels...');
    await supabase.from('priority_levels').delete().neq('id', 0);
    
    console.log('   🗑️  Deleting input types...');
    await supabase.from('input_types').delete().neq('id', 0);
    
    console.log('   🗑️  Deleting parameter types...');
    await supabase.from('parameter_types').delete().neq('id', 0);
    
    console.log('\n✅ All data cleared successfully!');
  } catch (error) {
    console.error('\n❌ Error clearing data:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  clearAllData();
}

module.exports = { clearAllData };

