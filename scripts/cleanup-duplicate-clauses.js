const fs = require('fs');
const path = require('path');

// Path to the document templates file
const DOCUMENT_TEMPLATES_FILE = path.join(__dirname, '..', 'data', 'document-templates.json');

console.log('🧹 Cleaning up duplicate clauses...');

try {
  // Read the current document templates
  const data = fs.readFileSync(DOCUMENT_TEMPLATES_FILE, 'utf8');
  const templates = JSON.parse(data);
  
  let totalDuplicates = 0;
  let fixedTemplates = 0;
  
  // Process each template
  templates.forEach((template, templateIndex) => {
    console.log(`\n📄 Processing template: ${template.title} (${template.id})`);
    
    // Track unique clause IDs and keep the latest version
    const clauseMap = new Map();
    let duplicatesInTemplate = 0;
    
    // Process clauses - keep the last occurrence of each ID
    template.clauses.forEach((clause, clauseIndex) => {
      if (clauseMap.has(clause.id)) {
        console.log(`  ❌ Found duplicate clause: "${clause.title}" (ID: ${clause.id})`);
        console.log(`     Keeping the latest version (index ${clauseIndex})`);
        duplicatesInTemplate++;
        totalDuplicates++;
      }
      clauseMap.set(clause.id, clause);
    });
    
    if (duplicatesInTemplate > 0) {
      console.log(`  ✅ Removed ${duplicatesInTemplate} duplicate clauses`);
      template.clauses = Array.from(clauseMap.values());
      fixedTemplates++;
    } else {
      console.log(`  ✅ No duplicates found`);
    }
  });
  
  if (totalDuplicates > 0) {
    console.log(`\n💾 Saving cleaned templates...`);
    
    // Create backup
    const backupFile = path.join(__dirname, '..', 'data', `document-templates-cleanup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(backupFile, data, 'utf8');
    console.log(`📦 Backup created: ${backupFile}`);
    
    // Save cleaned data
    fs.writeFileSync(DOCUMENT_TEMPLATES_FILE, JSON.stringify(templates, null, 2), 'utf8');
    console.log(`✅ Cleaned ${totalDuplicates} duplicate clauses in ${fixedTemplates} templates`);
  } else {
    console.log(`\n✅ No duplicate clauses found!`);
  }
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
