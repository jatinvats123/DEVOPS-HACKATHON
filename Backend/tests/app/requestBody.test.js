import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from '@jest/globals';
import request from 'supertest';
import app from '../../src/app.js';
import { connectTestDb, disconnectTestDb, clearTestDb } from '../helpers/db.js';
import { createUser } from '../helpers/factories.js';
import { resetRateLimits } from '../../src/app.middleware.js';

/**
 * Request body handling for body-less POSTs.
 *
 * "Test Dispatch" reported `Unexpected token 'n', "null" is not valid JSON`
 * whenever it was used. The cause was on the client — apiRequest coerced an
 * absent body to `null`, which axios serialises to the four-byte body `null`
 * while still sending Content-Type: application/json. `express.json()` runs in
 * strict mode and accepts only objects and arrays, so the request was rejected
 * by the parser before reaching any route, and the parser's internal message
 * was shown to the user.
 *
 * These cases pin the server side of that contract: a POST with no body must
 * work, and a genuinely malformed body must produce an explanation rather than
 * parser vocabulary.
 */
describe('Request body handling', () => {
  let owner;
  let channelId;

  beforeAll(connectTestDb);
  afterAll(disconnectTestDb);

  beforeEach(async () => {
    await clearTestDb();
    resetRateLimits();
    owner = await createUser({ email: 'dispatch@example.test' });

    const created = await request(app)
      .post('/api/channels')
      .set('Cookie', owner.cookie)
      .send({ type: 'Email', target: 'alerts@example.test' })
      .expect(201);

    channelId = created.body.data._id;
  });

  it('accepts a POST with no body but a JSON content type', async () => {
    // Exactly what the browser sends for Test Dispatch once apiRequest passes
    // `undefined` instead of `null`: the JSON header from the axios instance
    // defaults, and no body at all.
    const res = await request(app)
      .post(`/api/channels/${channelId}/test`)
      .set('Cookie', owner.cookie)
      .set('Content-Type', 'application/json');

    expect(res.status).not.toBe(400);
    expect(JSON.stringify(res.body)).not.toMatch(/Unexpected token/);
  });

  it('accepts a POST with no content type at all', async () => {
    const res = await request(app)
      .post(`/api/channels/${channelId}/test`)
      .set('Cookie', owner.cookie);

    expect(res.status).not.toBe(400);
  });

  it('explains a malformed body instead of leaking parser vocabulary', async () => {
    const res = await request(app)
      .post('/api/channels')
      .set('Cookie', owner.cookie)
      .set('Content-Type', 'application/json')
      .send('{"type": "Email",,}')
      .expect(400);

    // The old behaviour surfaced body-parser's own message, which describes the
    // parser's internal state and sends the reader to inspect the value they
    // just typed rather than the request shape.
    expect(res.body.message).toBe('Request body is not valid JSON');
    expect(res.body.message).not.toMatch(/Unexpected token/);
  });

  it('gives the same clean answer for a bare JSON literal body', async () => {
    const res = await request(app)
      .post('/api/channels')
      .set('Cookie', owner.cookie)
      .set('Content-Type', 'application/json')
      .send('null')
      .expect(400);

    expect(res.body.message).toBe('Request body is not valid JSON');
    expect(res.body.success).toBe(false);
  });

  it('still parses a normal JSON body', async () => {
    await request(app)
      .post('/api/channels')
      .set('Cookie', owner.cookie)
      .send({ type: 'Email', target: 'second@example.test' })
      .expect(201);
  });

  it('rejects an oversized body with 413, not 500', async () => {
    const res = await request(app)
      .post('/api/channels')
      .set('Cookie', owner.cookie)
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ type: 'Email', target: 'x'.repeat(20 * 1024) }));

    expect(res.status).toBe(413);
    expect(res.body.message).toBe('Request body is too large');
  });
});
