#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Path to the document templates file
const DOCUMENT_TEMPLATES_FILE = path.join(__dirname, '..', 'data', 'document-templates.json');

function addMetadataToObject(obj) {
  if (obj && typeof obj === 'object') {
    // Add metadata.llm_description if description exists
    if (obj.description !== undefined && obj.description !== null && obj.description !== '') {
      // Initialize metadata object if it doesn't exist
      if (!obj.metadata) {
        obj.metadata = {};
      }
      // Add llm_description to metadata
      obj.metadata.llm_description = obj.description;
      
      // Remove the old llm_description field if it exists
      if (obj.llm_description !== undefined) {
        delete obj.llm_description;
      }
    }
    
    // Recursively process nested objects and arrays
    for (const key in obj) {
      if (obj[key] && typeof obj[key] === 'object') {
        addMetadataToObject(obj[key]);
      }
    }
  }
}

function processDocumentTemplates() {
  try {
    console.log('📖 Reading document templates file...');
    const fileContent = fs.readFileSync(DOCUMENT_TEMPLATES_FILE, 'utf8');
    const documentTemplates = JSON.parse(fileContent);
    
    console.log(`📊 Found ${documentTemplates.length} document templates`);
    
    // Process each template
    documentTemplates.forEach((template, templateIndex) => {
      console.log(`\n🔧 Processing template ${templateIndex + 1}: ${template.title || template.id}`);
      
      // Process template-level description
      if (template.description) {
        console.log('  📝 Processing template-level description...');
        addMetadataToObject(template);
      }
      
      // Process introduction
      if (template.introduction) {
        console.log('  📝 Processing introduction...');
        addMetadataToObject(template.introduction);
      }
      
      // Process clauses
      if (template.clauses && Array.isArray(template.clauses)) {
        console.log(`  📋 Processing ${template.clauses.length} clauses...`);
        template.clauses.forEach((clause, clauseIndex) => {
          console.log(`    🔧 Processing clause ${clauseIndex + 1}: ${clause.title}`);
          addMetadataToObject(clause);
          
          // Process paragraphs within clause
          if (clause.paragraphs && Array.isArray(clause.paragraphs)) {
            console.log(`      📄 Processing ${clause.paragraphs.length} paragraphs...`);
            clause.paragraphs.forEach((paragraph, paragraphIndex) => {
              addMetadataToObject(paragraph);
            });
          }
        });
      }
    });
    
    // Write the updated data back to the file
    console.log('\n💾 Writing updated document templates...');
    const updatedContent = JSON.stringify(documentTemplates, null, 2);
    fs.writeFileSync(DOCUMENT_TEMPLATES_FILE, updatedContent, 'utf8');
    
    console.log('✅ Successfully updated metadata structure!');
    console.log('\n📊 Summary:');
    console.log('- Added metadata.llm_description to template-level descriptions');
    console.log('- Added metadata.llm_description to all introduction sections with descriptions');
    console.log('- Added metadata.llm_description to all clause sections with descriptions');
    console.log('- Added metadata.llm_description to all paragraph sections with descriptions');
    console.log('- Removed any old llm_description fields');
    console.log('- Each metadata.llm_description field contains the exact content of the description field');
    
  } catch (error) {
    console.error('❌ Error processing document templates:', error.message);
    process.exit(1);
  }
}

// Run the script
processDocumentTemplates();
