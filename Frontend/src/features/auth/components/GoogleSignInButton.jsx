import { useCallback, useEffect, useRef, useState } from 'react';
import { env } from '../../../config/env';

/**
 * "Continue with Google", built on Google Identity Services.
 *
 * Renders our own button and drives GIS imperatively rather than mounting
 * Google's pre-styled widget. The widget is an iframe: it cannot be restyled,
 * it does not match this form's monochrome uppercase language, and it shifts
 * layout as it loads. `prompt()` gives the same account-chooser flow from a
 * control we own.
 *
 * Renders nothing at all when no client id is configured, so a deployment
 * without Google set up shows no dead button.
 */

const GSI_SRC = 'https://accounts.google.com/gsi/client';
const SCRIPT_ID = 'google-identity-services';

/**
 * Load the GIS script once per document.
 *
 * Cached as a module-level promise because both Login and Register mount this
 * component: without it, navigating between them would append a second script
 * tag and re-initialise the library underneath the first instance.
 */
let gsiPromise = null;

function loadGoogleScript() {
  if (gsiPromise) return gsiPromise;

  gsiPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve(window.google);
      return;
    }

    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google));
      existing.addEventListener('error', () =>
        reject(new Error('Failed to load Google sign-in'))
      );
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google);
    script.onerror = () => {
      // Reset so a later mount can retry — a failed load is frequently just a
      // blocked network or an ad blocker, not a permanent condition.
      gsiPromise = null;
      reject(new Error('Failed to load Google sign-in'));
    };
    document.head.appendChild(script);
  });

  return gsiPromise;
}

/** Google's mark, inline so it is not a blocked external request. */
const GoogleMark = () => (
  <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
    <path
      fill="#EA4335"
      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
    />
    <path
      fill="#4285F4"
      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
    />
    <path
      fill="#FBBC05"
      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
    />
    <path
      fill="#34A853"
      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
    />
  </svg>
);

function GoogleSignInButton({ onCredential, disabled = false, label }) {
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const onCredentialRef = useRef(onCredential);

  // Kept in a ref so re-initialising GIS is not tied to the parent's render
  // cadence — the callback is registered with Google exactly once.
  useEffect(() => {
    onCredentialRef.current = onCredential;
  }, [onCredential]);

  const handleResponse = useCallback(async (response) => {
    if (!response?.credential) {
      setPending(false);
      setError('Google did not return a credential. Please try again.');
      return;
    }
    try {
      await onCredentialRef.current(response.credential);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          'Could not sign in with Google. Please try again.'
      );
    } finally {
      setPending(false);
    }
  }, []);

  useEffect(() => {
    if (!env.GOOGLE_CLIENT_ID) return;

    let cancelled = false;

    loadGoogleScript()
      .then((google) => {
        if (cancelled || !google?.accounts?.id) return;
        google.accounts.id.initialize({
          client_id: env.GOOGLE_CLIENT_ID,
          callback: handleResponse,
          // The credential is posted to our API over an existing same-origin
          // connection, so FedCM's auto-select is not wanted here: signing
          // someone in without an explicit click is surprising.
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setError(
            'Google sign-in could not be loaded. You can still sign in with your email.'
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [handleResponse]);

  // Not configured for this deployment — render nothing rather than a control
  // that cannot work.
  if (!env.GOOGLE_CLIENT_ID) return null;

  const handleClick = () => {
    setError('');
    setPending(true);

    window.google.accounts.id.prompt((notification) => {
      // The account chooser can decline to appear (previously dismissed, third
      // party cookies blocked, FedCM opt-out). Without this branch the button
      // would sit on "Connecting…" forever with no explanation.
      const skipped =
        notification?.isNotDisplayed?.() || notification?.isSkippedMoment?.();
      if (skipped) {
        setPending(false);
        setError(
          'Google sign-in was blocked by the browser. Check that third-party sign-in is allowed, or use your email below.'
        );
      }
    });
  };

  return (
    <>
      <button
        type="button"
        className="google-button"
        onClick={handleClick}
        disabled={disabled || pending || !ready}
      >
        <GoogleMark />
        {pending ? 'Connecting…' : label || 'Continue with Google'}
      </button>
      {error && (
        <div className="field-error" role="alert" style={{ marginTop: 12 }}>
          {error}
        </div>
      )}
    </>
  );
}

export default GoogleSignInButton;
