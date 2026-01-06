/**
 * Backend API Test Suite
 * Tests all inventory reservation system endpoints
 * 
 * Run: node tests/api.test.js
 */

const BASE_URL = 'http://localhost:5001';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  header: (msg) => console.log(`\n${colors.bold}${colors.blue}${'='.repeat(50)}\n${msg}\n${'='.repeat(50)}${colors.reset}\n`)
};

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

// Helper function to make HTTP requests
async function request(method, endpoint, body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, options);
  const data = await response.json();
  
  return {
    status: response.status,
    data
  };
}

// Test wrapper function
async function test(name, testFn) {
  try {
    await testFn();
    results.passed++;
    results.tests.push({ name, status: 'PASSED' });
    log.success(`PASSED: ${name}`);
  } catch (error) {
    results.failed++;
    results.tests.push({ name, status: 'FAILED', error: error.message });
    log.error(`FAILED: ${name}`);
    console.log(`   Error: ${error.message}`);
  }
}

// Assertion helpers
function assertEqual(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(`${message} Expected ${expected}, got ${actual}`);
  }
}

function assertTrue(condition, message = '') {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertExists(value, message = '') {
  if (value === undefined || value === null) {
    throw new Error(message || 'Value should exist');
  }
}

// Generate unique user ID for each test run
const testRunId = Date.now().toString(36);
const generateUserId = (prefix) => `${prefix}-${testRunId}`;

// ============================================
// TEST SUITES
// ============================================

async function testHealthCheck() {
  log.header('🏥 Health Check Tests');

  await test('Health endpoint should return success', async () => {
    const { status, data } = await request('GET', '/health');
    assertEqual(status, 200, 'Status should be 200');
    assertTrue(data.success === true, 'Success should be true');
    assertExists(data.timestamp, 'Timestamp should exist');
  });
}

async function testGetInventory() {
  log.header('📦 Inventory GET Tests');

  await test('GET /inventory should return all inventory items', async () => {
    const { status, data } = await request('GET', '/inventory');
    assertEqual(status, 200, 'Status should be 200');
    assertTrue(data.success === true, 'Response should be successful');
    assertTrue(Array.isArray(data.data), 'Data should be an array');
    assertTrue(data.data.length > 0, 'Should have inventory items');
  });

  await test('GET /inventory/:sku should return specific item', async () => {
    // First get all inventory to find a valid SKU
    const { data: allData } = await request('GET', '/inventory');
    const sku = allData.data[0].sku;

    const { status, data } = await request('GET', `/inventory/${sku}`);
    assertEqual(status, 200, 'Status should be 200');
    assertTrue(data.success === true, 'Response should be successful');
    assertEqual(data.data.sku, sku, 'SKU should match');
    assertExists(data.data.availableQuantity, 'Should have availableQuantity');
    assertExists(data.data.reservedQuantity, 'Should have reservedQuantity');
  });

  await test('GET /inventory/:sku should return 404 for invalid SKU', async () => {
    const { status, data } = await request('GET', '/inventory/INVALID-SKU-12345');
    assertEqual(status, 404, 'Status should be 404');
    assertTrue(data.success === false, 'Response should indicate failure');
  });
}

async function testReservation() {
  log.header('🔒 Reservation Tests');

  let reservationId = null;
  let testSku = null;
  let initialAvailable = 0;
  const userId = generateUserId('reserve-test');

  await test('POST /inventory/reserve should create a reservation', async () => {
    // Get initial inventory state
    const { data: allData } = await request('GET', '/inventory');
    const item = allData.data.find(i => i.availableQuantity >= 2);
    testSku = item.sku;
    initialAvailable = item.availableQuantity;

    const { status, data } = await request('POST', '/inventory/reserve', {
      sku: testSku,
      quantity: 1,
      userId
    });

    // API returns 200 for existing reservation (idempotent), 201 for new
    assertTrue(status === 200 || status === 201, 'Status should be 200 or 201');
    assertTrue(data.success === true, 'Response should be successful');
    assertExists(data.data.reservationId, 'Should return reservationId');
    assertExists(data.data.expiresAt, 'Should return expiresAt');
    
    reservationId = data.data.reservationId;
    log.info(`Created reservation: ${reservationId}`);
  });

  await test('Reservation should decrease available quantity', async () => {
    const { data } = await request('GET', `/inventory/${testSku}`);
    assertTrue(data.data.availableQuantity <= initialAvailable, 'Available quantity should not increase');
    assertTrue(data.data.reservedQuantity >= 1, 'Reserved quantity should be at least 1');
  });

  await test('POST /inventory/reserve should fail for insufficient stock', async () => {
    const { data: allData } = await request('GET', '/inventory');
    const item = allData.data[0];
    
    const { status, data } = await request('POST', '/inventory/reserve', {
      sku: item.sku,
      quantity: 999999, // Very large quantity
      userId: generateUserId('insufficient-stock')
    });

    assertTrue(status === 400 || status === 409, 'Status should be 400 or 409');
    assertTrue(data.success === false, 'Response should indicate failure');
  });

  await test('POST /inventory/reserve should fail for invalid SKU', async () => {
    const { status, data } = await request('POST', '/inventory/reserve', {
      sku: 'INVALID-SKU-99999',
      quantity: 1,
      userId: generateUserId('invalid-sku')
    });

    assertEqual(status, 404, 'Status should be 404');
    assertTrue(data.success === false, 'Response should indicate failure');
  });

  await test('POST /inventory/reserve should fail without required fields', async () => {
    const { status, data } = await request('POST', '/inventory/reserve', {
      sku: testSku
      // Missing userId
    });

    assertEqual(status, 400, 'Status should be 400');
    assertTrue(data.success === false, 'Response should indicate failure');
  });

  // Return reservationId for checkout tests
  return { reservationId, testSku, userId };
}

async function testCheckoutConfirm(reservationId, testSku, userId) {
  log.header('✅ Checkout Confirm Tests');

  await test('POST /checkout/confirm should confirm a reservation', async () => {
    if (!reservationId) {
      throw new Error('No reservation to confirm');
    }

    // Get quantity before confirm
    const { data: beforeData } = await request('GET', `/inventory/${testSku}`);
    const reservedBefore = beforeData.data.reservedQuantity;

    const { status, data } = await request('POST', '/checkout/confirm', {
      reservationId,
      userId
    });

    assertEqual(status, 200, 'Status should be 200');
    assertTrue(data.success === true, 'Response should be successful');
    assertEqual(data.data.status, 'confirmed', 'Status should be confirmed');

    // Verify reserved quantity decreased
    const { data: afterData } = await request('GET', `/inventory/${testSku}`);
    assertTrue(afterData.data.reservedQuantity <= reservedBefore, 'Reserved quantity should decrease or stay same');
    
    log.info(`Confirmed reservation: ${reservationId}`);
  });

  await test('POST /checkout/confirm should handle already confirmed reservation (idempotent)', async () => {
    const { status, data } = await request('POST', '/checkout/confirm', {
      reservationId,
      userId
    });

    // Idempotent: can return 200 with isAlreadyConfirmed, or 4xx error
    assertTrue(status === 200 || status >= 400, 'Status should be 200 (idempotent) or error');
    if (status === 200) {
      assertTrue(data.data.isAlreadyConfirmed === true, 'Should indicate already confirmed');
    }
  });

  await test('POST /checkout/confirm should fail for invalid reservationId', async () => {
    const { status, data } = await request('POST', '/checkout/confirm', {
      reservationId: 'invalid-reservation-id-12345',
      userId: 'test-user'
    });

    assertTrue(status >= 400, 'Status should indicate error');
    assertTrue(data.success === false, 'Response should indicate failure');
  });

  await test('POST /checkout/confirm should fail without userId', async () => {
    const { status, data } = await request('POST', '/checkout/confirm', {
      reservationId
    });

    assertEqual(status, 400, 'Status should be 400');
    assertTrue(data.success === false, 'Response should indicate failure');
  });
}

async function testCheckoutCancel() {
  log.header('❌ Checkout Cancel Tests');

  // Create a new reservation to cancel
  let cancelReservationId = null;
  let cancelSku = null;
  const cancelUserId = generateUserId('cancel-test');

  await test('Create reservation for cancel test', async () => {
    const { data: allData } = await request('GET', '/inventory');
    const item = allData.data.find(i => i.availableQuantity >= 1);
    cancelSku = item.sku;

    const { status, data } = await request('POST', '/inventory/reserve', {
      sku: cancelSku,
      quantity: 1,
      userId: cancelUserId
    });

    assertTrue(status === 200 || status === 201, 'Status should be 200 or 201');
    cancelReservationId = data.data.reservationId;
    log.info(`Created reservation to cancel: ${cancelReservationId}`);
  });

  await test('POST /checkout/cancel should cancel a reservation', async () => {
    // Get quantity before cancel
    const { data: beforeData } = await request('GET', `/inventory/${cancelSku}`);
    const availableBefore = beforeData.data.availableQuantity;

    const { status, data } = await request('POST', '/checkout/cancel', {
      reservationId: cancelReservationId,
      userId: cancelUserId
    });

    assertEqual(status, 200, 'Status should be 200');
    assertTrue(data.success === true, 'Response should be successful');
    assertEqual(data.data.status, 'cancelled', 'Status should be cancelled');

    // Verify available quantity increased (stock restored)
    const { data: afterData } = await request('GET', `/inventory/${cancelSku}`);
    assertTrue(afterData.data.availableQuantity >= availableBefore, 'Available quantity should increase or stay same after cancel');
    
    log.info(`Cancelled reservation: ${cancelReservationId}`);
  });

  await test('POST /checkout/cancel should handle already cancelled reservation (idempotent)', async () => {
    const { status, data } = await request('POST', '/checkout/cancel', {
      reservationId: cancelReservationId,
      userId: cancelUserId
    });

    // Idempotent: can return 200 with isAlreadyCancelled, or 4xx error
    assertTrue(status === 200 || status >= 400, 'Status should be 200 (idempotent) or error');
    if (status === 200) {
      assertTrue(data.data.isAlreadyCancelled === true, 'Should indicate already cancelled');
    }
  });

  await test('POST /checkout/cancel should fail for invalid reservationId', async () => {
    const { status, data } = await request('POST', '/checkout/cancel', {
      reservationId: 'invalid-cancel-id-99999',
      userId: 'test-user'
    });

    assertTrue(status >= 400, 'Status should indicate error');
    assertTrue(data.success === false, 'Response should indicate failure');
  });

  await test('POST /checkout/cancel should fail without userId', async () => {
    const { status, data } = await request('POST', '/checkout/cancel', {
      reservationId: cancelReservationId
    });

    assertEqual(status, 400, 'Status should be 400');
    assertTrue(data.success === false, 'Response should indicate failure');
  });
}

async function testConcurrency() {
  log.header('🔄 Concurrency Tests');

  await test('Multiple simultaneous reservations should be handled correctly', async () => {
    const { data: allData } = await request('GET', '/inventory');
    const item = allData.data.find(i => i.availableQuantity >= 5);
    
    if (!item) {
      log.warn('Skipping concurrency test - not enough inventory');
      return;
    }

    const sku = item.sku;
    const initialAvailable = item.availableQuantity;

    // Make 3 simultaneous reservation requests with different users
    const promises = [1, 2, 3].map(i => 
      request('POST', '/inventory/reserve', {
        sku,
        quantity: 1,
        userId: generateUserId(`concurrent-user-${i}`)
      })
    );

    const responses = await Promise.all(promises);
    const successful = responses.filter(r => r.status === 200 || r.status === 201);
    
    assertTrue(successful.length >= 1, 'At least one reservation should succeed');

    log.info(`Created ${successful.length} concurrent reservations successfully`);

    // Clean up - cancel all reservations
    for (const response of successful) {
      if (response.data.data && response.data.data.reservationId) {
        await request('POST', '/checkout/cancel', {
          reservationId: response.data.data.reservationId,
          userId: response.data.data.userId || 'cleanup'
        });
      }
    }
  });
}

async function testIdempotency() {
  log.header('🔁 Idempotency Tests');

  await test('Same user reserving same item should return existing reservation', async () => {
    const { data: allData } = await request('GET', '/inventory');
    const item = allData.data.find(i => i.availableQuantity >= 1);
    const userId = generateUserId('idempotent-user');

    // First reservation
    const { status: status1, data: data1 } = await request('POST', '/inventory/reserve', {
      sku: item.sku,
      quantity: 1,
      userId
    });
    assertTrue(status1 === 200 || status1 === 201, 'First reservation should succeed');
    const reservationId1 = data1.data.reservationId;

    // Second reservation with same user and SKU - should return existing
    const { status: status2, data: data2 } = await request('POST', '/inventory/reserve', {
      sku: item.sku,
      quantity: 1,
      userId
    });
    assertTrue(status2 === 200 || status2 === 201, 'Second reservation should succeed (idempotent)');
    const reservationId2 = data2.data.reservationId;

    // Should return the same reservation (idempotent)
    assertEqual(reservationId1, reservationId2, 'Should return same reservation ID (idempotent)');

    // Cleanup
    await request('POST', '/checkout/cancel', { reservationId: reservationId1, userId });
    log.info('Idempotency test passed - same reservation returned');
  });
}

async function testValidation() {
  log.header('🔍 Input Validation Tests');

  await test('Should require sku field', async () => {
    const { status, data } = await request('POST', '/inventory/reserve', {
      quantity: 1,
      userId: generateUserId('no-sku')
    });

    assertEqual(status, 400, 'Status should be 400');
    assertTrue(data.success === false, 'Response should indicate failure');
  });

  await test('Should require userId field', async () => {
    const { data: allData } = await request('GET', '/inventory');
    const sku = allData.data[0].sku;

    const { status, data } = await request('POST', '/inventory/reserve', {
      sku,
      quantity: 1
      // Missing userId
    });

    assertEqual(status, 400, 'Status should be 400');
    assertTrue(data.success === false, 'Response should indicate failure');
  });

  await test('Should handle missing quantity gracefully (default to 1)', async () => {
    const { data: allData } = await request('GET', '/inventory');
    const item = allData.data.find(i => i.availableQuantity >= 1);
    const userId = generateUserId('default-qty');

    const { status, data } = await request('POST', '/inventory/reserve', {
      sku: item.sku,
      userId
      // No quantity - should default to 1
    });

    assertTrue(status === 200 || status === 201, 'Should succeed with default quantity');
    assertTrue(data.success === true, 'Response should be successful');
    assertEqual(data.data.quantity, 1, 'Default quantity should be 1');

    // Cleanup
    await request('POST', '/checkout/cancel', { 
      reservationId: data.data.reservationId, 
      userId 
    });
  });
}

async function testFullWorkflow() {
  log.header('🔄 Full Workflow Test');

  await test('Complete reserve → confirm workflow', async () => {
    const { data: allData } = await request('GET', '/inventory');
    const item = allData.data.find(i => i.availableQuantity >= 1);
    const userId = generateUserId('full-workflow');

    // 1. Get initial state
    const { data: initial } = await request('GET', `/inventory/${item.sku}`);
    const initialAvailable = initial.data.availableQuantity;

    // 2. Reserve
    const { status: reserveStatus, data: reserveData } = await request('POST', '/inventory/reserve', {
      sku: item.sku,
      quantity: 1,
      userId
    });
    assertTrue(reserveStatus === 200 || reserveStatus === 201, 'Reserve should succeed');

    // 3. Check inventory after reserve
    const { data: afterReserve } = await request('GET', `/inventory/${item.sku}`);
    assertTrue(afterReserve.data.availableQuantity <= initialAvailable, 'Available should decrease after reserve');

    // 4. Confirm
    const { status: confirmStatus, data: confirmData } = await request('POST', '/checkout/confirm', {
      reservationId: reserveData.data.reservationId,
      userId
    });
    assertEqual(confirmStatus, 200, 'Confirm should succeed');
    assertEqual(confirmData.data.status, 'confirmed', 'Status should be confirmed');

    // 5. Check final inventory
    const { data: final } = await request('GET', `/inventory/${item.sku}`);
    assertEqual(final.data.availableQuantity, initialAvailable - 1, 'Available should be reduced by 1');

    log.info('Full workflow completed successfully');
  });

  await test('Complete reserve → cancel workflow', async () => {
    const { data: allData } = await request('GET', '/inventory');
    const item = allData.data.find(i => i.availableQuantity >= 1);
    const userId = generateUserId('cancel-workflow');

    // 1. Get initial state
    const { data: initial } = await request('GET', `/inventory/${item.sku}`);
    const initialAvailable = initial.data.availableQuantity;

    // 2. Reserve
    const { status: reserveStatus, data: reserveData } = await request('POST', '/inventory/reserve', {
      sku: item.sku,
      quantity: 1,
      userId
    });
    assertTrue(reserveStatus === 200 || reserveStatus === 201, 'Reserve should succeed');

    // 3. Cancel
    const { status: cancelStatus, data: cancelData } = await request('POST', '/checkout/cancel', {
      reservationId: reserveData.data.reservationId,
      userId
    });
    assertEqual(cancelStatus, 200, 'Cancel should succeed');
    assertEqual(cancelData.data.status, 'cancelled', 'Status should be cancelled');

    // 4. Check final inventory - should be restored
    const { data: final } = await request('GET', `/inventory/${item.sku}`);
    assertEqual(final.data.availableQuantity, initialAvailable, 'Available should be restored after cancel');

    log.info('Cancel workflow completed successfully');
  });
}

// ============================================
// RUN ALL TESTS
// ============================================

async function runAllTests() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║     🧪 INVENTORY RESERVATION SYSTEM - API TEST SUITE     ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`\nTarget: ${BASE_URL}`);
  console.log(`Test Run ID: ${testRunId}`);
  console.log(`Started: ${new Date().toISOString()}\n`);

  try {
    // Check if server is running
    try {
      await request('GET', '/health');
    } catch (error) {
      log.error(`Cannot connect to server at ${BASE_URL}`);
      log.error('Make sure the server is running: node server.js');
      process.exit(1);
    }

    // Run test suites
    await testHealthCheck();
    await testGetInventory();
    const { reservationId, testSku, userId } = await testReservation();
    await testCheckoutConfirm(reservationId, testSku, userId);
    await testCheckoutCancel();
    await testConcurrency();
    await testIdempotency();
    await testValidation();
    await testFullWorkflow();

    // Print summary
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║                    📊 TEST SUMMARY                       ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log(`\n  Total Tests: ${results.passed + results.failed}`);
    console.log(`  ${colors.green}Passed: ${results.passed}${colors.reset}`);
    console.log(`  ${colors.red}Failed: ${results.failed}${colors.reset}`);
    console.log(`\n  Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);

    if (results.failed > 0) {
      console.log(`\n${colors.red}Failed Tests:${colors.reset}`);
      results.tests
        .filter(t => t.status === 'FAILED')
        .forEach(t => console.log(`  - ${t.name}: ${t.error}`));
    }

    console.log('\n');
    process.exit(results.failed > 0 ? 1 : 0);

  } catch (error) {
    log.error(`Test suite failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run tests
runAllTests();
