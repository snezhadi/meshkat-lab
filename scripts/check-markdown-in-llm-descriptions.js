#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Path to the document templates file
const DOCUMENT_TEMPLATES_FILE = path.join(__dirname, '..', 'data', 'document-templates.json');

// Markdown patterns to check for
const markdownPatterns = {
  bold: /\*\*([^*]+)\*\*/g,
  italic: /\*([^*]+)\*/g,
  code: /`([^`]+)`/g,
  headers: /^#{1,6}\s+/gm,
  links: /\[([^\]]+)\]\(([^)]+)\)/g,
  images: /!\[([^\]]*)\]\(([^)]+)\)/g,
  lists: /^[\s]*[-*+]\s+/gm,
  numberedLists: /^[\s]*\d+\.\s+/gm,
  blockquotes: /^>\s+/gm,
  horizontalRules: /^[\s]*[-*_]{3,}[\s]*$/gm,
  strikethrough: /~~([^~]+)~~/g,
  tables: /\|.*\|/g,
  htmlTags: /<[^>]+>/g
};

function checkForMarkdown(text) {
  const found = {};
  
  for (const [patternName, pattern] of Object.entries(markdownPatterns)) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      found[patternName] = {
        count: matches.length,
        examples: matches.slice(0, 3) // Show first 3 examples
      };
    }
  }
  
  return Object.keys(found).length > 0 ? found : null;
}

function analyzeLlmDescriptions() {
  try {
    console.log('📖 Reading document templates file...');
    const fileContent = fs.readFileSync(DOCUMENT_TEMPLATES_FILE, 'utf8');
    const documentTemplates = JSON.parse(fileContent);
    
    console.log(`📊 Found ${documentTemplates.length} document templates`);
    
    let totalDescriptions = 0;
    let descriptionsWithMarkdown = 0;
    const markdownResults = [];
    
    // Process each template
    documentTemplates.forEach((template, templateIndex) => {
      console.log(`\n🔧 Analyzing template ${templateIndex + 1}: ${template.title || template.id}`);
      
      // Check template-level llm_description
      if (template.metadata && template.metadata.llm_description) {
        totalDescriptions++;
        const markdownCheck = checkForMarkdown(template.metadata.llm_description);
        if (markdownCheck) {
          descriptionsWithMarkdown++;
          markdownResults.push({
            type: 'Template',
            id: template.id,
            title: template.title,
            markdown: markdownCheck
          });
        }
      }
      
      // Check introduction llm_description
      if (template.introduction && template.introduction.metadata && template.introduction.metadata.llm_description) {
        totalDescriptions++;
        const markdownCheck = checkForMarkdown(template.introduction.metadata.llm_description);
        if (markdownCheck) {
          descriptionsWithMarkdown++;
          markdownResults.push({
            type: 'Introduction',
            id: template.introduction.id,
            title: template.introduction.title,
            markdown: markdownCheck
          });
        }
      }
      
      // Check clauses
      if (template.clauses && Array.isArray(template.clauses)) {
        template.clauses.forEach((clause, clauseIndex) => {
          // Check clause-level llm_description
          if (clause.metadata && clause.metadata.llm_description) {
            totalDescriptions++;
            const markdownCheck = checkForMarkdown(clause.metadata.llm_description);
            if (markdownCheck) {
              descriptionsWithMarkdown++;
              markdownResults.push({
                type: 'Clause',
                id: clause.id,
                title: clause.title,
                markdown: markdownCheck
              });
            }
          }
          
          // Check paragraphs
          if (clause.paragraphs && Array.isArray(clause.paragraphs)) {
            clause.paragraphs.forEach((paragraph, paragraphIndex) => {
              if (paragraph.metadata && paragraph.metadata.llm_description) {
                totalDescriptions++;
                const markdownCheck = checkForMarkdown(paragraph.metadata.llm_description);
                if (markdownCheck) {
                  descriptionsWithMarkdown++;
                  markdownResults.push({
                    type: 'Paragraph',
                    id: paragraph.id,
                    title: paragraph.title,
                    markdown: markdownCheck
                  });
                }
              }
            });
          }
        });
      }
    });
    
    // Display results
    console.log('\n📊 MARKDOWN ANALYSIS RESULTS:');
    console.log('=' .repeat(50));
    console.log(`Total llm_description fields analyzed: ${totalDescriptions}`);
    console.log(`Fields with markdown components: ${descriptionsWithMarkdown}`);
    console.log(`Fields without markdown: ${totalDescriptions - descriptionsWithMarkdown}`);
    console.log(`Percentage with markdown: ${totalDescriptions > 0 ? ((descriptionsWithMarkdown / totalDescriptions) * 100).toFixed(2) : 0}%`);
    
    if (markdownResults.length > 0) {
      console.log('\n🔍 DETAILED MARKDOWN FINDINGS:');
      console.log('=' .repeat(50));
      
      markdownResults.forEach((result, index) => {
        console.log(`\n${index + 1}. ${result.type}: ${result.title || result.id}`);
        console.log(`   ID: ${result.id}`);
        
        Object.entries(result.markdown).forEach(([patternType, data]) => {
          console.log(`   📝 ${patternType.toUpperCase()}: ${data.count} occurrence(s)`);
          console.log(`      Examples: ${data.examples.join(', ')}`);
        });
      });
    } else {
      console.log('\n✅ NO MARKDOWN COMPONENTS FOUND');
      console.log('All llm_description fields contain only plain text formatting.');
    }
    
    // Summary of markdown types found
    const allMarkdownTypes = new Set();
    markdownResults.forEach(result => {
      Object.keys(result.markdown).forEach(type => allMarkdownTypes.add(type));
    });
    
    if (allMarkdownTypes.size > 0) {
      console.log('\n📋 MARKDOWN TYPES FOUND:');
      console.log('=' .repeat(30));
      Array.from(allMarkdownTypes).forEach(type => {
        console.log(`- ${type}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error analyzing llm_descriptions:', error.message);
    process.exit(1);
  }
}

// Run the analysis
analyzeLlmDescriptions();
