import incidentModel from '../models/incidents.model.js';
import logger from '../config/logger.js';

export const getIncidentsByMonitorIdController = async (req, res) => {
  const monitorId = req.params.monitorId;

  try {
    const incidents = await incidentModel
      .find({ monitorId })
      .sort({ createdAt: -1 })
      .populate('monitorId', 'url type title');

    res.status(200).json({
      message: 'Incidents fetched successfully',
      success: true,
      data: incidents,
    });
  } catch (error) {
    logger.error(`Error fetching incidents for monitor ${monitorId}:`, error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
