import mongoose from 'mongoose';

/**
 * Database lifecycle for integration suites.
 *
 * A real mongod (not a mock) so index behaviour, aggregation semantics and
 * unique-constraint violations are exercised exactly as in production — the
 * tenancy guarantees these tests exist to prove are enforced by queries and
 * indexes, and a mocked driver would assert nothing about either.
 *
 * The instance is started ONCE for the whole run by tests/globalSetup.js.
 * Suites connect to it here rather than launching their own, because 19 suites
 * across parallel workers each starting a mongod raced each other into startup
 * timeouts.
 *
 * Isolation comes from the database NAME: each Jest worker gets its own, so two
 * suites running concurrently cannot see each other's documents even though
 * they share a server.
 */

/** Unique per worker; falls back to a single name when run serially. */
const databaseName = () =>
  `watchtower_test_w${process.env.JEST_WORKER_ID ?? '1'}`;

export async function connectTestDb() {
  const uri = process.env.MONGO_TEST_URI;
  if (!uri) {
    throw new Error(
      'MONGO_TEST_URI is not set — tests/globalSetup.js should have started the shared MongoDB instance.'
    );
  }

  // Suites call connectTestDb in beforeAll; within one worker the same
  // connection is reused across suites, so reconnecting would be wasteful and
  // would race with the previous suite's teardown.
  if (mongoose.connection.readyState === 1) return mongoose.connection;

  await mongoose.connect(uri, { dbName: databaseName() });
  return mongoose.connection;
}

export async function disconnectTestDb() {
  // Drop this worker's database so a re-run starts clean, but leave the server
  // running — other workers are still using it.
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
}

/** Wipe every collection between tests so cases cannot leak state into each other. */
export async function clearTestDb() {
  const { collections } = mongoose.connection;
  await Promise.all(
    Object.values(collections).map((collection) => collection.deleteMany({}))
  );
}

/**
 * Build the indexes the application declares.
 *
 * Required because several guarantees under test are enforced by indexes (the
 * partial unique index on ongoing incidents, for one) and Mongoose builds those
 * lazily in the background.
 */
export async function syncIndexes(...models) {
  await Promise.all(models.map((model) => model.createIndexes()));
}
