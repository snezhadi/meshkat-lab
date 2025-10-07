const fs = require('fs');
const path = require('path');

// Path to the document templates file
const DOCUMENT_TEMPLATES_FILE = path.join(__dirname, '..', 'data', 'document-templates.json');

console.log('🔍 Comprehensive template analysis...');

try {
  const data = fs.readFileSync(DOCUMENT_TEMPLATES_FILE, 'utf8');
  const templates = JSON.parse(data);
  
  console.log(`📊 Total templates: ${templates.length}`);
  
  templates.forEach((template, templateIndex) => {
    console.log(`\n📄 Template ${templateIndex + 1}: ${template.title} (${template.id})`);
    console.log(`   📝 Clauses: ${template.clauses.length}`);
    
    // Check for duplicate clause IDs
    const clauseIds = template.clauses.map(c => c.id);
    const uniqueClauseIds = [...new Set(clauseIds)];
    
    if (clauseIds.length !== uniqueClauseIds.length) {
      console.log(`   ❌ DUPLICATE CLAUSE IDS FOUND!`);
      const duplicates = clauseIds.filter((id, index) => clauseIds.indexOf(id) !== index);
      console.log(`   🔍 Duplicate IDs: ${[...new Set(duplicates)].join(', ')}`);
      
      // Show details of duplicate clauses
      duplicates.forEach(dupId => {
        const clausesWithId = template.clauses.filter(c => c.id === dupId);
        console.log(`   📋 Clauses with ID "${dupId}":`);
        clausesWithId.forEach((clause, idx) => {
          console.log(`      ${idx + 1}. "${clause.title}" (${clause.id})`);
        });
      });
    } else {
      console.log(`   ✅ No duplicate clause IDs`);
    }
    
    // Check for empty or malformed clauses
    template.clauses.forEach((clause, clauseIndex) => {
      if (!clause.id || !clause.title) {
        console.log(`   ⚠️  Malformed clause at index ${clauseIndex}:`, clause);
      }
    });
    
    // Check paragraphs for duplicates
    template.clauses.forEach((clause, clauseIndex) => {
      if (clause.paragraphs && clause.paragraphs.length > 0) {
        const paragraphIds = clause.paragraphs.map(p => p.id);
        const uniqueParagraphIds = [...new Set(paragraphIds)];
        
        if (paragraphIds.length !== uniqueParagraphIds.length) {
          console.log(`   ❌ DUPLICATE PARAGRAPH IDS in clause "${clause.title}"!`);
          const duplicates = paragraphIds.filter((id, index) => paragraphIds.indexOf(id) !== index);
          console.log(`   🔍 Duplicate paragraph IDs: ${[...new Set(duplicates)].join(', ')}`);
        }
      }
    });
  });
  
  console.log(`\n✅ Analysis complete!`);
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
