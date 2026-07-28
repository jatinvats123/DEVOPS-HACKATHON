import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { incidentDao, assertMonitorOwned } from '../dao/index.js';

// Recent incidents across the authenticated user's own monitors
export const getAllIncidentsController = asyncHandler(async (req, res) => {
  const incidents = await incidentDao.find(
    req.user?.id,
    {},
    {
      sort: { createdAt: -1 },
      limit: 10,
      populate: { path: 'monitorId', select: 'url type title' },
    }
  );

  res
    .status(200)
    .json(new ApiResponse(200, incidents, 'Incidents fetched successfully'));
});

// Incidents for one monitor — only if the requester owns it
export const getIncidentsByMonitorIdController = asyncHandler(
  async (req, res) => {
    const { monitorId } = req.params;
    await assertMonitorOwned(req.user?.id, monitorId);

    const incidents = await incidentDao.find(
      req.user?.id,
      { monitorId },
      {
        sort: { createdAt: -1 },
        populate: { path: 'monitorId', select: 'url type title' },
      }
    );

    res
      .status(200)
      .json(new ApiResponse(200, incidents, 'Incidents fetched successfully'));
  }
);

// A single incident by its own id.
//
// Previously this ran an UNSCOPED findById and then compared userId by hand.
// That was correct only for as long as nobody deleted the comparison. The DAO
// now applies the tenant scope inside the query, so an incident belonging to
// another user simply is not found — there is no ownership check left to forget.
export const getIncidentByIdController = asyncHandler(async (req, res) => {
  const { incidentId } = req.params;

  const incident = await incidentDao.findById(req.user?.id, incidentId, {
    populate: { path: 'monitorId', select: 'url type title' },
  });

  if (!incident) {
    throw new ApiError(404, 'Incident not found');
  }

  res
    .status(200)
    .json(new ApiResponse(200, incident, 'Incident fetched successfully'));
});
