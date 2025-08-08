import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load the development environment variables.
// The `override` option is crucial. It ensures that these variables will replace
// any that might have been loaded by other modules (like db.js loading the wrong .env file).
dotenv.config({
  path: path.resolve(__dirname, '../.env.development'),
  override: true,
});

// NOTE: We are NOT importing `pool` here anymore. We will import it dynamically inside main().

// Test users for development
const TEST_USERS = [
  {
    sunet_id: 'test_user_1',
    email: 'test1@stanford.edu',
    display_name: 'Test User One',
    first_name: 'Test',
    last_name: 'User One',
  },
  {
    sunet_id: 'test_user_2',
    email: 'test2@stanford.edu',
    display_name: 'Test User Two',
    first_name: 'Test',
    last_name: 'User Two',
  },
  {
    sunet_id: 'test_user_3',
    email: 'test3@stanford.edu',
    display_name: 'Test User Three',
    first_name: 'Test',
    last_name: 'User Three',
  },
];

// Sample carpool data
const SAMPLE_CARPOOL = {
  title: 'Test Carpool to San Francisco',
  description: 'This is a test carpool for development testing',
  carpool_type: 'other',
  event_name: 'Test Event',
  pickup_details: 'Stanford Main Campus',
  dropoff_details: 'San Francisco Downtown',
  departure_date: '2024-12-25',
  departure_time: '09:00:00',
  capacity: 4,
  current_passengers: 1,
};

async function createTestUsers(pool) {
  console.log('Creating test users...');

  for (const user of TEST_USERS) {
    try {
      const result = await pool.query(
        `INSERT INTO users (sunet_id, email, first_name, last_name, display_name, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         ON CONFLICT (sunet_id) DO UPDATE SET
           email = EXCLUDED.email,
           display_name = EXCLUDED.display_name,
           first_name = EXCLUDED.first_name,
           last_name = EXCLUDED.last_name,
           updated_at = NOW()
         RETURNING *`,
        [user.sunet_id, user.email, user.first_name, user.last_name, user.display_name]
      );

      console.log(`✅ Created/updated user: ${user.display_name} (ID: ${result.rows[0].id})`);
    } catch (error) {
      console.error(`❌ Error creating user ${user.display_name}:`, error.message);
    }
  }
}

async function createSampleCarpool(pool, userId) {
  console.log(`Creating sample carpool for user ${userId}...`);

  try {
    const result = await pool.query(
      `INSERT INTO carpools (
        title, description, carpool_type, event_name, pickup_details, dropoff_details,
        departure_date, departure_time, capacity, current_passengers, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING *`,
      [
        SAMPLE_CARPOOL.title,
        SAMPLE_CARPOOL.description,
        SAMPLE_CARPOOL.carpool_type,
        SAMPLE_CARPOOL.event_name,
        SAMPLE_CARPOOL.pickup_details,
        SAMPLE_CARPOOL.dropoff_details,
        SAMPLE_CARPOOL.departure_date,
        SAMPLE_CARPOOL.departure_time,
        SAMPLE_CARPOOL.capacity,
        SAMPLE_CARPOOL.current_passengers,
        userId,
      ]
    );

    console.log(`✅ Created carpool: ${SAMPLE_CARPOOL.title} (ID: ${result.rows[0].id})`);
    return result.rows[0];
  } catch (error) {
    console.error(`❌ Error creating carpool:`, error.message);
    return null;
  }
}

async function createJoinRequest(pool, carpoolId, userId) {
  console.log(`Creating join request from user ${userId} for carpool ${carpoolId}...`);

  try {
    const result = await pool.query(
      `INSERT INTO join_requests (carpool_id, user_id, message, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       ON CONFLICT (carpool_id, user_id) DO UPDATE SET
         message = EXCLUDED.message,
         updated_at = NOW()
       RETURNING *`,
      [carpoolId, userId, 'I would like to join this carpool!', 'pending']
    );

    console.log(`✅ Created join request (ID: ${result.rows[0].id})`);
    return result.rows[0];
  } catch (error) {
    console.error(`❌ Error creating join request:`, error.message);
    return null;
  }
}

async function approveJoinRequest(pool, requestId, carpoolId) {
  console.log(`Approving join request ${requestId}...`);

  try {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Update the request status
      await client.query('UPDATE join_requests SET status = $1, updated_at = NOW() WHERE id = $2', [
        'approved',
        requestId,
      ]);

      // Increment passenger count
      await client.query('UPDATE carpools SET current_passengers = current_passengers + 1 WHERE id = $1', [carpoolId]);

      await client.query('COMMIT');
      console.log(`✅ Approved join request ${requestId}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(`❌ Error approving join request:`, error.message);
  }
}

async function showTestData(pool) {
  console.log('\n📊 Current Test Data:');

  // Show users
  const users = await pool.query("SELECT id, sunet_id, display_name, email FROM users WHERE sunet_id LIKE 'test_user_%' ORDER BY id");
  console.log('\n👥 Test Users:');
  users.rows.forEach((user) => {
    console.log(`  ID: ${user.id}, Name: ${user.display_name}, Email: ${user.email}`);
  });

  // Show carpools
  const carpools = await pool.query(`
    SELECT c.id, c.title, c.capacity, c.current_passengers, u.display_name as creator
    FROM carpools c
    JOIN users u ON c.created_by = u.id
    WHERE u.sunet_id LIKE 'test_user_%'
    ORDER BY c.id
  `);
  console.log('\n🚗 Test Carpools:');
  carpools.rows.forEach((carpool) => {
    console.log(
      `  ID: ${carpool.id}, Title: ${carpool.title}, Creator: ${carpool.creator}, Passengers: ${carpool.current_passengers}/${carpool.capacity}`
    );
  });

  // Show join requests
  const requests = await pool.query(`
    SELECT jr.id, jr.status, jr.message, c.title as carpool_title, u.display_name as requester
    FROM join_requests jr
    JOIN carpools c ON jr.carpool_id = c.id
    JOIN users u ON jr.user_id = u.id
    WHERE u.sunet_id LIKE 'test_user_%'
    ORDER BY jr.id
  `);
  console.log('\n🤝 Join Requests:');
  requests.rows.forEach((request) => {
    console.log(
      `  ID: ${request.id}, Status: ${request.status}, Requester: ${request.requester}, Carpool: ${request.carpool_title}`
    );
  });
}

async function cleanupTestData(pool) {
  console.log('Cleaning up test data...');

  try {
    // Delete join requests first (due to foreign key constraints)
    await pool.query(`
      DELETE FROM join_requests
      WHERE user_id IN (SELECT id FROM users WHERE sunet_id LIKE 'test_user_%')
    `);

    // Delete carpools
    await pool.query(`
      DELETE FROM carpools
      WHERE created_by IN (SELECT id FROM users WHERE sunet_id LIKE 'test_user_%')
    `);

    // Delete test users
    await pool.query("DELETE FROM users WHERE sunet_id LIKE 'test_user_%'");

    console.log('✅ Test data cleaned up');
  } catch (error)
 {
    console.error('❌ Error cleaning up test data:', error.message);
  }
}

async function main() {
  // Dynamically import the database pool *after* we have loaded the correct environment variables.
  // This is the key to solving the problem.
  const { default: pool } = await import('../db.js');
  const command = process.argv[2];

  try {
    switch (command) {
      case 'setup':
        console.log('🚀 Setting up test data for join functionality...\n');
        await createTestUsers(pool);

        // Get the first test user to create a carpool
        const user1 = await pool.query("SELECT id FROM users WHERE sunet_id = 'test_user_1'");
        if (user1.rows.length > 0) {
          const carpool = await createSampleCarpool(pool, user1.rows[0].id);
          if (carpool) {
            // Get the second test user to create a join request
            const user2 = await pool.query("SELECT id FROM users WHERE sunet_id = 'test_user_2'");
            if (user2.rows.length > 0) {
              await createJoinRequest(pool, carpool.id, user2.rows[0].id);
            }
          }
        }
        break;

      case 'show':
        await showTestData(pool);
        break;

      case 'cleanup':
        await cleanupTestData(pool);
        break;

      case 'approve':
        const requestId = process.argv[3];
        const carpoolId = process.argv[4];
        if (!requestId || !carpoolId) {
          console.log('Usage: node test_join_functionality.js approve <requestId> <carpoolId>');
          process.exit(1);
        }
        await approveJoinRequest(pool, requestId, carpoolId);
        break;

      default:
        console.log(`
🎯 Test Join Functionality Script

Usage:
  node test_join_functionality.js <command>

Commands:
  setup     - Create test users, sample carpool, and join request
  show      - Display current test data
  cleanup   - Remove all test data
  approve   - Approve a join request (requires requestId and carpoolId)

Examples:
  node test_join_functionality.js setup
  node test_join_functionality.js show
  node test_join_functionality.js approve 1 1
  node test_join_functionality.js cleanup

This script helps you test the join functionality without needing multiple Stanford accounts.
        `);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

main(); 