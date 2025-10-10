/**
 * Script to UPSERT document templates from document-templates-oct9.json to Supabase
 * - Deletes existing clauses and paragraphs for the templates
 * - Uploads new template data
 * - Handles introduction as a clause with sort_order = -1
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

// Template mapping
const templateMapping = {
  'employment_agreement': 'EMPLOYMENT AGREEMENT',
  'independent_contractor_agreement': 'Independent Contractor Agreement'
};

// Function to get template ID from database
async function getTemplateId(templateTitle) {
  const { data, error } = await supabase
    .from('templates')
    .select('id')
    .ilike('title', templateTitle)
    .single();
  
  if (error || !data) {
    console.error(`❌ Template not found: ${templateTitle}`);
    return null;
  }
  return data.id;
}

// Function to delete all clauses and paragraphs for a template
async function deleteTemplateContent(templateId, templateTitle) {
  console.log(`\n🗑️  Deleting existing content for ${templateTitle}...`);
  
  // First, get all clause IDs for this template
  const { data: clauses, error: fetchError } = await supabase
    .from('template_clauses')
    .select('id')
    .eq('template_id', templateId);
  
  if (fetchError) {
    console.error('❌ Error fetching clauses:', fetchError);
    return false;
  }
  
  if (clauses && clauses.length > 0) {
    const clauseIds = clauses.map(c => c.id);
    console.log(`  📋 Found ${clauseIds.length} clauses to delete`);
    
    // Delete paragraphs first (due to foreign key constraints)
    const { error: paragraphError } = await supabase
      .from('template_paragraphs')
      .delete()
      .in('clause_id', clauseIds);
    
    if (paragraphError) {
      console.error('❌ Error deleting paragraphs:', paragraphError);
      return false;
    }
    
    console.log(`  ✅ Deleted paragraphs`);
  }
  
  // Delete clauses
  const { error: clauseError } = await supabase
    .from('template_clauses')
    .delete()
    .eq('template_id', templateId);
  
  if (clauseError) {
    console.error('❌ Error deleting clauses:', clauseError);
    return false;
  }
  
  console.log('✅ Existing content deleted successfully');
  return true;
}

// Function to insert introduction as a clause with sort_order = -1
async function insertIntroduction(templateId, introduction) {
  console.log(`\n📝 Inserting introduction as clause (sort_order = -1)...`);
  
  const { data, error } = await supabase
    .from('template_clauses')
    .insert({
      template_id: templateId,
      title: introduction.title,
      content: introduction.content,
      description: '',
      llm_description: '',
      sort_order: -1,
      condition: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  
  if (error) {
    console.error('❌ Error inserting introduction:', error);
    return null;
  }
  
  console.log(`✅ Introduction inserted (ID: ${data.id})`);
  return data.id;
}

// Function to insert a clause
async function insertClause(templateId, clause, sortOrder) {
  const { data, error } = await supabase
    .from('template_clauses')
    .insert({
      template_id: templateId,
      title: clause.title,
      content: clause.content || '',
      description: clause.description || '',
      llm_description: clause.metadata?.llm_description || '',
      sort_order: sortOrder,
      condition: clause.condition,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  
  if (error) {
    console.error(`❌ Error inserting clause "${clause.title}":`, error.message);
    return null;
  }
  
  return data.id;
}

// Function to insert paragraphs for a clause
async function insertParagraphs(clauseId, paragraphs) {
  if (!paragraphs || paragraphs.length === 0) {
    return 0;
  }
  
  let insertedCount = 0;
  
  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i];
    
    const { error } = await supabase
      .from('template_paragraphs')
      .insert({
        clause_id: clauseId,
        title: paragraph.title,
        content: paragraph.content || '',
        description: paragraph.description || '',
        llm_description: paragraph.metadata?.llm_description || '',
        sort_order: i,
        condition: paragraph.condition || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    
    if (error) {
      console.error(`  ❌ Error inserting paragraph "${paragraph.title}":`, error.message);
    } else {
      insertedCount++;
    }
  }
  
  return insertedCount;
}

// Main function to process templates
async function processTemplates() {
  console.log('📂 Reading document-templates-oct9.json...');
  const filePath = path.join(__dirname, '../data/document-templates-oct9.json');
  const templateData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  // Handle both single template and array of templates
  const templates = Array.isArray(templateData) ? templateData : [templateData];
  
  console.log(`📊 Found ${templates.length} template(s) to process\n`);
  
  for (const template of templates) {
    const templateTitle = templateMapping[template.id];
    
    if (!templateTitle) {
      console.warn(`⚠️  Unknown template ID: ${template.id}, skipping...`);
      continue;
    }
    
    console.log('='.repeat(60));
    console.log(`Processing: ${templateTitle}`);
    console.log('='.repeat(60));
    
    // Get template ID from database
    const templateId = await getTemplateId(templateTitle);
    if (!templateId) {
      console.error(`❌ Skipping template: ${templateTitle}`);
      continue;
    }
    
    console.log(`📋 Template ID: ${templateId}`);
    
    // Delete existing content
    const deleted = await deleteTemplateContent(templateId, templateTitle);
    if (!deleted) {
      console.error(`❌ Failed to delete content for ${templateTitle}, skipping...`);
      continue;
    }
    
    let totalClauses = 0;
    let totalParagraphs = 0;
    
    // Insert introduction
    if (template.introduction) {
      const introId = await insertIntroduction(templateId, template.introduction);
      if (introId) {
        totalClauses++;
      }
    }
    
    // Insert clauses and paragraphs
    console.log(`\n📝 Inserting ${template.clauses.length} clauses...`);
    
    for (let i = 0; i < template.clauses.length; i++) {
      const clause = template.clauses[i];
      
      console.log(`\n[${i + 1}/${template.clauses.length}] Processing clause: ${clause.title}`);
      
      // Insert clause
      const clauseId = await insertClause(templateId, clause, i);
      if (!clauseId) {
        console.error(`  ❌ Failed to insert clause, skipping paragraphs...`);
        continue;
      }
      
      console.log(`  ✅ Clause inserted (ID: ${clauseId})`);
      totalClauses++;
      
      // Insert paragraphs
      if (clause.paragraphs && clause.paragraphs.length > 0) {
        console.log(`  📄 Inserting ${clause.paragraphs.length} paragraphs...`);
        const paragraphCount = await insertParagraphs(clauseId, clause.paragraphs);
        console.log(`  ✅ Inserted ${paragraphCount} paragraphs`);
        totalParagraphs += paragraphCount;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`✅ ${templateTitle} Summary:`);
    console.log('='.repeat(60));
    console.log(`📝 Total clauses inserted: ${totalClauses} (including introduction)`);
    console.log(`📄 Total paragraphs inserted: ${totalParagraphs}`);
    console.log('='.repeat(60));
  }
}

// Run the script
async function main() {
  console.log('🚀 Starting template UPSERT from document-templates-oct9.json...\n');
  
  try {
    await processTemplates();
    console.log('\n✅ All templates processed successfully!');
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

main();

