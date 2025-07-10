import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import pool from '../db.js';

const __dirname = path.resolve(path.dirname(''));

const CSV_PATH = path.join(__dirname, 'sample_rideshare.csv');
const BATCH_SIZE = 10;

// Helper to find or create a user, returning their ID
async function findOrCreateUser(client, name, email) {
  if (!name || !email) return null;

  const sunet_id = email.split('@')[0];

  let userResult = await client.query('SELECT id FROM users WHERE sunet_id = $1', [sunet_id]);
  if (userResult.rows.length > 0) {
    return userResult.rows[0].id;
  }

  const [firstName, ...lastNameParts] = name.split(' ');
  const lastName = lastNameParts.join(' ');

  userResult = await client.query(
    `INSERT INTO users (sunet_id, email, display_name, first_name, last_name)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (sunet_id) DO UPDATE SET email = EXCLUDED.email
     RETURNING id`,
    [sunet_id, email, name, firstName, lastName]
  );
  
  return userResult.rows[0].id;
}

// Helper to get tag IDs from names
async function getTagIds(client, destination) {
  const tagIds = [];
  if (!destination) return tagIds;

  const tagName = destination.toUpperCase().trim();
  const tagResult = await client.query('SELECT id FROM carpool_tags WHERE name = $1', [tagName]);
  if (tagResult.rows.length > 0) {
    tagIds.push(tagResult.rows[0].id);
  }
  return tagIds;
}

// Main processing function
async function processRides() {
  const client = await pool.connect();
  const records = [];
  let successCount = 0;
  let errorCount = 0;

  const parser = fs.createReadStream(CSV_PATH)
    .pipe(parse({
      delimiter: ',',
      columns: true,
      trim: true,
    }));

  console.log('Starting import from sample_rideshare.csv...');

  try {
    await client.query('BEGIN');

    for await (const record of parser) {
      records.push(record);

      if (records.length >= BATCH_SIZE) {
        const { success, errors } = await processBatch(client, records.splice(0, BATCH_SIZE));
        successCount += success;
        errorCount += errors;
      }
    }

    // Process any remaining records
    if (records.length > 0) {
      const { success, errors } = await processBatch(client, records);
      successCount += success;
      errorCount += errors;
    }

    await client.query('COMMIT');
    console.log(`\nImport complete!`);
    console.log(`✅ Successfully imported ${successCount} rides.`);
    console.log(`❌ Skipped ${errorCount} invalid records.`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\nFATAL ERROR during import. Transaction rolled back.', error);
  } finally {
    client.release();
    pool.end();
  }
}

async function processBatch(client, batch) {
  let success = 0;
  let errors = 0;

  for (const record of batch) {
    const { Name, Date: dateStr, Time: timeStr, Destination, Email, "Phone Number": phone, Notes } = record;

    if (!Name || !dateStr || !timeStr || !Destination || !Email) {
      process.stdout.write('S'); // S for skipped
      errors++;
      continue;
    }

    try {
      const userId = await findOrCreateUser(client, Name, Email);
      if (!userId) {
        process.stdout.write('S');
        errors++;
        continue;
      }

      const tagIds = await getTagIds(client, Destination);
      const title = `Ride to ${Destination}`;
      const contact = phone || Email;

      // Handle the messy date format
      const departureDate = new Date(`2024-${dateStr.split(' ')[1]}`);
      const isoDate = departureDate.toISOString().split('T')[0];

      await client.query(
        `INSERT INTO carpools (title, description, contact, departure_date, departure_time, created_by, tags)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [title, Notes, contact, isoDate, timeStr, userId, tagIds]
      );
      
      process.stdout.write('.'); // Dot for success
      success++;

    } catch (e) {
      process.stdout.write('E'); // E for error
      errors++;
      console.error(`\nError on record: ${JSON.stringify(record)}\n`, e.message);
    }
  }

  return { success, errors };
}

processRides(); 