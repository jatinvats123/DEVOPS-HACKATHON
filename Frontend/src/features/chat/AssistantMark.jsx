/**
 * The AI Assistant mark.
 *
 * Redrawn as vector line art rather than shipped as the source PNG. The mark is
 * rendered at 20px in the launcher and 28px in the panel header; a 1024px
 * bitmap downscaled that far loses the thin strokes it is made of, and costs a
 * network request for something that is a few hundred bytes as geometry.
 *
 * Strokes use `currentColor`, so the mark takes the colour of whatever it sits
 * in — black on the white launcher, white on the dark header — instead of
 * needing a second asset for the inverse.
 *
 * Stroke width is left to scale with the geometry rather than pinned with
 * `vector-effect: non-scaling-stroke`. Pinning it sounds right but inverts at
 * these sizes: a fixed 1.7px line is ~6% of a 28px icon's width against ~0.3%
 * at 512px, so the details thicken and close up exactly where there is least
 * room for them. Scaling normally gives ~1px at 28px, which is the proportion
 * the original mark is drawn at.
 */
const AssistantMark = ({ className = '', title }) => (
  <svg
    viewBox="0 0 48 48"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    role={title ? 'img' : undefined}
    aria-hidden={title ? undefined : 'true'}
    aria-label={title}
  >
    {title ? <title>{title}</title> : null}

    {/* Brain: two lobes, separated by a notch at the centre line */}
    <path d="M23.4 11.2a2 2 0 0 1-3.6-1 2 2 0 0 1 .5-3.4 2.1 2.1 0 0 1 3.1-1.1" />
    <path d="M24.6 11.2a2 2 0 0 0 3.6-1 2 2 0 0 0-.5-3.4 2.1 2.1 0 0 0-3.1-1.1" />

    {/* Head */}
    <path d="M14.8 19.6a9.2 9.2 0 0 1 18.4 0v1a9.2 9.2 0 0 1-18.4 0z" />

    {/* Ear pads */}
    <path d="M14.9 16.4h-1.7a2.3 2.3 0 0 0-2.3 2.3v2.6a2.3 2.3 0 0 0 2.3 2.3h1.7" />
    <path d="M33.1 16.4h1.7a2.3 2.3 0 0 1 2.3 2.3v2.6a2.3 2.3 0 0 1-2.3 2.3h-1.7" />

    {/* Eyes */}
    <circle cx="20.1" cy="19.3" r="2.6" />
    <circle cx="27.9" cy="19.3" r="2.6" />

    {/* Smile */}
    <path d="M21.5 24.8a3.3 3.3 0 0 0 5 0" />

    {/* Body */}
    <rect x="16.4" y="30" width="15.2" height="10.4" rx="2" />

    {/* Arms */}
    <path d="M16.4 32.4h-1.9a3.1 3.1 0 0 0 0 6.2h1.9" />
    <path d="M31.6 32.4h1.9a3.1 3.1 0 0 1 0 6.2h-1.9" />

    {/* Chest slot */}
    <rect x="20.8" y="33.6" width="6.4" height="3.2" rx="1.6" />
  </svg>
);

export default AssistantMark;
