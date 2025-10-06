#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Path to the parameters file
const PARAMETERS_FILE = path.join(__dirname, '..', 'data', 'parameters.json');

function createParameterSummary(llmDescription) {
  if (!llmDescription || llmDescription.trim() === '') {
    return '';
  }

  // Split into sentences and clean up
  const sentences = llmDescription
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 10);

  // Extract key information for parameter-focused summary
  let summary = '';
  
  // Find the main purpose/definition (usually first sentence)
  if (sentences.length > 0) {
    const firstSentence = sentences[0];
    // Clean up the first sentence to be more user-friendly
    let mainPurpose = firstSentence
      .replace(/^The \w+\s+is\s+/i, 'This parameter defines ')
      .replace(/^This \w+\s+is\s+/i, 'This parameter defines ')
      .replace(/^An?\s+\w+\s+is\s+/i, 'This parameter defines ')
      .replace(/^In\s+employment\s+contracts?/i, 'In employment agreements')
      .replace(/Employment Agreement/gi, 'employment agreement')
      .replace(/the Agreement/gi, 'the agreement');
    
    summary += `**Purpose:** ${mainPurpose}.\n\n`;
  }

  // Extract key features/characteristics specific to parameters
  const keyFeatures = [];
  
  // Look for parameter-specific information
  const parameterKeywords = ['format', 'type', 'default', 'required', 'optional', 'validation', 'input', 'field'];
  const technicalInfo = [];
  
  // Extract format information
  const formatMatch = llmDescription.match(/format[:\s]*([^\n]+)/i);
  if (formatMatch) {
    technicalInfo.push(`Format: ${formatMatch[1].trim()}`);
  }
  
  // Extract type information
  const typeMatch = llmDescription.match(/(?:type|input)[:\s]*([^\n]+)/i);
  if (typeMatch) {
    technicalInfo.push(`Input Type: ${typeMatch[1].trim()}`);
  }
  
  // Extract validation rules
  const validationMatch = llmDescription.match(/(?:validation|rules?|requirements?)[:\s]*([^\n]+)/i);
  if (validationMatch) {
    technicalInfo.push(`Validation: ${validationMatch[1].trim()}`);
  }

  // Look for key points or important information
  const keySections = llmDescription.match(/Key\s+(?:Points?|Features?|Information|Considerations?):?\s*\n([\s\S]*?)(?:\n\n|$)/gi);
  
  if (keySections) {
    keySections.forEach(section => {
      const lines = section.split('\n').slice(1); // Remove the "Key..." header
      lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.match(/^Key\s+/i) && trimmed.length > 15) {
          // Clean up the line
          let cleanPoint = trimmed
            .replace(/^[-*•]\s*/, '')
            .replace(/^[\d]+\.\s*/, '')
            .replace(/^[\w\s]+:\s*/, '') // Remove "Category: " prefixes
            .replace(/&nbsp;/g, ' ')
            .trim();
          
          if (cleanPoint && cleanPoint.length > 15 && cleanPoint.length < 200) {
            keyFeatures.push(cleanPoint);
          }
        }
      });
    });
  }

  // If no key sections found, extract important sentences
  if (keyFeatures.length === 0 && sentences.length > 1) {
    sentences.slice(1, 4).forEach(sentence => {
      if (sentence.length > 20 && sentence.length < 150) {
        let cleanSentence = sentence
          .replace(/^[\w\s]+:\s*/, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/Clearly defining/, 'Helps ensure')
          .replace(/helps avoid confusion/, 'prevents confusion')
          .replace(/ensures proper/, 'ensures proper')
          .trim();
        
        if (cleanSentence && !cleanSentence.toLowerCase().includes('example') && 
            !cleanSentence.toLowerCase().includes('note:') &&
            !cleanSentence.toLowerCase().includes('important notes')) {
          keyFeatures.push(cleanSentence);
        }
      }
    });
  }

  // Add key features to summary
  if (keyFeatures.length > 0) {
    summary += '**Key Information:**\n';
    keyFeatures.slice(0, 3).forEach((point, index) => {
      summary += `${index + 1}. ${point}\n`;
    });
    if (keyFeatures.length > 3) {
      summary += `\n*...and ${keyFeatures.length - 3} more details*`;
    }
  }

  // Add technical information if available
  if (technicalInfo.length > 0) {
    if (keyFeatures.length > 0) {
      summary += '\n';
    }
    summary += '\n**Technical Details:**\n';
    technicalInfo.forEach((info, index) => {
      summary += `- ${info}\n`;
    });
  }

  // Add usage note for complex parameters
  const isComplex = llmDescription.length > 500 || 
                   llmDescription.includes('scenario') || 
                   llmDescription.includes('example');
  
  if (isComplex) {
    summary += '\n\n**Usage:** This parameter requires careful consideration based on specific employment circumstances.';
  }

  return summary.trim();
}

function processParameters() {
  try {
    console.log('📖 Reading parameters file...');
    const fileContent = fs.readFileSync(PARAMETERS_FILE, 'utf8');
    const parameters = JSON.parse(fileContent);
    
    console.log(`📊 Found ${parameters.length} parameters`);
    
    let totalProcessed = 0;
    let totalUpdated = 0;
    
    // Process each parameter
    parameters.forEach((parameter, parameterIndex) => {
      if (parameterIndex % 50 === 0) {
        console.log(`\n🔧 Processing parameters ${parameterIndex + 1}-${Math.min(parameterIndex + 50, parameters.length)}...`);
      }
      
      // Add llm_description to metadata if it doesn't exist
      if (parameter.description && parameter.metadata) {
        if (!parameter.metadata.llm_description) {
          parameter.metadata.llm_description = parameter.description;
          totalProcessed++;
        }
        
        // Create user-friendly summary
        const newDescription = createParameterSummary(parameter.metadata.llm_description);
        if (newDescription && newDescription !== parameter.description) {
          parameter.description = newDescription;
          totalUpdated++;
        }
      }
    });
    
    // Write the updated data back to the file
    console.log('\n💾 Writing updated parameters...');
    const updatedContent = JSON.stringify(parameters, null, 2);
    fs.writeFileSync(PARAMETERS_FILE, updatedContent, 'utf8');
    
    console.log('✅ Successfully updated parameter descriptions!');
    console.log('\n📊 Summary:');
    console.log(`- Total parameters processed: ${totalProcessed}`);
    console.log(`- Descriptions updated: ${totalUpdated}`);
    console.log(`- llm_description fields added to metadata: ${totalProcessed}`);
    console.log('- All descriptions are now user-friendly with parameter-focused formatting');
    console.log('- llm_description fields in metadata contain original detailed content');
    
  } catch (error) {
    console.error('❌ Error processing parameters:', error.message);
    process.exit(1);
  }
}

// Run the script
processParameters();
