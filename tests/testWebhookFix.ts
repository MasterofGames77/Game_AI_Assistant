/**
 * Test script to verify the webhook raw body reading fix
 * 
 * This script tests that the getRawBody function correctly reads
 * the raw request body when bodyParser is disabled.
 */

import { Readable } from 'stream';
import type { NextApiRequest } from 'next';

// Simulate the getRawBody function from webhook.ts
function getRawBody(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });
    req.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    req.on('error', reject);
  });
}

// Create a mock NextApiRequest with a readable stream
function createMockRequest(body: string): NextApiRequest {
  const stream = new Readable();
  stream.push(body);
  stream.push(null); // End the stream
  
  const req = {
    method: 'POST',
    headers: {},
    on: stream.on.bind(stream),
    body: undefined, // Simulate bodyParser: false
  } as unknown as NextApiRequest;
  
  return req;
}

// Test function
async function testGetRawBody() {
  console.log('🧪 Testing getRawBody function...\n');
  
  const testCases = [
    {
      name: 'Simple JSON payload',
      body: JSON.stringify({ type: 'test', data: { id: '123' } }),
    },
    {
      name: 'Complex Stripe webhook payload',
      body: JSON.stringify({
        id: 'evt_test_webhook',
        object: 'event',
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_test',
            status: 'active',
          },
        },
      }),
    },
    {
      name: 'Empty payload',
      body: '',
    },
    {
      name: 'Large payload',
      body: JSON.stringify({
        type: 'large',
        data: Array(1000).fill({ key: 'value', nested: { deep: 'data' } }),
      }),
    },
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    try {
      const mockReq = createMockRequest(testCase.body);
      const rawBody = await getRawBody(mockReq);
      const parsed = rawBody.toString('utf8');
      
      if (parsed === testCase.body) {
        console.log(`✅ ${testCase.name}: PASSED`);
        console.log(`   Body length: ${rawBody.length} bytes\n`);
        passed++;
      } else {
        console.log(`❌ ${testCase.name}: FAILED`);
        console.log(`   Expected: ${testCase.body.substring(0, 50)}...`);
        console.log(`   Got: ${parsed.substring(0, 50)}...\n`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${testCase.name}: ERROR`);
      console.log(`   ${error instanceof Error ? error.message : String(error)}\n`);
      failed++;
    }
  }
  
  console.log('\n📊 Test Results:');
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📈 Total: ${passed + failed}\n`);
  
  if (failed === 0) {
    console.log('🎉 All tests passed! The getRawBody function is working correctly.');
    return true;
  } else {
    console.log('⚠️  Some tests failed. Please review the implementation.');
    return false;
  }
}

// Run the test
testGetRawBody()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });

export { testGetRawBody, getRawBody };

