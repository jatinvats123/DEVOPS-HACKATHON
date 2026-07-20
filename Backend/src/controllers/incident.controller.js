import incidentModel from '../models/incidents.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { assertMonitorOwned, getUserMonitorIds } from '../utils/ownership.js';

// Recent incidents across the authenticated user's own monitors
export const getAllIncidentsController = asyncHandler(async (req, res) => {
  const monitorIds = await getUserMonitorIds(req.user?.id);

  const incidents = await incidentModel
    .find({ monitorId: { $in: monitorIds } })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('monitorId', 'url type title');

  res
    .status(200)
    .json(new ApiResponse(200, incidents, 'Incidents fetched successfully'));
});

// Incidents for one monitor — only if the requester owns it.
// NOTE: previously used findById(monitorId), which looked up an *incident*
// by a *monitor* id and therefore never returned the right data.
export const getIncidentsByMonitorIdController = asyncHandler(
  async (req, res) => {
    const { monitorId } = req.params;
    await assertMonitorOwned(monitorId, req.user?.id);

    const incidents = await incidentModel
      .find({ monitorId })
      .sort({ createdAt: -1 })
      .populate('monitorId', 'url type title');

    res
      .status(200)
      .json(new ApiResponse(200, incidents, 'Incidents fetched successfully'));
  }
);
