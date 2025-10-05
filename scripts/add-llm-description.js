#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Path to the document templates file
const DOCUMENT_TEMPLATES_FILE = path.join(__dirname, '..', 'data', 'document-templates.json');

function addLlmDescriptionToObject(obj) {
  if (obj && typeof obj === 'object') {
    // Add llm_description field if description exists
    if (obj.description !== undefined) {
      obj.llm_description = obj.description;
    }
    
    // Recursively process nested objects and arrays
    for (const key in obj) {
      if (obj[key] && typeof obj[key] === 'object') {
        addLlmDescriptionToObject(obj[key]);
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
      
      // Process introduction
      if (template.introduction) {
        console.log('  📝 Processing introduction...');
        addLlmDescriptionToObject(template.introduction);
      }
      
      // Process clauses
      if (template.clauses && Array.isArray(template.clauses)) {
        console.log(`  📋 Processing ${template.clauses.length} clauses...`);
        template.clauses.forEach((clause, clauseIndex) => {
          addLlmDescriptionToObject(clause);
          
          // Process paragraphs within clause
          if (clause.paragraphs && Array.isArray(clause.paragraphs)) {
            console.log(`    📄 Processing ${clause.paragraphs.length} paragraphs in clause "${clause.title}"...`);
            clause.paragraphs.forEach((paragraph, paragraphIndex) => {
              addLlmDescriptionToObject(paragraph);
            });
          }
        });
      }
    });
    
    // Write the updated data back to the file
    console.log('\n💾 Writing updated document templates...');
    const updatedContent = JSON.stringify(documentTemplates, null, 2);
    fs.writeFileSync(DOCUMENT_TEMPLATES_FILE, updatedContent, 'utf8');
    
    console.log('✅ Successfully added llm_description field to all relevant sections!');
    console.log('\n📊 Summary:');
    console.log('- Added llm_description to all introduction sections');
    console.log('- Added llm_description to all clause sections');
    console.log('- Added llm_description to all paragraph sections');
    console.log('- Each llm_description field contains the exact content of the description field');
    
  } catch (error) {
    console.error('❌ Error processing document templates:', error.message);
    process.exit(1);
  }
}

// Run the script
processDocumentTemplates();
