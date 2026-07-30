import mongoose from 'mongoose';
import { statusPageDao, monitorDao } from '../dao/index.js';
import statusPageModel, {
  slugify,
  isReservedSlug,
} from '../models/statusPage.model.js';
import { getUptimeWindows } from '../services/uptime.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

const MAX_PAGES_PER_USER = 25;
const MAX_MONITORS_PER_PAGE = 50;

/**
 * Resolve the caller's own monitor ids from a client-supplied list.
 *
 * This is the ownership boundary for the whole feature. A status page is
 * publicly readable, so accepting an arbitrary monitor id here would let anyone
 * publish another tenant's monitor status by putting its id on their own page —
 * a data leak reached entirely through a legitimate endpoint.
 *
 * Unknown or non-owned ids are rejected rather than silently dropped: quietly
 * discarding them would leave the user looking at a page missing a service they
 * believe they added.
 */
async function resolveOwnedMonitors(ownerId, ids) {
  if (ids === undefined) return undefined;

  if (!Array.isArray(ids)) {
    throw new ApiError(400, 'monitors must be an array of monitor ids');
  }
  if (ids.length > MAX_MONITORS_PER_PAGE) {
    throw new ApiError(
      400,
      `A status page can show at most ${MAX_MONITORS_PER_PAGE} monitors`
    );
  }

  // De-duplicate while preserving the order the user chose — that order is the
  // display order on the public page.
  const unique = [...new Set(ids.map(String))];

  for (const id of unique) {
    if (!mongoose.isValidObjectId(id)) {
      throw new ApiError(400, `Not a valid monitor id: ${id}`);
    }
  }

  const owned = await monitorDao.find(ownerId, { _id: { $in: unique } });
  const ownedIds = new Set(owned.map((m) => String(m._id)));

  for (const id of unique) {
    // 404, not 403: confirming that an id exists but belongs to someone else
    // is itself a disclosure.
    if (!ownedIds.has(id)) throw new ApiError(404, 'Monitor not found');
  }

  return unique.map((id) => new mongoose.Types.ObjectId(id));
}

/** Turn a requested name/slug into a free, legal slug, or explain why not. */
async function resolveSlug(requested, { excludeId } = {}) {
  const slug = slugify(requested);

  if (!slug) {
    throw new ApiError(
      400,
      'Name must contain at least one letter or number to build a URL from'
    );
  }
  if (isReservedSlug(slug)) {
    throw new ApiError(400, `"${slug}" is reserved — choose another name`);
  }

  // Slug uniqueness is global (it is a public URL), so this lookup cannot be
  // owner-scoped and deliberately bypasses the DAO. A duplicate must be
  // reported even when the conflicting page belongs to someone else.
  const clash = await statusPageModel.findOne({ slug }).select('_id').lean();
  if (clash && String(clash._id) !== String(excludeId)) {
    throw new ApiError(409, `The address /status/${slug} is already taken`);
  }

  return slug;
}

/* -------------------------------------------------------------------------- */
/* Management API — owner-scoped                                              */
/* -------------------------------------------------------------------------- */

export const listStatusPages = asyncHandler(async (req, res) => {
  const pages = await statusPageDao.find(
    req.user.id,
    {},
    {
      sort: { createdAt: -1 },
      populate: { path: 'monitors', select: 'title status url' },
    }
  );

  res
    .status(200)
    .json(new ApiResponse(200, pages, 'Status pages retrieved successfully'));
});

export const createStatusPage = asyncHandler(async (req, res) => {
  const { name, description, monitors, isPublic, slug } = req.body;

  if (!name || !String(name).trim()) {
    throw new ApiError(400, 'Name is required');
  }

  // A cap, because each page is a public endpoint and an unbounded list is a
  // way to make the dashboard unusable and the slug namespace unshareable.
  const existing = await statusPageDao.count(req.user.id, {});
  if (existing >= MAX_PAGES_PER_USER) {
    throw new ApiError(
      400,
      `You can create at most ${MAX_PAGES_PER_USER} status pages`
    );
  }

  const resolvedSlug = await resolveSlug(slug || name);
  const monitorIds = (await resolveOwnedMonitors(req.user.id, monitors)) ?? [];

  let page;
  try {
    page = await statusPageDao.create(req.user.id, {
      name: String(name).trim(),
      slug: resolvedSlug,
      description: description ? String(description).trim() : '',
      monitors: monitorIds,
      isPublic: typeof isPublic === 'boolean' ? isPublic : true,
    });
  } catch (err) {
    // The check in resolveSlug is a race: two concurrent creates can both see
    // the slug as free. The unique index is what actually decides, so translate
    // its rejection into the same answer the pre-check would have given.
    if (err?.code === 11000) {
      throw new ApiError(
        409,
        `The address /status/${resolvedSlug} is already taken`
      );
    }
    throw err;
  }

  res
    .status(201)
    .json(new ApiResponse(201, page, 'Status page created successfully'));
});

export const updateStatusPage = asyncHandler(async (req, res) => {
  const { pageId } = req.params;
  const { name, description, monitors, isPublic, slug } = req.body;

  const existing = await statusPageDao.findById(req.user.id, pageId);
  if (!existing) throw new ApiError(404, 'Status page not found');

  const update = {};

  if (name !== undefined) {
    if (!String(name).trim()) throw new ApiError(400, 'Name cannot be empty');
    update.name = String(name).trim();
  }
  if (description !== undefined) {
    update.description = String(description).trim();
  }
  if (typeof isPublic === 'boolean') {
    update.isPublic = isPublic;
  }

  // The slug only moves when explicitly asked. Renaming a page must not silently
  // change its public URL — that breaks every link already handed to customers.
  if (slug !== undefined) {
    update.slug = await resolveSlug(slug, { excludeId: pageId });
  }

  const monitorIds = await resolveOwnedMonitors(req.user.id, monitors);
  if (monitorIds !== undefined) update.monitors = monitorIds;

  let page;
  try {
    page = await statusPageDao.updateById(req.user.id, pageId, update);
  } catch (err) {
    if (err?.code === 11000) {
      throw new ApiError(409, 'That address is already taken');
    }
    throw err;
  }
  if (!page) throw new ApiError(404, 'Status page not found');

  res
    .status(200)
    .json(new ApiResponse(200, page, 'Status page updated successfully'));
});

export const deleteStatusPage = asyncHandler(async (req, res) => {
  const { pageId } = req.params;
  const page = await statusPageDao.deleteById(req.user.id, pageId);
  if (!page) throw new ApiError(404, 'Status page not found');

  res
    .status(200)
    .json(new ApiResponse(200, page, 'Status page deleted successfully'));
});

/* -------------------------------------------------------------------------- */
/* Public API — no authentication                                             */
/* -------------------------------------------------------------------------- */

/**
 * Render a status page for an anonymous visitor.
 *
 * Everything returned here is world-readable, so the projection is an
 * allow-list rather than a redaction. Notably absent, and deliberately so:
 *
 *   - the monitored URL      (reveals internal hostnames and staging estates)
 *   - request headers/auth   (outbound credentials for the target)
 *   - ownerId / monitor _id  (correlates pages, enables id-guessing elsewhere)
 *   - check interval, error text, incident detail
 *
 * A redaction list would be the wrong shape: every future field added to the
 * monitor schema would be public by default until someone remembered to hide
 * it. This way a new field stays private until someone deliberately adds it.
 */
export const getPublicStatusPage = asyncHandler(async (req, res) => {
  const slug = slugify(req.params.slug);

  const page = await statusPageModel
    .findOne({ slug, isPublic: true })
    .populate({ path: 'monitors', select: 'title status lastChecked active' })
    .lean();

  // An unpublished page is indistinguishable from one that never existed —
  // otherwise the endpoint confirms which slugs are taken.
  if (!page) throw new ApiError(404, 'Status page not found');

  const monitors = Array.isArray(page.monitors) ? page.monitors : [];

  const services = await Promise.all(
    monitors.map(async (monitor) => {
      const windows = await getUptimeWindows(monitor._id);
      return {
        name: monitor.title,
        // Paused monitors are not "up", and claiming they are would be a lie on
        // a page whose entire purpose is telling the truth about availability.
        status: monitor.active === false ? 'PAUSED' : monitor.status,
        lastCheckedAt: monitor.lastChecked ?? null,
        // null rather than 100 when nothing has been checked yet — the uptime
        // service is deliberate about that distinction and flattening it here
        // would reintroduce the lie on the most public surface there is.
        uptime: {
          '24h': windows?.['24h']?.uptime ?? null,
          '7d': windows?.['7d']?.uptime ?? null,
          '30d': windows?.['30d']?.uptime ?? null,
        },
        avgResponseMs: windows?.['24h']?.avgLatencyMs ?? null,
      };
    })
  );

  const anyDown = services.some((s) => s.status === 'DOWN');

  res.status(200).json(
    new ApiResponse(
      200,
      {
        name: page.name,
        description: page.description,
        slug: page.slug,
        overall: anyDown ? 'DEGRADED' : 'OPERATIONAL',
        services,
        updatedAt: new Date().toISOString(),
      },
      'Status page retrieved successfully'
    )
  );
});

export { MAX_PAGES_PER_USER, MAX_MONITORS_PER_PAGE };
