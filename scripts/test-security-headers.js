/**
 * Security Headers Testing Script
 * 
 * This script helps test security headers by making HTTP requests
 * and checking for the presence of security headers.
 * 
 * Usage:
 *   node scripts/test-security-headers.js [url]
 * 
 * Example:
 *   node scripts/test-security-headers.js http://localhost:3000
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

// Expected security headers
const EXPECTED_HEADERS = [
  'X-Frame-Options',
  'X-Content-Type-Options',
  'X-XSS-Protection',
  'Referrer-Policy',
  'Permissions-Policy',
  'Content-Security-Policy',
];

// Optional headers (only in production)
const OPTIONAL_HEADERS = [
  'Strict-Transport-Security',
  'Expect-CT',
];

// CORS headers (for API routes)
const CORS_HEADERS = [
  'Access-Control-Allow-Credentials',
  'Access-Control-Allow-Origin',
  'Access-Control-Allow-Methods',
  'Access-Control-Allow-Headers',
];

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname,
      method: 'GET',
      headers: {
        'User-Agent': 'Security-Headers-Test-Script/1.0',
      },
    };

    const req = client.request(options, (res) => {
      const headers = res.headers;
      resolve({
        statusCode: res.statusCode,
        headers,
        url,
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

function checkHeaders(result) {
  const { headers, url } = result;
  const isProduction = process.env.NODE_ENV === 'production';
  
  console.log(`\n🔍 Testing: ${url}\n`);
  console.log('─'.repeat(60));
  
  // Check expected headers
  console.log('\n✅ Expected Security Headers:');
  let allPresent = true;
  
  EXPECTED_HEADERS.forEach(headerName => {
    const value = headers[headerName.toLowerCase()];
    if (value) {
      console.log(`  ✅ ${headerName}: ${value.substring(0, 80)}${value.length > 80 ? '...' : ''}`);
    } else {
      console.log(`  ❌ ${headerName}: MISSING`);
      allPresent = false;
    }
  });
  
  // Check optional headers (production only)
  if (isProduction) {
    console.log('\n🔒 Production-Only Headers:');
    OPTIONAL_HEADERS.forEach(headerName => {
      const value = headers[headerName.toLowerCase()];
      if (value) {
        console.log(`  ✅ ${headerName}: ${value.substring(0, 80)}${value.length > 80 ? '...' : ''}`);
      } else {
        console.log(`  ⚠️  ${headerName}: Not set (expected in production)`);
      }
    });
  }
  
  // Check CORS headers (for API routes)
  if (url.includes('/api/')) {
    console.log('\n🌐 CORS Headers (API routes):');
    CORS_HEADERS.forEach(headerName => {
      const value = headers[headerName.toLowerCase()];
      if (value) {
        console.log(`  ✅ ${headerName}: ${value}`);
      } else {
        console.log(`  ⚠️  ${headerName}: Not set`);
      }
    });
  }
  
  // Summary
  console.log('\n' + '─'.repeat(60));
  if (allPresent) {
    console.log('✅ All expected security headers are present!');
  } else {
    console.log('❌ Some security headers are missing!');
  }
  
  return allPresent;
}

async function testSecurityHeaders(url) {
  try {
    console.log('🚀 Security Headers Test Script');
    console.log('═'.repeat(60));
    
    // Test main page
    const mainResult = await makeRequest(url);
    const mainPass = checkHeaders(mainResult);
    
    // Test API route (if URL doesn't already include /api/)
    if (!url.includes('/api/')) {
      const apiUrl = url.endsWith('/') ? `${url}api/assistant` : `${url}/api/assistant`;
      try {
        const apiResult = await makeRequest(apiUrl);
        console.log('\n\n');
        checkHeaders(apiResult);
      } catch (error) {
        console.log(`\n⚠️  Could not test API route: ${error.message}`);
      }
    }
    
    // Final summary
    console.log('\n' + '═'.repeat(60));
    if (mainPass) {
      console.log('✅ Security headers test PASSED');
      process.exit(0);
    } else {
      console.log('❌ Security headers test FAILED');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error testing security headers:', error.message);
    console.error('\nMake sure:');
    console.error('  1. Your development server is running');
    console.error('  2. The URL is correct');
    console.error('  3. The server is accessible');
    process.exit(1);
  }
}

// Get URL from command line or use default
const url = process.argv[2] || 'http://localhost:3000';

// Run tests
testSecurityHeaders(url);

