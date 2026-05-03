import logModel from '../models/logs.model.js';

// Get all recent logs for dashboard
export const getAllLogsController = async (req, res) => {
  try {
    const logs = await logModel
      .find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('monitorId', 'url type name');

    res.status(200).json({
      message: 'Logs retrieved successfully',
      success: true,
      data: logs,
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ message: 'Internal server error', success: false });
  }
};

export const monitorLogsByIdController = async (req, res) => {
  //   const userId = req.user?.id;
  const monitorId = req.params.monitorId;

  try {
    const logs = await logModel
      .findById(monitorId)
      .populate('monitorId', 'url type');

    if (!logs) {
      return res.status(404).json({
        message: 'Logs not found for the specified monitor',
        success: false,
      });
    }

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
