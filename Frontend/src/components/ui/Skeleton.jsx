/**
 * Loading skeletons.
 *
 * A spinner says "something is happening"; a skeleton says "content of roughly
 * this shape is arriving here". It also reserves the layout, which is what
 * keeps cumulative layout shift at zero when the real content lands.
 *
 * Every skeleton is `aria-hidden` and sits inside a container that announces
 * the load once via a live region. Screen readers must not read out a dozen
 * decorative grey rectangles.
 */

const shimmer = 'animate-pulse bg-[#e6dfd8] rounded';

export const SkeletonLine = ({ width = 'w-full', height = 'h-4' }) => (
  <div className={`${shimmer} ${width} ${height}`} aria-hidden="true" />
);

export const SkeletonText = ({ lines = 3 }) => (
  <div className="flex flex-col gap-2" aria-hidden="true">
    {Array.from({ length: lines }, (_, i) => (
      <SkeletonLine
        key={i}
        // A ragged last line reads as text rather than as a block.
        width={i === lines - 1 ? 'w-2/3' : 'w-full'}
      />
    ))}
  </div>
);

export const SkeletonCard = () => (
  <div
    className="bg-white border border-[#e6dfd8] rounded-xl p-6 sm:p-8"
    aria-hidden="true"
  >
    <SkeletonLine width="w-24" height="h-3" />
    <div className="mt-4">
      <SkeletonLine width="w-32" height="h-8" />
    </div>
    <div className="mt-4">
      <SkeletonLine width="w-40" height="h-3" />
    </div>
  </div>
);

export const SkeletonStatCards = ({ count = 4 }) => (
  <div
    className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6"
    aria-hidden="true"
  >
    {Array.from({ length: count }, (_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

export const SkeletonRows = ({ rows = 5 }) => (
  <div className="flex flex-col gap-3" aria-hidden="true">
    {Array.from({ length: rows }, (_, i) => (
      <div
        key={i}
        className="flex items-center gap-4 p-4 border border-[#e6dfd8] rounded-lg"
      >
        <div className={`${shimmer} w-10 h-10 rounded-full shrink-0`} />
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          <SkeletonLine width="w-1/3" height="h-4" />
          <SkeletonLine width="w-1/2" height="h-3" />
        </div>
        <div className={`${shimmer} w-16 h-6 shrink-0`} />
      </div>
    ))}
  </div>
);

export const SkeletonChart = ({ height = 'h-64' }) => (
  <div className={`${shimmer} w-full ${height}`} aria-hidden="true" />
);

/**
 * Wrapper that announces the loading state exactly once.
 *
 * `aria-busy` plus a single visually-hidden message is the accessible
 * equivalent of the visual skeleton — without it, a screen-reader user gets
 * silence and then, abruptly, a full page of content.
 */
export const LoadingRegion = ({ label = 'Loading', children }) => (
  <div aria-busy="true" aria-live="polite">
    <span className="sr-only">{label}</span>
    {children}
  </div>
);

export default SkeletonCard;
