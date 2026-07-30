/**
 * Stop the shared MongoDB instance started in globalSetup.
 *
 * Without this the mongod process outlives the run and Jest reports that it
 * could not exit cleanly — or worse, leaves an orphan holding a port on a CI
 * runner that reuses the machine.
 */
export default async function globalTeardown() {
  await globalThis.__MONGOD__?.stop();
}
