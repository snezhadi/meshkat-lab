require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Supabase URL or Service Role Key is missing. Make sure .env.local is configured.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function fixSortOrders() {
  console.log('🔧 Starting sort order fix...');

  try {
    // First, let's see the current state
    console.log('\n📊 Current sort_order state:');
    
    const { data: templates } = await supabase
      .from('templates')
      .select('id, title')
      .order('id');
    
    for (const template of templates) {
      console.log(`\n📋 Template ${template.id}: ${template.title}`);
      
      // Get clauses for this template
      const { data: clauses } = await supabase
        .from('template_clauses')
        .select('id, title, sort_order')
        .eq('template_id', template.id)
        .order('sort_order');
      
      console.log(`  📄 Clauses (${clauses.length}):`);
      clauses.forEach(clause => {
        console.log(`    - ${clause.id}: "${clause.title}" (sort_order: ${clause.sort_order})`);
      });
      
      // Get paragraphs for this template
      const { data: paragraphs } = await supabase
        .from('template_paragraphs')
        .select('id, title, sort_order, clause_id')
        .in('clause_id', clauses.map(c => c.id))
        .order('clause_id, sort_order');
      
      console.log(`  📝 Paragraphs (${paragraphs.length}):`);
      paragraphs.forEach(paragraph => {
        const clauseTitle = clauses.find(c => c.id === paragraph.clause_id)?.title || 'Unknown';
        console.log(`    - ${paragraph.id}: "${paragraph.title}" (clause: ${clauseTitle}, sort_order: ${paragraph.sort_order})`);
      });
    }

    // Now fix the sort orders
    console.log('\n🔧 Fixing sort orders...');
    
    for (const template of templates) {
      console.log(`\n📋 Fixing Template ${template.id}: ${template.title}`);
      
      // Fix clause sort orders
      const { data: clauses } = await supabase
        .from('template_clauses')
        .select('id, title, sort_order')
        .eq('template_id', template.id)
        .order('sort_order');
      
      console.log(`  📄 Fixing ${clauses.length} clauses...`);
      for (let i = 0; i < clauses.length; i++) {
        const clause = clauses[i];
        const newSortOrder = clause.sort_order === -1 ? -1 : i; // Keep introduction as -1
        
        if (clause.sort_order !== newSortOrder) {
          console.log(`    🔄 Updating clause ${clause.id} ("${clause.title}"): ${clause.sort_order} → ${newSortOrder}`);
          await supabase
            .from('template_clauses')
            .update({ sort_order: newSortOrder })
            .eq('id', clause.id);
        } else {
          console.log(`    ✅ Clause ${clause.id} ("${clause.title}"): sort_order ${clause.sort_order} is correct`);
        }
      }
      
      // Fix paragraph sort orders for each clause
      for (const clause of clauses) {
        if (clause.sort_order === -1) continue; // Skip introduction clause
        
        const { data: paragraphs } = await supabase
          .from('template_paragraphs')
          .select('id, title, sort_order')
          .eq('clause_id', clause.id)
          .order('sort_order');
        
        console.log(`    📝 Fixing ${paragraphs.length} paragraphs in clause ${clause.id} ("${clause.title}")...`);
        for (let i = 0; i < paragraphs.length; i++) {
          const paragraph = paragraphs[i];
          const newSortOrder = i;
          
          if (paragraph.sort_order !== newSortOrder) {
            console.log(`      🔄 Updating paragraph ${paragraph.id} ("${paragraph.title}"): ${paragraph.sort_order} → ${newSortOrder}`);
            await supabase
              .from('template_paragraphs')
              .update({ sort_order: newSortOrder })
              .eq('id', paragraph.id);
          } else {
            console.log(`      ✅ Paragraph ${paragraph.id} ("${paragraph.title}"): sort_order ${paragraph.sort_order} is correct`);
          }
        }
      }
    }

    console.log('\n✅ Sort order fix completed!');
    
    // Show final state
    console.log('\n📊 Final sort_order state:');
    
    for (const template of templates) {
      console.log(`\n📋 Template ${template.id}: ${template.title}`);
      
      const { data: clauses } = await supabase
        .from('template_clauses')
        .select('id, title, sort_order')
        .eq('template_id', template.id)
        .order('sort_order');
      
      console.log(`  📄 Clauses (${clauses.length}):`);
      clauses.forEach(clause => {
        console.log(`    - ${clause.id}: "${clause.title}" (sort_order: ${clause.sort_order})`);
      });
      
      const { data: paragraphs } = await supabase
        .from('template_paragraphs')
        .select('id, title, sort_order, clause_id')
        .in('clause_id', clauses.map(c => c.id))
        .order('clause_id, sort_order');
      
      console.log(`  📝 Paragraphs (${paragraphs.length}):`);
      paragraphs.forEach(paragraph => {
        const clauseTitle = clauses.find(c => c.id === paragraph.clause_id)?.title || 'Unknown';
        console.log(`    - ${paragraph.id}: "${paragraph.title}" (clause: ${clauseTitle}, sort_order: ${paragraph.sort_order})`);
      });
    }

  } catch (error) {
    console.error('❌ Error fixing sort orders:', error);
  }
}

fixSortOrders();
