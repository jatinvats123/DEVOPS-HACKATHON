import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  jest,
} from '@jest/globals';
import request from 'supertest';

/**
 * Google sign-in.
 *
 * google-auth-library is mocked at the module boundary, because the real
 * verifyIdToken fetches Google's signing keys over the network — a test that
 * did that would be asserting Google's uptime, not our behaviour.
 *
 * What IS asserted is everything we are responsible for: that a token is
 * rejected unless it verifies, that the audience and issuer are checked, that
 * an unverified email cannot claim an account, and that account linking is
 * driven by the stable subject id rather than a mutable address.
 */
const verifyIdToken = jest.fn();

jest.unstable_mockModule('google-auth-library', () => ({
  OAuth2Client: class {
    constructor(clientId) {
      this.clientId = clientId;
    }
    verifyIdToken(...args) {
      return verifyIdToken(...args);
    }
  },
}));

// The controller reads GOOGLE_CLIENT_ID at call time via config, but config is
// built at import — so it has to be set before app.js is pulled in.
process.env.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com';

const { default: app } = await import('../../src/app.js');
const { connectTestDb, disconnectTestDb, clearTestDb } =
  await import('../helpers/db.js');
const { createUser } = await import('../helpers/factories.js');
const { User } = await import('../../src/models/user.model.js');
const { resetRateLimits } = await import('../../src/app.middleware.js');
const { config } = await import('../../src/config/config.js');

/** A payload shaped like a genuine Google ID token. */
const payload = (overrides = {}) => ({
  iss: 'https://accounts.google.com',
  sub: '1234567890',
  email: 'newperson@example.test',
  email_verified: true,
  name: 'New Person',
  picture: 'https://lh3.googleusercontent.com/a/default',
  ...overrides,
});

const accepts = (over) =>
  verifyIdToken.mockResolvedValue({ getPayload: () => payload(over) });

const post = (body) => request(app).post('/api/auth/google').send(body);

describe('Google sign-in', () => {
  beforeAll(connectTestDb);
  afterAll(disconnectTestDb);

  beforeEach(async () => {
    await clearTestDb();
    verifyIdToken.mockReset();
    resetRateLimits();
  });

  describe('verifying the credential', () => {
    it('creates an account and issues the normal session cookie', async () => {
      accepts();

      const res = await post({ credential: 'good-token' }).expect(200);

      expect(res.body.data.user.email).toBe('newperson@example.test');
      // The same cookie the password login sets — one session mechanism.
      const cookies = res.headers['set-cookie'].join(';');
      expect(cookies).toContain(config.AUTH_COOKIE);
      expect(cookies).toMatch(/HttpOnly/i);

      const created = await User.findOne({ email: 'newperson@example.test' });
      expect(created.provider).toBe('google');
      expect(created.googleId).toBe('1234567890');
      expect(created.isVerified).toBe(true);
    });

    it('checks the token against OUR client id', async () => {
      accepts();
      await post({ credential: 'good-token' }).expect(200);

      // Without an audience check, a token minted for any other Google
      // application would be accepted here — the classic way to break this.
      expect(verifyIdToken).toHaveBeenCalledWith(
        expect.objectContaining({ audience: config.GOOGLE_CLIENT_ID })
      );
    });

    it('rejects a token that fails verification', async () => {
      verifyIdToken.mockRejectedValue(new Error('Invalid token signature'));

      const res = await post({ credential: 'forged' }).expect(401);

      // The internal reason is not echoed back: it tells someone probing
      // exactly how far their forgery got.
      expect(res.body.message).not.toMatch(/signature/i);
      expect(await User.countDocuments({})).toBe(0);
    });

    it('rejects a token from an unexpected issuer', async () => {
      accepts({ iss: 'https://evil.example.com' });
      await post({ credential: 'wrong-issuer' }).expect(401);
      expect(await User.countDocuments({})).toBe(0);
    });

    it('requires a credential', async () => {
      await post({}).expect(400);
      await post({ credential: '' }).expect(400);
      await post({ credential: { not: 'a string' } }).expect(400);
    });

    it('refuses an unverified email address', async () => {
      accepts({ email_verified: false });

      // Google will issue tokens for addresses the account has not proven it
      // controls. Trusting one would let someone claim victim@company.com.
      await post({ credential: 'unverified' }).expect(401);
      expect(await User.countDocuments({})).toBe(0);
    });
  });

  describe('account resolution', () => {
    it('returns the same account on a second sign-in', async () => {
      accepts();
      const first = await post({ credential: 't1' }).expect(200);
      resetRateLimits();
      accepts();
      const second = await post({ credential: 't2' }).expect(200);

      expect(second.body.data.user._id).toBe(first.body.data.user._id);
      expect(await User.countDocuments({})).toBe(1);
    });

    it('follows the subject id when the email address changes', async () => {
      accepts();
      const first = await post({ credential: 't1' }).expect(200);
      resetRateLimits();

      // Same person, renamed mailbox — common in Google Workspace. Matching on
      // email alone would create a duplicate account and orphan their monitors.
      accepts({ email: 'renamed@example.test' });
      const second = await post({ credential: 't2' }).expect(200);

      expect(second.body.data.user._id).toBe(first.body.data.user._id);
      expect(await User.countDocuments({})).toBe(1);
    });

    it('links to an existing local account with the same verified address', async () => {
      const local = await createUser({
        username: 'localuser',
        email: 'both@example.test',
      });

      accepts({ email: 'both@example.test', sub: 'google-sub-99' });
      const res = await post({ credential: 'link' }).expect(200);

      expect(res.body.data.user._id).toBe(local.id);
      expect(await User.countDocuments({})).toBe(1);

      const linked = await User.findById(local.id).select('+password');
      expect(linked.googleId).toBe('google-sub-99');
      // The password survives: the user keeps both ways in.
      expect(linked.password).toBeDefined();
    });

    it('allocates a distinct username when the obvious one is taken', async () => {
      await createUser({
        username: 'taken',
        email: 'someoneelse@example.test',
      });

      accepts({ email: 'taken@example.test', sub: 'sub-2' });
      await post({ credential: 'collide' }).expect(200);

      const created = await User.findOne({ email: 'taken@example.test' });
      expect(created.username).not.toBe('taken');
      expect(await User.countDocuments({})).toBe(2);
    });

    it('builds a schema-legal username from a very short mailbox name', async () => {
      // The schema requires >= 3 characters; "ab" would fail validation and
      // surface as a 500 on an otherwise perfectly valid sign-in.
      accepts({ email: 'ab@example.test', sub: 'sub-3' });
      await post({ credential: 'short' }).expect(200);

      const created = await User.findOne({ email: 'ab@example.test' });
      expect(created.username.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('interaction with password login', () => {
    it('does not let a Google account sign in with an empty password', async () => {
      accepts();
      await post({ credential: 'good' }).expect(200);
      resetRateLimits();

      // A Google account has no password hash. bcrypt throws outright on an
      // undefined hash, so without a guard this is a 500 — and the 500 itself
      // reveals that the address belongs to a Google account.
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'newperson@example.test', password: '' });

      expect(res.status).toBe(401);
    });

    it('does not let a Google account sign in with a guessed password', async () => {
      accepts();
      await post({ credential: 'good' }).expect(200);
      resetRateLimits();

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'newperson@example.test', password: 'anything' });

      expect(res.status).toBe(401);
    });
  });

  describe('browser prerequisites', () => {
    it('permits the Google script and popup in the security headers', async () => {
      const res = await request(app).get('/api/health').expect(200);

      // Both of these silently break Google sign-in when left at helmet's
      // defaults: the script is blocked by `script-src 'self'`, and the popup
      // cannot hand back its credential under `same-origin`.
      expect(res.headers['content-security-policy']).toContain(
        'https://accounts.google.com'
      );
      expect(res.headers['cross-origin-opener-policy']).toBe(
        'same-origin-allow-popups'
      );
    });
  });
});
