import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

/**
 * In-memory MongoDB lifecycle shared by every integration suite.
 *
 * A real mongod (not a mock) so index behaviour, aggregation semantics and
 * unique-constraint violations are exercised exactly as they are in production
 * — the tenancy guarantees these tests exist to prove are enforced by queries
 * and indexes, and a mocked driver would assert nothing about either.
 */

let mongod;

export async function connectTestDb() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri('watchtower_test'));
  return mongoose.connection;
}

export async function disconnectTestDb() {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await mongod?.stop();
}

/** Wipe every collection between tests so suites cannot leak state into each other. */
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
