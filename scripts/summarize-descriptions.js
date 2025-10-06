#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Path to the document templates file
const DOCUMENT_TEMPLATES_FILE = path.join(__dirname, '..', 'data', 'document-templates.json');

function createUserFriendlySummary(llmDescription) {
  if (!llmDescription || llmDescription.trim() === '') {
    return '';
  }

  // Split into sentences and clean up
  const sentences = llmDescription
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 10);

  // Extract key information for user-friendly summary
  let summary = '';
  
  // Find the main purpose/definition (usually first sentence)
  if (sentences.length > 0) {
    const firstSentence = sentences[0];
    // Clean up the first sentence to be more user-friendly
    let mainPurpose = firstSentence
      .replace(/^This clause\s+/i, 'This section ')
      .replace(/^This paragraph\s+/i, 'This section ')
      .replace(/^The \w+\s+clause\s+/i, 'This section ')
      .replace(/^The \w+\s+paragraph\s+/i, 'This section ')
      .replace(/\s+clause\s+in\s+an\s+Employment\s+Agreement\s+provides/i, ' section provides')
      .replace(/Employment Agreement/gi, 'agreement')
      .replace(/the Agreement/gi, 'this agreement');
    
    summary += `**Purpose:** ${mainPurpose}.\n\n`;
  }

  // Extract key points (look for bullet points or "Key" sections)
  const keyPoints = [];
  const keySections = llmDescription.match(/Key\s+(?:Points?|Provisions?|Aspects?|Features?):?\s*\n([\s\S]*?)(?:\n\n|$)/gi);
  
  if (keySections) {
    keySections.forEach(section => {
      const lines = section.split('\n').slice(1); // Remove the "Key..." header
      lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.match(/^Key\s+/i) && trimmed.length > 10) {
          // Clean up the line
          let cleanPoint = trimmed
            .replace(/^[-*•]\s*/, '')
            .replace(/^[\d]+\.\s*/, '')
            .replace(/^[\w\s]+:\s*/, '') // Remove "Category: " prefixes
            .replace(/&nbsp;/g, ' ')
            .trim();
          
          if (cleanPoint && cleanPoint.length > 15) {
            keyPoints.push(cleanPoint);
          }
        }
      });
    });
  }

  // If no key points found, extract important sentences
  if (keyPoints.length === 0 && sentences.length > 1) {
    sentences.slice(1, 4).forEach(sentence => {
      if (sentence.length > 20 && sentence.length < 150) {
        let cleanSentence = sentence
          .replace(/^[\w\s]+:\s*/, '')
          .replace(/&nbsp;/g, ' ')
          .trim();
        
        if (cleanSentence && !cleanSentence.toLowerCase().includes('important notes') && 
            !cleanSentence.toLowerCase().includes('considerations') &&
            !cleanSentence.toLowerCase().includes('purpose and significance')) {
          keyPoints.push(cleanSentence);
        }
      }
    });
  }

  // Add key points to summary
  if (keyPoints.length > 0) {
    summary += '**Key Features:**\n';
    keyPoints.slice(0, 3).forEach((point, index) => {
      summary += `${index + 1}. ${point}\n`;
    });
    if (keyPoints.length > 3) {
      summary += `\n*...and ${keyPoints.length - 3} more features*`;
    }
  }

  // Add a brief note about importance if relevant
  const importanceKeywords = ['important', 'essential', 'critical', 'required', 'necessary'];
  const hasImportance = importanceKeywords.some(keyword => 
    llmDescription.toLowerCase().includes(keyword)
  );
  
  if (hasImportance && keyPoints.length === 0) {
    summary += '\n\n**Note:** This section contains important terms and conditions that affect the employment relationship.';
  }

  return summary.trim();
}

function processDocumentTemplates() {
  try {
    console.log('📖 Reading document templates file...');
    const fileContent = fs.readFileSync(DOCUMENT_TEMPLATES_FILE, 'utf8');
    const documentTemplates = JSON.parse(fileContent);
    
    console.log(`📊 Found ${documentTemplates.length} document templates`);
    
    let totalProcessed = 0;
    let totalUpdated = 0;
    
    // Process each template
    documentTemplates.forEach((template, templateIndex) => {
      console.log(`\n🔧 Processing template ${templateIndex + 1}: ${template.title || template.id}`);
      
      // Process template-level description
      if (template.metadata && template.metadata.llm_description) {
        totalProcessed++;
        const newDescription = createUserFriendlySummary(template.metadata.llm_description);
        if (newDescription && newDescription !== template.description) {
          template.description = newDescription;
          totalUpdated++;
          console.log(`  📝 Updated template description`);
        }
      }
      
      // Process introduction
      if (template.introduction && template.introduction.metadata && template.introduction.metadata.llm_description) {
        totalProcessed++;
        const newDescription = createUserFriendlySummary(template.introduction.metadata.llm_description);
        if (newDescription && newDescription !== template.introduction.description) {
          template.introduction.description = newDescription;
          totalUpdated++;
          console.log(`  📝 Updated introduction description`);
        }
      }
      
      // Process clauses
      if (template.clauses && Array.isArray(template.clauses)) {
        template.clauses.forEach((clause, clauseIndex) => {
          // Process clause-level description
          if (clause.metadata && clause.metadata.llm_description) {
            totalProcessed++;
            const newDescription = createUserFriendlySummary(clause.metadata.llm_description);
            if (newDescription && newDescription !== clause.description) {
              clause.description = newDescription;
              totalUpdated++;
              console.log(`    📝 Updated clause: ${clause.title}`);
            }
          }
          
          // Process paragraphs
          if (clause.paragraphs && Array.isArray(clause.paragraphs)) {
            clause.paragraphs.forEach((paragraph, paragraphIndex) => {
              if (paragraph.metadata && paragraph.metadata.llm_description) {
                totalProcessed++;
                const newDescription = createUserFriendlySummary(paragraph.metadata.llm_description);
                if (newDescription && newDescription !== paragraph.description) {
                  paragraph.description = newDescription;
                  totalUpdated++;
                  console.log(`      📝 Updated paragraph: ${paragraph.title}`);
                }
              }
            });
          }
        });
      }
    });
    
    // Write the updated data back to the file
    console.log('\n💾 Writing updated document templates...');
    const updatedContent = JSON.stringify(documentTemplates, null, 2);
    fs.writeFileSync(DOCUMENT_TEMPLATES_FILE, updatedContent, 'utf8');
    
    console.log('✅ Successfully updated descriptions!');
    console.log('\n📊 Summary:');
    console.log(`- Total sections processed: ${totalProcessed}`);
    console.log(`- Descriptions updated: ${totalUpdated}`);
    console.log(`- Descriptions unchanged: ${totalProcessed - totalUpdated}`);
    console.log('- All descriptions are now user-friendly with markdown formatting');
    console.log('- llm_description fields remain unchanged');
    
  } catch (error) {
    console.error('❌ Error processing document templates:', error.message);
    process.exit(1);
  }
}

// Run the script
processDocumentTemplates();
