import mongoose from 'mongoose';

/**
 * Owner-scoped data access.
 *
 * The original data-exposure defect (patched in commit e7c8494) happened
 * because tenancy was enforced by convention: every controller was individually
 * responsible for remembering to add `{ userId }` to its query. That works
 * until someone forgets once.
 *
 * This layer inverts the default. A scoped DAO cannot be queried without an
 * owner — omitting one is not a silent full-collection read, it is a thrown
 * error. The owner filter is applied by the DAO itself and cannot be overridden
 * by a caller-supplied filter, so a missing (or hostile) filter in a controller
 * can no longer leak another tenant's data.
 *
 * Two scoping strategies:
 *  - DIRECT  — the collection carries the owner field (monitors, channels).
 *  - DERIVED — it does not, so the scope is resolved through ownership of a
 *    parent document (logs and incidents, via their monitor).
 */

/** Thrown when a query would run without a valid owner scope. */
export class UnscopedQueryError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnscopedQueryError';
  }
}

/**
 * An owner id must be present AND a well-formed ObjectId.
 *
 * The ObjectId check is not pedantry. `undefined` reaching a Mongo filter makes
 * the key vanish from the query — `{ userId: undefined }` matches EVERY
 * document — which is precisely how this class of bug produces a full-tenant
 * dump rather than an empty result.
 */
function assertOwner(ownerId) {
  if (ownerId === undefined || ownerId === null || ownerId === '') {
    throw new UnscopedQueryError(
      'Refusing to run an unscoped query: ownerId is required'
    );
  }
  if (typeof ownerId === 'object' && !mongoose.isValidObjectId(ownerId)) {
    throw new UnscopedQueryError(
      'Refusing to run an unscoped query: ownerId is not a valid identifier'
    );
  }
  if (typeof ownerId === 'string' && !mongoose.isValidObjectId(ownerId)) {
    throw new UnscopedQueryError(
      'Refusing to run an unscoped query: ownerId is not a valid identifier'
    );
  }
  return ownerId;
}

export class ScopedDao {
  /**
   * @param {import('mongoose').Model} model
   * @param {object} options
   * @param {string} [options.ownerField] field holding the owner id (direct scoping)
   * @param {(ownerId: any) => Promise<object>} [options.resolveScope]
   *   derived scoping — returns the filter fragment restricting to this owner
   */
  constructor(model, { ownerField = 'userId', resolveScope = null } = {}) {
    this.model = model;
    this.ownerField = ownerField;
    this.resolveScope = resolveScope;
  }

  /** The filter fragment that confines a query to one tenant. */
  async scopeFor(ownerId) {
    assertOwner(ownerId);
    if (this.resolveScope) return this.resolveScope(ownerId);
    // Cast explicitly rather than relying on Mongoose. `find()` casts a string
    // id against the schema, but `aggregate()` does NOT — a `$match` on a
    // string against an ObjectId field matches nothing at all. That fails
    // closed, so it is not a leak, but it silently returns empty results, and
    // an owner filter that quietly matches nothing is indistinguishable from
    // one that quietly matches everything the day someone "fixes" it.
    return { [this.ownerField]: new mongoose.Types.ObjectId(String(ownerId)) };
  }

  /**
   * Merge the caller's filter with the owner scope.
   *
   * When the two touch the same key — e.g. asking for one monitor's logs, where
   * the caller filters on `monitorId` and the derived scope is also expressed as
   * `monitorId` — they are combined with `$and` rather than one overwriting the
   * other. That makes the result an INTERSECTION: narrowing within your own
   * tenant works, and widening out of it is arithmetically impossible.
   *
   * A hostile `{ userId: someoneElse }` therefore does not leak; it intersects
   * with `{ userId: me }` and matches nothing. The query fails closed.
   */
  async #filter(ownerId, filter = {}) {
    const scope = await this.scopeFor(ownerId);
    const collides = Object.keys(scope).some((key) =>
      Object.prototype.hasOwnProperty.call(filter, key)
    );
    return collides ? { $and: [filter, scope] } : { ...filter, ...scope };
  }

  async find(ownerId, filter = {}, { sort, limit, select, populate } = {}) {
    let query = this.model.find(await this.#filter(ownerId, filter));
    if (sort) query = query.sort(sort);
    if (limit) query = query.limit(limit);
    if (select) query = query.select(select);
    if (populate) query = query.populate(populate);
    return query;
  }

  async findOne(ownerId, filter = {}, { select, populate } = {}) {
    let query = this.model.findOne(await this.#filter(ownerId, filter));
    if (select) query = query.select(select);
    if (populate) query = query.populate(populate);
    return query;
  }

  /**
   * By id, within the tenant. Returns null when the document does not exist OR
   * belongs to someone else — the caller cannot distinguish the two, which is
   * deliberate: a 404 for both means an attacker cannot use the API to confirm
   * that an id exists.
   */
  async findById(ownerId, id, options = {}) {
    if (!mongoose.isValidObjectId(id)) return null;
    return this.findOne(ownerId, { _id: id }, options);
  }

  async create(ownerId, doc = {}) {
    const scope = await this.scopeFor(ownerId);
    // Ownership is stamped by the DAO, never taken from the request body.
    return this.model.create({ ...doc, ...scope });
  }

  async updateById(ownerId, id, patch = {}) {
    if (!mongoose.isValidObjectId(id)) return null;
    return this.model.findOneAndUpdate(
      await this.#filter(ownerId, { _id: id }),
      { $set: patch },
      { new: true, runValidators: true }
    );
  }

  async deleteById(ownerId, id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return this.model.findOneAndDelete(
      await this.#filter(ownerId, { _id: id })
    );
  }

  async count(ownerId, filter = {}) {
    return this.model.countDocuments(await this.#filter(ownerId, filter));
  }

  async distinct(ownerId, field, filter = {}) {
    return this.model.distinct(field, await this.#filter(ownerId, filter));
  }

  /**
   * Aggregation with the owner scope forced into the FIRST stage, so no
   * subsequent stage can ever observe another tenant's documents.
   */
  async aggregate(ownerId, pipeline = []) {
    const scope = await this.scopeFor(ownerId);
    return this.model.aggregate([{ $match: scope }, ...pipeline]);
  }
}

export default ScopedDao;
