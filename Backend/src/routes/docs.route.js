import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import swaggerUi from 'swagger-ui-express';
import logger from '../config/logger.js';

// js-yaml and swagger-ui-express are CommonJS. Node's ESM loader usually
// synthesises a default export for CJS, but Jest's ESM runtime does not for
// js-yaml, so it is required explicitly rather than imported. Doing this at the
// boundary keeps the rest of the file plain ESM.
const require = createRequire(import.meta.url);
const yaml = require('js-yaml');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const specPath = path.resolve(__dirname, '../docs/openapi.yaml');

const docsRouter = express.Router();

/**
 * The spec is authored as YAML and loaded at boot rather than generated from
 * JSDoc annotations.
 *
 * Annotation-driven generation sounds better — one source of truth — but in
 * practice it scatters the contract across dozens of files, cannot express
 * shared components without duplication, and silently produces an invalid
 * document when one comment is malformed. A single reviewable file diffs
 * cleanly and can be linted by any OpenAPI tool.
 *
 * The trade-off is real: the spec can drift from the implementation. That is
 * mitigated by keeping it next to the routes and by the smoke test in CI, which
 * asserts the document parses and covers every mounted path.
 */
let spec = null;
let loadError = null;

try {
  spec = yaml.load(fs.readFileSync(specPath, 'utf8'));
} catch (err) {
  loadError = err;
  logger.error(`[docs] failed to load OpenAPI spec: ${err.message}`);
}

/*
@route GET /api/docs.json
@desc  The raw OpenAPI 3.1 document, for client generators and linters.
@access Public
*/
docsRouter.get('/docs.json', (req, res) => {
  if (!spec) {
    return res
      .status(503)
      .json({ success: false, message: 'API specification unavailable' });
  }
  res.json(spec);
});

/*
@route GET /api/docs
@desc  Swagger UI.
@access Public — it documents the contract, and every documented route still
        enforces its own authentication. Publishing the shape of an API is not
        a disclosure; relying on nobody knowing it would be.
*/
if (spec) {
  docsRouter.use(
    '/docs',
    // Swagger UI injects inline styles and scripts, which helmet's default CSP
    // blocks. Rather than weakening the global policy for every route, the
    // relaxation is scoped to this path only.
    (req, res, next) => {
      res.setHeader(
        'Content-Security-Policy',
        [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data:",
          "connect-src 'self'",
        ].join('; ')
      );
      next();
    },
    swaggerUi.serve,
    swaggerUi.setup(spec, {
      customSiteTitle: 'WatchTower API',
      swaggerOptions: {
        // Endpoints collapsed by default: 30+ operations expanded is a wall.
        docExpansion: 'list',
        defaultModelsExpandDepth: 1,
        persistAuthorization: true,
        tryItOutEnabled: true,
      },
    })
  );
} else {
  docsRouter.use('/docs', (req, res) =>
    res
      .status(503)
      .type('text/plain')
      .send(
        `API documentation unavailable: ${loadError?.message ?? 'spec not loaded'}\n`
      )
  );
}

export { spec as openApiSpec };
export default docsRouter;
