import monitorModel from '../models/monitor.model.js';

export const createMonitorController = async (req, res) => {
  try {
    const { type, url, interval, timeout, title, name, description } = req.body;

    //Basic validation
    if (!url) {
      return res
        .status(400)
        .json({ message: 'URL is required', success: false });
    }

    const isAlreadyMonitored = await monitorModel.findOne({
      userId: req.user.id,
      url,
    });

    if (isAlreadyMonitored) {
      return res.status(400).json({
        message: 'Monitor for this URL already exists',
        success: false,
      });
    }

    //Normalize URL (ensure it starts with http:// or https://)
    let normalizedUrl = url;
    if (!/^https?:\/\//i.test(url)) {
      normalizedUrl = 'https://' + url;
    }

    //Monitor creation logic
    const monitor = await monitorModel.create({
      userId: req.user.id, // Assuming user ID is available in req.user after authentication
      type,
      title: title || name, // Support both title and name from frontend
      url: normalizedUrl,
      interval,
      timeout,
      description,
    });

    return res.status(201).json({
      message: 'Monitor created successfully',
      success: true,
      data: monitor,
    });
  } catch (error) {
    console.error('Error creating monitor:', error);
    return res
      .status(500)
      .json({ message: 'Internal server error', success: false, error: error.message });
  }
};

export const getAllMonitorsController = async (req, res) => {
  const userId = req.user?.id; // Assuming user ID is available in req.user after authentication
  try {
    const monitors = await monitorModel.find({ userId }); // Fetch monitors for the authenticated user
    return res.status(200).json({
      message: 'Monitors retrieved successfully',
      success: true,
      data: monitors,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: 'Internal server error', success: false });
  }
};

export const deleteMonitorController = async (req, res) => {
  const userId = req.user?.id; // Assuming user ID is available in req.user after authentication
  const monitorId = req.params.monitorId;

  try {
    console.log(`Attempting to delete monitor: ${monitorId} for user: ${userId}`);
    const monitor = await monitorModel.findOneAndDelete({
      _id: monitorId,
      userId,
    });

    if (!monitor) {
      console.log(`Monitor ${monitorId} not found or not owned by user ${userId}`);
      return res.status(404).json({
        message: 'Monitor not found or you do not have permission to delete it',
        success: false,
      });
    }

    return res.status(200).json({
      message: 'Monitor deleted successfully',
      success: true,
      data: monitor,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: 'Internal server error', success: false });
  }
};
