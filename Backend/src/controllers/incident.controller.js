import incidentModel from '../models/incidents.model';

export const getIncidentsByMonitorIdController = async (req, res) => {
  const monitorId = req.params.monitorId;

  try {
    const incidents = await incidentModel
      .findById(monitorId)
      .populate('monitorId', 'url type');

    res.status(200).json({
      message: 'Incidents fetched successfully',
      success: true,
      data: incidents,
    });
  } catch (error) {
    console.error(`Error fetching incidents for monitor ${monitorId}:`, error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
