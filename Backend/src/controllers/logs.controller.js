import logModel from '../models/logs.model.js';

export const monitorLogsByIdController = async (req, res) => {
  const monitorId = req.params.monitorId;

  try {
    const logs = await logModel
      .find({ monitorId })
      .sort({ timestamp: -1 })
      .limit(200)
      .populate('monitorId', 'url type title');

    res.status(200).json({
      message: 'Logs retrieved successfully',
      success: true,
      data: logs,
    });
  } catch (error) {
    console.error('Error fetching monitor logs:', error);
    res.status(500).json({ message: 'Internal server error', success: false });
  }
};
