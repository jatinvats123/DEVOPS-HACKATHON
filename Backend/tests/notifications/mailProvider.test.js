import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';

/**
 * Transport selection and the Brevo HTTP path.
 *
 * This exists because production sent no mail at all for days while every test
 * passed and local development worked perfectly. The cause was environmental —
 * Render's free web services block outbound 25/465/587 — and completely
 * invisible, because the password-reset endpoint returns 200 whether or not
 * delivery succeeded (deliberately, so it cannot be used to enumerate
 * accounts).
 *
 * So what is asserted here is the part that IS ours: that a configured API key
 * routes mail over HTTPS instead of SMTP, that the request Brevo receives is
 * well-formed, and that a rejection surfaces a reason someone can act on
 * instead of a bare failure.
 */

const originalEnv = { ...process.env };
let fetchMock;

const loadMailModules = async () => {
  jest.resetModules();
  const { sendEmail, activeMailProvider } =
    await import('../../src/services/sendEmail.js');
  return { sendEmail, activeMailProvider };
};

const okResponse = (body = { messageId: '<brevo-1@smtp>' }) => ({
  ok: true,
  status: 201,
  json: async () => body,
});

describe('Mail provider selection', () => {
  beforeEach(() => {
    fetchMock = jest.fn().mockResolvedValue(okResponse());
    global.fetch = fetchMock;
    process.env.MAIL_FROM = 'sender@example.test';
    process.env.MAIL_FROM_NAME = 'WatchTower';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  describe('without an API key', () => {
    beforeEach(() => {
      // Emptied, not deleted: config.js re-runs dotenv on every re-import, so
      // a deleted key is restored from the developer's real .env and the case
      // silently inverts. An empty value is left alone by dotenv.
      process.env.BREVO_API_KEY = '';
    });

    it('reports smtp as the active provider', async () => {
      const { activeMailProvider } = await loadMailModules();
      expect(activeMailProvider()).toBe('smtp');
    });

    it('does not make an HTTP request', async () => {
      const { sendEmail } = await loadMailModules();
      await sendEmail({
        email: 'someone@example.test',
        subject: 'hi',
        html: '<p>hi</p>',
      });
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('with an API key', () => {
    beforeEach(() => {
      process.env.BREVO_API_KEY = 'xkeysib-test-key';
    });

    it('reports brevo as the active provider', async () => {
      const { activeMailProvider } = await loadMailModules();
      expect(activeMailProvider()).toBe('brevo');
    });

    it('posts to the Brevo endpoint over HTTPS', async () => {
      const { sendEmail } = await loadMailModules();
      await sendEmail({
        email: 'someone@example.test',
        subject: 'Reset your password',
        html: '<p>link</p>',
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];

      // 443, because that is the whole point — SMTP ports are blocked on the
      // host this runs on.
      expect(url).toBe('https://api.brevo.com/v3/smtp/email');
      expect(init.method).toBe('POST');
      expect(init.headers['api-key']).toBe('xkeysib-test-key');
    });

    it('sends a well-formed message body', async () => {
      const { sendEmail } = await loadMailModules();
      await sendEmail({
        email: 'recipient@example.test',
        subject: 'Reset your password',
        message: 'plain text',
        html: '<p>rich</p>',
      });

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.to).toEqual([{ email: 'recipient@example.test' }]);
      expect(body.subject).toBe('Reset your password');
      expect(body.htmlContent).toBe('<p>rich</p>');
      expect(body.textContent).toBe('plain text');
    });

    it('sends from the configured verified sender', async () => {
      const { sendEmail } = await loadMailModules();
      await sendEmail({
        email: 'r@example.test',
        subject: 's',
        html: '<p>x</p>',
      });

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      // The old hardcoded `noreply@hackathon.com` is a domain nobody here owns.
      // Gmail rewrote it silently; Brevo rejects an unverified sender outright.
      expect(body.sender.email).toBe('sender@example.test');
      expect(body.sender.email).not.toMatch(/hackathon\.com/);
    });

    it('always includes a body field', async () => {
      const { sendEmail } = await loadMailModules();
      await sendEmail({ email: 'r@example.test', subject: 'no body given' });

      // Brevo rejects a message with neither htmlContent nor textContent.
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.htmlContent ?? body.textContent).toBeTruthy();
    });

    it('surfaces the reason a message was rejected', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          code: 'invalid_parameter',
          message: 'Sender email is not valid or not verified',
        }),
      });

      const { sendEmail } = await loadMailModules();

      // "Email failed" sends you nowhere. "Sender not verified" tells you
      // exactly which dashboard field to fix.
      await expect(
        sendEmail({ email: 'r@example.test', subject: 's', html: '<p>x</p>' })
      ).rejects.toThrow(/not verified/i);
    });

    it('includes the status code when the body cannot be parsed', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => {
          throw new Error('not json');
        },
        text: async () => 'Bad Gateway',
      });

      const { sendEmail } = await loadMailModules();
      await expect(
        sendEmail({ email: 'r@example.test', subject: 's', html: '<p>x</p>' })
      ).rejects.toThrow(/502/);
    });

    it('passes an abort signal so a stalled API cannot hang the request', async () => {
      const { sendEmail } = await loadMailModules();
      await sendEmail({
        email: 'r@example.test',
        subject: 's',
        html: '<p>x</p>',
      });

      // Node's fetch has NO default timeout, so without this a stalled
      // connection holds the Express handler open indefinitely — the same
      // failure the SMTP timeouts were added to prevent.
      const [, init] = fetchMock.mock.calls[0];
      expect(init.signal).toBeInstanceOf(AbortSignal);
    });

    it('reports a timeout rather than a bare abort', async () => {
      const abortError = new Error('This operation was aborted');
      abortError.name = 'AbortError';
      fetchMock.mockRejectedValue(abortError);

      const { sendEmail } = await loadMailModules();
      await expect(
        sendEmail({ email: 'r@example.test', subject: 's', html: '<p>x</p>' })
      ).rejects.toThrow(/timed out/i);
    });

    it('falls back to SMTP_USER when MAIL_FROM is not set', async () => {
      // config.js already refuses to boot without SMTP_USER, so the sender can
      // never be empty in practice — the explicit guard in the provider is
      // defence in depth. What is worth pinning is the fallback: a deployment
      // that never heard of MAIL_FROM still sends from an address it owns.
      process.env.MAIL_FROM = '';
      process.env.SMTP_USER = 'fallback@example.test';

      const { sendEmail } = await loadMailModules();
      await sendEmail({
        email: 'r@example.test',
        subject: 's',
        html: '<p>x</p>',
      });

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.sender.email).toBe('fallback@example.test');
    });
  });

  it('requires a recipient', async () => {
    const { sendEmail } = await loadMailModules();
    await expect(sendEmail({ subject: 's', html: '<p>x</p>' })).rejects.toThrow(
      /recipient/i
    );
  });
});
