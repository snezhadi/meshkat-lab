#!/usr/bin/env node

/**
 * Simple API endpoint test script
 * Tests basic functionality of migrated Supabase endpoints
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

async function testEndpoint(name, url, method = 'GET', body = null) {
  try {
    console.log(`\n🧪 Testing: ${name}`);
    console.log(`   ${method} ${url}`);
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (response.ok) {
      console.log(`   ✅ Status: ${response.status}`);
      if (data.success !== undefined) {
        console.log(`   ✅ Success: ${data.success}`);
      }
      if (data.data) {
        console.log(`   ✅ Data count: ${Array.isArray(data.data) ? data.data.length : 'N/A'}`);
      }
      return { success: true, data };
    } else {
      console.log(`   ❌ Status: ${response.status}`);
      console.log(`   ❌ Error: ${data.error || 'Unknown error'}`);
      return { success: false, error: data.error };
    }
  } catch (error) {
    console.log(`   ❌ Request failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Starting API Endpoint Tests');
  console.log(`📍 Base URL: ${BASE_URL}\n`);
  console.log('=' .repeat(60));
  
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };
  
  // Test 1: Document Templates GET
  const templatesTest = await testEndpoint(
    'Get Document Templates',
    `${BASE_URL}/api/admin/document-templates`,
    'GET'
  );
  results.tests.push({ name: 'GET /api/admin/document-templates', ...templatesTest });
  if (templatesTest.success) results.passed++; else results.failed++;
  
  // Test 2: Global Configuration GET
  const globalConfigTest = await testEndpoint(
    'Get Global Configuration',
    `${BASE_URL}/api/admin/global-configuration`,
    'GET'
  );
  results.tests.push({ name: 'GET /api/admin/global-configuration', ...globalConfigTest });
  if (globalConfigTest.success) results.passed++; else results.failed++;
  
  // Test 3: Parameters GET (with templateId)
  // First get a template ID from the templates test
  let templateId = null;
  if (templatesTest.success && templatesTest.data?.data?.[0]?.id) {
    templateId = templatesTest.data.data[0].id;
  }
  
  if (templateId) {
    const parametersTest = await testEndpoint(
      'Get Parameters for Template',
      `${BASE_URL}/api/admin/parameters?templateId=${templateId}`,
      'GET'
    );
    results.tests.push({ name: `GET /api/admin/parameters?templateId=${templateId}`, ...parametersTest });
    if (parametersTest.success) results.passed++; else results.failed++;
  } else {
    console.log('\n⚠️  Skipping parameters test - no template ID available');
    results.tests.push({ name: 'GET /api/admin/parameters', success: false, error: 'No template ID' });
    results.failed++;
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Test Summary:');
  console.log(`   ✅ Passed: ${results.passed}`);
  console.log(`   ❌ Failed: ${results.failed}`);
  console.log(`   📈 Total: ${results.tests.length}`);
  
  if (results.failed === 0) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Check the output above for details.');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('\n💥 Test suite crashed:', error);
  process.exit(1);
});

