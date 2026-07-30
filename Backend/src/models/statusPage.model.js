import mongoose from 'mongoose';

/**
 * Reserved slugs.
 *
 * A status page is reachable at /status/:slug on the same origin as the SPA.
 * Without this list a page could claim a slug that collides with an application
 * route or a well-known path, and the resulting behaviour depends on router
 * ordering rather than on anything anyone intended.
 */
const RESERVED_SLUGS = new Set([
  'api',
  'admin',
  'login',
  'logout',
  'register',
  'dashboard',
  'settings',
  'status',
  'metrics',
  'health',
  'assets',
  'static',
  'new',
  'edit',
  'null',
  'undefined',
]);

/**
 * Normalise arbitrary text into a URL-safe slug.
 *
 * Applied on write rather than trusted from the client, because the slug ends
 * up in a public URL and a client-supplied one could contain path separators,
 * percent-encoding or unicode that changes what the route matches.
 */
export function slugify(input) {
  return (
    String(input ?? '')
      .normalize('NFKD')
      // Strip combining marks so "Café" becomes "cafe" rather than "caf".
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60)
  );
}

export const isReservedSlug = (slug) => RESERVED_SLUGS.has(String(slug));

const statusPageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },

    /**
     * Globally unique, not unique-per-owner: it is the public URL, and two
     * tenants cannot both own /status/api. Uniqueness is enforced by the index
     * as well as by the controller's pre-check, because the pre-check is a
     * race — two concurrent creates both see "free" before either writes.
     */
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 280,
      default: '',
    },

    /**
     * Monitors surfaced on the page, in display order.
     *
     * Ownership is NOT enforced by the schema — a ref cannot express "must
     * belong to the same user". The controller verifies every id against the
     * caller's own monitors before writing, which is what stops someone adding
     * another tenant's monitor to their own public page and reading its status.
     */
    monitors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Monitor',
      },
    ],

    /** When false the public endpoint behaves as if the page does not exist. */
    isPublic: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const statusPageModel = mongoose.model('StatusPage', statusPageSchema);

export default statusPageModel;
