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
import crypto from 'node:crypto';

/**
 * Password reset, end to end.
 *
 * Every case here corresponds to something that was actually broken:
 *  - the endpoint answered 404 for unknown emails, making it an
 *    account-enumeration oracle (directly under a comment claiming otherwise);
 *  - the emailed link pointed at a POST-only API route, so clicking it could
 *    never work;
 *  - the token was stored in the database verbatim, so read access to the users
 *    collection was account takeover for every pending reset.
 *
 * sendEmail is mocked to capture the link that would be sent — the content of
 * that link is the part that was wrong, so asserting on it is the point.
 */
const sendEmail = jest.fn();
jest.unstable_mockModule('../../src/services/sendEmail.js', () => ({
  sendEmail,
}));

const { default: app } = await import('../../src/app.js');
const { connectTestDb, disconnectTestDb, clearTestDb } =
  await import('../helpers/db.js');
const { createUser } = await import('../helpers/factories.js');
const { User } = await import('../../src/models/user.model.js');
const { resetRateLimits } = await import('../../src/app.middleware.js');
const { config } = await import('../../src/config/config.js');

/** Pull the reset URL out of whichever field the mail was built with. */
const capturedResetUrl = () => {
  const call = sendEmail.mock.calls.at(-1)?.[0] ?? {};
  const haystack = `${call.message ?? ''} ${call.html ?? ''}`;
  return haystack.match(/https?:\/\/\S*?reset-password\/[A-Za-z0-9]+/)?.[0];
};

const tokenFromUrl = (url) => url?.split('/').pop();

describe('Password reset', () => {
  let owner;

  beforeAll(connectTestDb);
  afterAll(disconnectTestDb);

  beforeEach(async () => {
    await clearTestDb();
    sendEmail.mockReset();
    sendEmail.mockResolvedValue(undefined);
    resetRateLimits();
    owner = await createUser({ email: 'owner@example.test' });
  });

  describe('requesting a link', () => {
    it('accepts a known address and sends exactly one email', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'owner@example.test' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(sendEmail).toHaveBeenCalledTimes(1);
      expect(sendEmail.mock.calls[0][0].email).toBe('owner@example.test');
    });

    it('answers identically for an unknown address', async () => {
      // The defect: this returned 404 "User not found", so anyone could test an
      // address against the user table and read the answer off the status code.
      const known = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'owner@example.test' });

      resetRateLimits();

      const unknown = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nobody@example.test' });

      expect(unknown.status).toBe(known.status);
      expect(unknown.status).toBe(200);
      expect(unknown.body.message).toBe(known.body.message);
    });

    it('sends no email for an unknown address', async () => {
      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nobody@example.test' })
        .expect(200);

      // Indistinguishable to the caller, but no mail is generated — otherwise
      // the endpoint could be used to send unsolicited mail to third parties.
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it('rejects a missing email', async () => {
      await request(app).post('/api/auth/forgot-password').send({}).expect(400);
    });

    it('links to the frontend reset page, not the API route', async () => {
      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'owner@example.test' })
        .expect(200);

      const url = capturedResetUrl();
      expect(url).toBeDefined();

      // The old link was `${host}/api/auth/reset-password/${token}` — a POST
      // route. A mail client issues GET, so the link could never work.
      expect(url).not.toMatch(/\/api\//);
      expect(url.startsWith(config.FRONTEND_URL.replace(/\/+$/, ''))).toBe(
        true
      );
      expect(url).toMatch(/\/reset-password\/[a-f0-9]{64}$/);
    });

    it('builds the link from configured FRONTEND_URL, ignoring the Host header', async () => {
      await request(app)
        .post('/api/auth/forgot-password')
        .set('Host', 'attacker.example.com')
        .send({ email: 'owner@example.test' })
        .expect(200);

      // Reflecting Host into a reset link lets someone request a reset for
      // another person's address and have the token delivered to a host they
      // control.
      expect(capturedResetUrl()).not.toMatch(/attacker\.example\.com/);
    });

    it('stores only a hash of the token, never the token itself', async () => {
      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'owner@example.test' })
        .expect(200);

      const rawToken = tokenFromUrl(capturedResetUrl());
      const stored = await User.findById(owner.id).select(
        '+forgotPasswordToken'
      );

      expect(stored.forgotPasswordToken).toBeDefined();
      expect(stored.forgotPasswordToken).not.toBe(rawToken);
      expect(stored.forgotPasswordToken).toBe(
        crypto.createHash('sha256').update(rawToken).digest('hex')
      );
    });

    it('keeps the account usable until the reset is completed', async () => {
      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'owner@example.test' })
        .expect(200);

      resetRateLimits();

      // Requesting a reset must not lock anyone out — a common way this goes
      // wrong is invalidating the password at request time rather than at use.
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'owner@example.test',
          password: 'correct-horse-battery',
        })
        .expect(200);
    });
  });

  describe('completing the reset', () => {
    const newPassword = 'brand-new-passphrase';

    const requestReset = async () => {
      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'owner@example.test' })
        .expect(200);
      resetRateLimits();
      return tokenFromUrl(capturedResetUrl());
    };

    it('sets the new password and lets the user sign in with it', async () => {
      const token = await requestReset();

      await request(app)
        .post(`/api/auth/reset-password/${token}`)
        .send({ newPassword })
        .expect(200);

      resetRateLimits();

      await request(app)
        .post('/api/auth/login')
        .send({ email: 'owner@example.test', password: newPassword })
        .expect(200);
    });

    it('stores the new password hashed, never in plaintext', async () => {
      const token = await requestReset();

      await request(app)
        .post(`/api/auth/reset-password/${token}`)
        .send({ newPassword })
        .expect(200);

      // The reset path assigns to user.password directly; if the document is
      // not loaded with +password the pre-save hook can be skipped and the
      // plaintext is written straight to the database.
      const stored = await User.findById(owner.id).select('+password');
      expect(stored.password).not.toBe(newPassword);
      expect(stored.password).toMatch(/^\$2[aby]\$/);
    });

    it('retires the old password', async () => {
      const token = await requestReset();
      await request(app)
        .post(`/api/auth/reset-password/${token}`)
        .send({ newPassword })
        .expect(200);

      resetRateLimits();

      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'owner@example.test',
          password: 'correct-horse-battery',
        })
        .expect(401);
    });

    it('consumes the token — a second use is refused', async () => {
      const token = await requestReset();

      await request(app)
        .post(`/api/auth/reset-password/${token}`)
        .send({ newPassword })
        .expect(200);

      resetRateLimits();

      // A reset link travels through email and can sit in an inbox for years.
      // It must work exactly once.
      await request(app)
        .post(`/api/auth/reset-password/${token}`)
        .send({ newPassword: 'yet-another-password' })
        .expect(400);
    });

    it('refuses an expired token', async () => {
      const token = await requestReset();

      await User.findByIdAndUpdate(owner.id, {
        forgotPasswordExpire: new Date(Date.now() - 1000),
      });

      await request(app)
        .post(`/api/auth/reset-password/${token}`)
        .send({ newPassword })
        .expect(400);
    });

    it('refuses a forged token', async () => {
      await requestReset();

      await request(app)
        .post(`/api/auth/reset-password/${'f'.repeat(64)}`)
        .send({ newPassword })
        .expect(400);
    });

    it('refuses the stored hash presented as a token', async () => {
      // If the lookup ever compared the raw input against the stored column,
      // anyone who could read the database could reset any account. Hashing the
      // input means the stored value is not itself a usable credential.
      await requestReset();
      const stored = await User.findById(owner.id).select(
        '+forgotPasswordToken'
      );

      await request(app)
        .post(`/api/auth/reset-password/${stored.forgotPasswordToken}`)
        .send({ newPassword })
        .expect(400);
    });

    it('enforces the same minimum length as registration', async () => {
      const token = await requestReset();

      await request(app)
        .post(`/api/auth/reset-password/${token}`)
        .send({ newPassword: 'abc' })
        .expect(400);

      resetRateLimits();

      // Rejected, so the token must still be spendable.
      await request(app)
        .post(`/api/auth/reset-password/${token}`)
        .send({ newPassword })
        .expect(200);
    });

    it('requires a new password', async () => {
      const token = await requestReset();
      await request(app)
        .post(`/api/auth/reset-password/${token}`)
        .send({})
        .expect(400);
    });

    it('does not distinguish "expired" from "never existed"', async () => {
      const token = await requestReset();
      await User.findByIdAndUpdate(owner.id, {
        forgotPasswordExpire: new Date(Date.now() - 1000),
      });

      const expired = await request(app)
        .post(`/api/auth/reset-password/${token}`)
        .send({ newPassword });

      resetRateLimits();

      const forged = await request(app)
        .post(`/api/auth/reset-password/${'a'.repeat(64)}`)
        .send({ newPassword });

      expect(expired.body.message).toBe(forged.body.message);
    });

    it('notifies the account holder that the password changed', async () => {
      const token = await requestReset();
      sendEmail.mockClear();

      await request(app)
        .post(`/api/auth/reset-password/${token}`)
        .send({ newPassword })
        .expect(200);

      // If the reset was not you, this mail is the only warning you get.
      expect(sendEmail).toHaveBeenCalledTimes(1);
      expect(sendEmail.mock.calls[0][0].email).toBe('owner@example.test');
    });

    it('still succeeds when the confirmation email cannot be delivered', async () => {
      const token = await requestReset();
      sendEmail.mockRejectedValue(new Error('SMTP unavailable'));

      // The password change is the contract; the notification is best effort.
      // Failing the request would tell the user it did not work when it did.
      await request(app)
        .post(`/api/auth/reset-password/${token}`)
        .send({ newPassword })
        .expect(200);

      resetRateLimits();

      await request(app)
        .post('/api/auth/login')
        .send({ email: 'owner@example.test', password: newPassword })
        .expect(200);
    });
  });
});
