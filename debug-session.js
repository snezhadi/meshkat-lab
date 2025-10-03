#!/usr/bin/env node

// Simple script to test session handling
// Run this on your VPS to debug session issues

const https = require('https');
const http = require('http');

const VPS_URL = process.env.VPS_URL || 'http://your-vps-ip:3000';
const USERNAME = 'admin';
const PASSWORD = 'admin123';

async function testSession() {
  console.log('🔍 Testing session handling on VPS...');
  console.log('VPS URL:', VPS_URL);
  
  try {
    // Test login
    console.log('\n1. Testing login...');
    const loginResponse = await fetch(`${VPS_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: USERNAME,
        password: PASSWORD,
      }),
    });
    
    console.log('Login status:', loginResponse.status);
    const loginData = await loginResponse.json();
    console.log('Login response:', loginData);
    
    if (loginResponse.status === 200) {
      console.log('✅ Login successful');
      
      // Get cookies from login response
      const cookies = loginResponse.headers.get('set-cookie');
      console.log('Cookies received:', cookies);
      
      // Test session with cookies
      console.log('\n2. Testing session...');
      const sessionResponse = await fetch(`${VPS_URL}/api/auth/session`, {
        headers: {
          'Cookie': cookies || '',
        },
      });
      
      console.log('Session status:', sessionResponse.status);
      const sessionData = await sessionResponse.json();
      console.log('Session response:', sessionData);
      
      if (sessionData.authenticated) {
        console.log('✅ Session valid');
      } else {
        console.log('❌ Session invalid');
      }
    } else {
      console.log('❌ Login failed');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Check if fetch is available (Node 18+)
if (typeof fetch === 'undefined') {
  console.log('Installing node-fetch...');
  const { default: fetch } = require('node-fetch');
  global.fetch = fetch;
}

testSession();
