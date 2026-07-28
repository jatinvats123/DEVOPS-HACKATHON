import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../src/app.js';
import { resetRateLimits } from '../../src/app.middleware.js';
import {
  connectTestDb,
  disconnectTestDb,
  clearTestDb,
  syncIndexes,
} from '../helpers/db.js';
import { createUser } from '../helpers/factories.js';
import { User } from '../../src/models/user.model.js';
import { config } from '../../src/config/config.js';

/**
 * Authentication lifecycle.
 *
 * Runs against the real middleware stack — helmet, sanitisation and the rate
 * limiters are all live. Counters are reset between cases so each one is
 * independent without having to disable the middleware being relied on.
 */
describe('Authentication', () => {
  beforeAll(async () => {
    await connectTestDb();
    await syncIndexes(User);
  });

  afterAll(disconnectTestDb);

  beforeEach(async () => {
    await clearTestDb();
    resetRateLimits();
  });

  const validSignup = {
    username: 'newuser',
    fullname: 'New User',
    email: 'new@example.test',
    password: 'correct-horse-battery',
  };

  describe('POST /api/auth/register', () => {
    it('creates a user and sets an httpOnly auth cookie', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(validSignup)
        .expect(201);

      expect(res.body.data.user.email).toBe('new@example.test');

      const cookie = res.headers['set-cookie'].join(';');
      expect(cookie).toContain(config.AUTH_COOKIE);
      expect(cookie).toContain('HttpOnly');
      // sameSite=strict is the primary CSRF control (see SECURITY.md §4).
      expect(cookie).toMatch(/SameSite=Strict/i);
    });

    it('never returns the password hash', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(validSignup)
        .expect(201);

      expect(res.body.data.user.password).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toContain(validSignup.password);
    });

    it('stores the password hashed, never in plaintext', async () => {
      await request(app)
        .post('/api/auth/register')
        .send(validSignup)
        .expect(201);

      const stored = await User.findOne({ email: validSignup.email }).select(
        '+password'
      );
      expect(stored.password).not.toBe(validSignup.password);
      expect(stored.password).toMatch(/^\$2[aby]\$/); // bcrypt
    });

    it('rejects a duplicate email or username with 409', async () => {
      await request(app)
        .post('/api/auth/register')
        .send(validSignup)
        .expect(201);
      await request(app)
        .post('/api/auth/register')
        .send(validSignup)
        .expect(409);
    });

    it('rejects a password shorter than the minimum', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...validSignup, password: 'short' });

      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(await User.countDocuments({})).toBe(0);
    });
  });

  describe('POST /api/auth/login', () => {
    it('logs in with the correct password and issues a cookie', async () => {
      await request(app)
        .post('/api/auth/register')
        .send(validSignup)
        .expect(201);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: validSignup.email, password: validSignup.password })
        .expect(200);

      expect(res.headers['set-cookie'].join(';')).toContain(config.AUTH_COOKIE);
    });

    it('rejects a wrong password with 401 and no cookie', async () => {
      await request(app)
        .post('/api/auth/register')
        .send(validSignup)
        .expect(201);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: validSignup.email, password: 'wrong-password' })
        .expect(401);

      expect(res.headers['set-cookie']).toBeUndefined();
    });

    it('requires an email or username', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({ password: 'whatever' })
        .expect(400);
    });

    it('refuses to log in an unverified account', async () => {
      await User.create({
        username: 'unverified',
        fullname: 'Un Verified',
        email: 'unverified@example.test',
        password: 'correct-horse-battery',
        isVerified: false,
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'unverified@example.test',
          password: 'correct-horse-battery',
        })
        .expect(401);

      expect(res.body.message).toMatch(/not verified/i);
    });
  });

  describe('POST /api/auth/verify/:id', () => {
    it('verifies an account with a valid OTP', async () => {
      const user = await User.create({
        username: 'otpuser',
        fullname: 'OTP User',
        email: 'otp@example.test',
        password: 'correct-horse-battery',
        isVerified: false,
      });
      const otp = await user.generateOTP();

      await request(app)
        .post(`/api/auth/verify/${user._id}`)
        .send({ otp })
        .expect(200);

      expect((await User.findById(user._id)).isVerified).toBe(true);
    });

    it('rejects a wrong OTP and leaves the account unverified', async () => {
      const user = await User.create({
        username: 'otpuser2',
        fullname: 'OTP User2',
        email: 'otp2@example.test',
        password: 'correct-horse-battery',
        isVerified: false,
      });
      await user.generateOTP();

      await request(app)
        .post(`/api/auth/verify/${user._id}`)
        .send({ otp: '000000' })
        .expect(400);

      expect((await User.findById(user._id)).isVerified).toBe(false);
    });

    it('rejects an expired OTP', async () => {
      const user = await User.create({
        username: 'otpuser3',
        fullname: 'OTP User3',
        email: 'otp3@example.test',
        password: 'correct-horse-battery',
        isVerified: false,
      });
      const otp = await user.generateOTP();

      // Expire it without touching the value, so only the deadline is at issue.
      await User.updateOne(
        { _id: user._id },
        { $set: { otpExpire: new Date(Date.now() - 1000) } }
      );

      await request(app)
        .post(`/api/auth/verify/${user._id}`)
        .send({ otp })
        .expect(400);

      expect((await User.findById(user._id)).isVerified).toBe(false);
    });
  });

  describe('password reset', () => {
    it('issues a reset token for a known address', async () => {
      const { user } = await createUser({ email: 'reset@example.test' });

      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'reset@example.test' })
        .expect(200);

      const updated = await User.findById(user._id);
      expect(updated.forgotPasswordToken).toBeTruthy();
      expect(updated.forgotPasswordExpire.getTime()).toBeGreaterThan(
        Date.now()
      );
    });

    it('resets the password with a valid token and clears it', async () => {
      const { user } = await createUser({ email: 'reset2@example.test' });
      const token = user.generateForgotToken();
      await user.save({ validateBeforeSave: false });

      await request(app)
        .post(`/api/auth/reset-password/${token}`)
        .send({ newPassword: 'brand-new-password' })
        .expect(200);

      // The new password works...
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'reset2@example.test', password: 'brand-new-password' })
        .expect(200);

      // ...and the token is single-use.
      const after = await User.findById(user._id);
      expect(after.forgotPasswordToken).toBeUndefined();
    });

    it('rejects an expired reset token', async () => {
      const { user } = await createUser({ email: 'reset3@example.test' });
      const token = user.generateForgotToken();
      await user.save({ validateBeforeSave: false });

      await User.updateOne(
        { _id: user._id },
        { $set: { forgotPasswordExpire: new Date(Date.now() - 1000) } }
      );

      await request(app)
        .post(`/api/auth/reset-password/${token}`)
        .send({ newPassword: 'brand-new-password' })
        .expect(400);
    });

    it('rejects a fabricated reset token', async () => {
      await createUser({ email: 'reset4@example.test' });

      await request(app)
        .post('/api/auth/reset-password/completely-made-up-token')
        .send({ newPassword: 'brand-new-password' })
        .expect(400);
    });
  });

  describe('protected routes', () => {
    it('rejects a request with no token', async () => {
      await request(app).get('/api/auth/profile').expect(401);
    });

    it('rejects an EXPIRED token', async () => {
      const { user } = await createUser({ email: 'expired@example.test' });
      // Signed with the real secret but already past its expiry: this proves
      // the middleware validates `exp`, not merely the signature.
      const expired = jwt.sign(
        { id: String(user._id), email: user.email },
        config.JWT_SECRET,
        { expiresIn: '-1s' }
      );

      const res = await request(app)
        .get('/api/auth/profile')
        .set('Cookie', `${config.AUTH_COOKIE}=${expired}`)
        .expect(401);

      expect(res.body.message).toMatch(/expired/i);
    });

    it('rejects a token signed with the wrong secret', async () => {
      const { user } = await createUser({ email: 'forged@example.test' });
      const forged = jwt.sign({ id: String(user._id) }, 'not-the-real-secret');

      await request(app)
        .get('/api/auth/profile')
        .set('Cookie', `${config.AUTH_COOKIE}=${forged}`)
        .expect(401);
    });

    it("accepts a valid token and returns the caller's own profile", async () => {
      const alice = await createUser({ email: 'alice@example.test' });

      const res = await request(app)
        .get('/api/auth/profile')
        .set('Cookie', alice.cookie)
        .expect(200);

      expect(res.body.data.email).toBe('alice@example.test');
    });

    it('logout clears the auth cookie', async () => {
      const alice = await createUser({ email: 'logout@example.test' });

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', alice.cookie)
        .expect(200);

      // An expired/empty cookie is how a browser is told to discard it.
      expect(res.headers['set-cookie'].join(';')).toMatch(
        new RegExp(`${config.AUTH_COOKIE}=;`)
      );
    });
  });

  describe('change password', () => {
    it('changes the password when the old one is correct', async () => {
      await request(app)
        .post('/api/auth/register')
        .send(validSignup)
        .expect(201);
      const login = await request(app)
        .post('/api/auth/login')
        .send({ email: validSignup.email, password: validSignup.password })
        .expect(200);

      await request(app)
        .post('/api/auth/change-password')
        .set('Cookie', login.headers['set-cookie'])
        .send({
          oldPassword: validSignup.password,
          newPassword: 'a-different-password',
        })
        .expect(200);

      await request(app)
        .post('/api/auth/login')
        .send({ email: validSignup.email, password: 'a-different-password' })
        .expect(200);
    });

    it('rejects a wrong old password', async () => {
      const alice = await createUser({ email: 'change@example.test' });

      await request(app)
        .post('/api/auth/change-password')
        .set('Cookie', alice.cookie)
        .send({ oldPassword: 'not-the-old-one', newPassword: 'whatever-else' })
        .expect(401);
    });
  });

  describe('rate limiting', () => {
    it('throttles repeated failed logins', async () => {
      await request(app)
        .post('/api/auth/register')
        .send(validSignup)
        .expect(201);
      resetRateLimits();

      const statuses = [];
      // The auth bucket is 10 per 15 min; 12 failures must run into it.
      for (let i = 0; i < 12; i += 1) {
        const res = await request(app)
          .post('/api/auth/login')
          .send({ email: validSignup.email, password: 'wrong-password' });
        statuses.push(res.status);
      }

      expect(statuses).toContain(429);
    });

    it('does not count SUCCESSFUL logins against the budget', async () => {
      await request(app)
        .post('/api/auth/register')
        .send(validSignup)
        .expect(201);
      resetRateLimits();

      // skipSuccessfulRequests exists so a legitimate user behind NAT is not
      // locked out by their own successful activity.
      for (let i = 0; i < 12; i += 1) {
        await request(app)
          .post('/api/auth/login')
          .send({ email: validSignup.email, password: validSignup.password })
          .expect(200);
      }
    });
  });
});
