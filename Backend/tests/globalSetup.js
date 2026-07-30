import { MongoMemoryServer } from 'mongodb-memory-server';

/**
 * Start ONE MongoDB instance for the entire test run.
 *
 * Previously every suite created its own MongoMemoryServer. With 19 suites and
 * Jest running them across parallel workers, that meant many `mongod` processes
 * racing to start at once — each with a 10s startup budget. On a loaded machine
 * or a small CI runner they starve each other and fail with "Instance failed to
 * start within 10000ms". The tests were not wrong; the harness was.
 *
 * One shared instance removes the race entirely, and is substantially faster:
 * a mongod launch costs about a second, so 19 of them dominated the run.
 *
 * Isolation is preserved by giving each Jest worker its own DATABASE on the
 * shared instance (see helpers/db.js), so parallel suites still cannot see one
 * another's documents.
 */
export default async function globalSetup() {
  const mongod = await MongoMemoryServer.create({
    instance: {
      // CI runners are slower and colder than a developer laptop; the default
      // 10s is not a generous budget when the binary is being started for the
      // first time.
      launchTimeout: 60_000,
    },
  });

  // Jest propagates process.env from globalSetup into workers, which is how the
  // URI reaches the suites. The instance itself is kept on globalThis so
  // globalTeardown can stop it — it cannot travel through an env var.
  process.env.MONGO_TEST_URI = mongod.getUri();
  globalThis.__MONGOD__ = mongod;
}
