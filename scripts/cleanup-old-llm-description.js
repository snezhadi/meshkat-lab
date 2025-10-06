#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Path to the document templates file
const DOCUMENT_TEMPLATES_FILE = path.join(__dirname, '..', 'data', 'document-templates.json');

function removeOldLlmDescription(obj) {
  if (obj && typeof obj === 'object') {
    // Remove the old llm_description field if it exists
    if (obj.llm_description !== undefined) {
      delete obj.llm_description;
    }
    
    // Recursively process nested objects and arrays
    for (const key in obj) {
      if (obj[key] && typeof obj[key] === 'object') {
        removeOldLlmDescription(obj[key]);
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
      removeOldLlmDescription(template);
    });
    
    // Write the updated data back to the file
    console.log('\n💾 Writing updated document templates...');
    const updatedContent = JSON.stringify(documentTemplates, null, 2);
    fs.writeFileSync(DOCUMENT_TEMPLATES_FILE, updatedContent, 'utf8');
    
    console.log('✅ Successfully cleaned up old llm_description fields!');
    console.log('\n📊 Summary:');
    console.log('- Removed all old llm_description fields');
    console.log('- Kept all metadata.llm_description fields');
    console.log('- All descriptions are now properly structured in metadata objects');
    
  } catch (error) {
    console.error('❌ Error processing document templates:', error.message);
    process.exit(1);
  }
}

// Run the script
processDocumentTemplates();
