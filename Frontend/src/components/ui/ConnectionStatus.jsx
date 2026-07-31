import {
  RiWifiLine,
  RiWifiOffLine,
  RiLoader4Line,
  RiLockUnlockLine,
} from '@remixicon/react';
import { ConnectionState } from '../../lib/socket/socket';

/**
 * Live connection indicator.
 *
 * On a status dashboard the user must be able to tell "nothing is wrong" apart
 * from "we stopped receiving updates". Without this, a dropped socket looks
 * exactly like a calm period — the dashboard confidently displays state frozen
 * at the moment the connection died.
 *
 * Like every other status in this app, it never relies on colour alone: icon
 * shape plus text plus colour, and the whole thing is a polite live region so a
 * screen reader is told when the connection drops.
 */

const PRESENTATION = {
  [ConnectionState.CONNECTED]: {
    Icon: RiWifiLine,
    label: 'Live',
    detail: 'Receiving real-time updates',
    className: 'text-[#1c6b3f] bg-[#e7f4ec] border-[#b7dfc7]',
    spin: false,
  },
  [ConnectionState.CONNECTING]: {
    Icon: RiLoader4Line,
    label: 'Connecting',
    detail: 'Establishing the live connection',
    className: 'text-[#5a5750] bg-[#f1f0ed] border-[#dcd8d1]',
    spin: true,
  },
  [ConnectionState.RECONNECTING]: {
    Icon: RiLoader4Line,
    label: 'Reconnecting',
    detail: 'Updates are paused — data may be out of date',
    className: 'text-[#8a5a00] bg-[#fdf3e3] border-[#f2ddb3]',
    spin: true,
  },
  [ConnectionState.DISCONNECTED]: {
    Icon: RiWifiOffLine,
    label: 'Offline',
    detail: 'Not receiving updates',
    className: 'text-[#96271a] bg-[#fdeceb] border-[#f4c7c2]',
    spin: false,
  },
  [ConnectionState.UNAUTHORIZED]: {
    Icon: RiLockUnlockLine,
    label: 'Session expired',
    detail: 'Sign in again to resume live updates',
    className: 'text-[#96271a] bg-[#fdeceb] border-[#f4c7c2]',
    spin: false,
  },
};

const ConnectionStatus = ({ state, reconnectAttempt = 0, onRetry }) => {
  const view = PRESENTATION[state] ?? PRESENTATION[ConnectionState.CONNECTING];
  const { Icon, label, detail, className, spin } = view;

  const showRetry =
    state === ConnectionState.DISCONNECTED ||
    state === ConnectionState.RECONNECTING;

  return (
    <div
      // polite, not assertive: a reconnect is worth announcing but must not
      // interrupt whatever the user is currently reading.
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium ${className}`}
      title={detail}
    >
      <Icon
        className={`w-3.5 h-3.5 shrink-0 ${spin ? 'animate-spin' : ''}`}
        aria-hidden="true"
      />

      <span className="hidden sm:inline">{label}</span>
      {/* On narrow screens the label collapses to save space, but it must stay
          available to assistive tech. */}
      <span className="sr-only sm:hidden">{label}</span>

      {/* Screen-reader-only elaboration: the visible badge stays compact while
          the announcement explains what it actually means for the data. */}
      <span className="sr-only">. {detail}.</span>

      {reconnectAttempt > 0 && state === ConnectionState.RECONNECTING && (
        <span className="hidden md:inline opacity-70">
          (attempt {reconnectAttempt})
        </span>
      )}

      {showRetry && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          // -my-2 keeps the pill the same height it is now while the button's
          // own hit area reaches 44px, so the touch target grows without the
          // badge changing size.
          className="-my-2 inline-flex min-h-11 min-w-11 items-center justify-center underline underline-offset-2 hover:no-underline lg:my-0 lg:min-h-0 lg:min-w-0"
        >
          Retry
        </button>
      )}
    </div>
  );
};

export default ConnectionStatus;
