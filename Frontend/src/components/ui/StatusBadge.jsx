import {
  RiCheckboxCircleFill,
  RiCloseCircleFill,
  RiAlertFill,
  RiPauseCircleFill,
  RiQuestionFill,
} from '@remixicon/react';

/**
 * Status indicator — WCAG 1.4.1 "Use of Color".
 *
 * A status dashboard that encodes UP/DOWN as green/red and nothing else is
 * unreadable to roughly 1 in 12 men with a colour vision deficiency, and this
 * application's entire purpose is communicating that one bit. Red/green is
 * specifically the most common confusion pair.
 *
 * So every status carries THREE independent signals:
 *   1. a distinct icon SHAPE (tick / cross / triangle / pause)
 *   2. a text label
 *   3. colour, as reinforcement only
 *
 * Remove the colour entirely and the meaning survives — that is the test.
 */

const STATUS = {
  UP: {
    label: 'Operational',
    Icon: RiCheckboxCircleFill,
    // Contrast-checked against its own background for WCAG AA (4.5:1).
    className: 'bg-[#e7f4ec] text-[#1c6b3f] border-[#b7dfc7]',
    dot: 'bg-[#1c6b3f]',
  },
  DOWN: {
    label: 'Down',
    Icon: RiCloseCircleFill,
    className: 'bg-[#fdeceb] text-[#96271a] border-[#f4c7c2]',
    dot: 'bg-[#96271a]',
  },
  DEGRADED: {
    label: 'Degraded',
    Icon: RiAlertFill,
    className: 'bg-[#fdf3e3] text-[#8a5a00] border-[#f2ddb3]',
    dot: 'bg-[#8a5a00]',
  },
  PAUSED: {
    label: 'Paused',
    Icon: RiPauseCircleFill,
    className: 'bg-[#f1f0ed] text-[#4a4842] border-[#dcd8d1]',
    dot: 'bg-[#4a4842]',
  },
  PENDING: {
    label: 'Awaiting first check',
    Icon: RiQuestionFill,
    className: 'bg-[#f1f0ed] text-[#4a4842] border-[#dcd8d1]',
    dot: 'bg-[#4a4842]',
  },
};

export const resolveStatus = (raw) => {
  const key = String(raw || '').toUpperCase();
  if (key === 'HEALTHY' || key === 'OK') return STATUS.UP;
  if (key === 'FAILING' || key === 'ERROR') return STATUS.DOWN;
  return STATUS[key] || STATUS.PENDING;
};

/**
 * @param {string} status  UP | DOWN | DEGRADED | PAUSED | PENDING
 * @param {boolean} showLabel  false renders icon-only, with the label kept for
 *   screen readers — used where space genuinely does not allow text.
 */
const StatusBadge = ({
  status,
  showLabel = true,
  size = 'md',
  className = '',
}) => {
  const { label, Icon, className: tone } = resolveStatus(status);

  const sizing =
    size === 'sm'
      ? 'text-[11px] px-2 py-0.5 gap-1'
      : 'text-xs px-2.5 py-1 gap-1.5';
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium whitespace-nowrap ${tone} ${sizing} ${className}`}
    >
      <Icon className={`${iconSize} shrink-0`} aria-hidden="true" />
      {showLabel ? (
        <span>{label}</span>
      ) : (
        <span className="sr-only">{label}</span>
      )}
    </span>
  );
};

/**
 * Compact variant for dense lists. The dot alone would be colour-only, so the
 * text label always accompanies it.
 */
export const StatusDot = ({ status }) => {
  const { label, dot } = resolveStatus(status);
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={`w-2 h-2 rounded-full shrink-0 ${dot}`}
        aria-hidden="true"
      />
      <span className="text-xs font-medium">{label}</span>
    </span>
  );
};

export default StatusBadge;
