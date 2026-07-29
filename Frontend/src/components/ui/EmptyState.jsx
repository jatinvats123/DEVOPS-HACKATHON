import { RiInboxLine } from '@remixicon/react';

/**
 * Empty state.
 *
 * "No data" and "still loading" and "the request failed" are three different
 * situations that a blank area renders identically. On a monitoring dashboard
 * that ambiguity is expensive: an empty incident list should read as "nothing
 * is broken", never as "the incidents feature is broken".
 *
 * So an empty state always says what is empty, why, and what to do about it.
 */
const EmptyState = ({
  icon: Icon = RiInboxLine,
  title,
  description,
  action,
  tone = 'neutral',
}) => {
  // A quiet success — "no incidents" is good news and should not look like a
  // failure — versus a genuine prompt to act.
  const iconTone = tone === 'positive' ? 'text-[#1c6b3f]' : 'text-[#8a877f]';

  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-12 sm:py-16">
      <div className="w-14 h-14 rounded-full bg-[#faf9f5] border border-[#e6dfd8] flex items-center justify-center mb-5">
        <Icon className={`w-7 h-7 ${iconTone}`} aria-hidden="true" />
      </div>

      <h3 className="luxury-heading text-lg mb-2">{title}</h3>

      {description && (
        <p className="text-sm text-[#5a5750] max-w-sm mb-6">{description}</p>
      )}

      {action}
    </div>
  );
};

export default EmptyState;
