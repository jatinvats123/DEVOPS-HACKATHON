import Alert from "../models/alert.model.js";
import AlertHistory from "../models/alertHistory.model.js";
import logger from "../config/logger.js";

export const getAlerts = async (req, res) => {
  try {
    const alerts = await Alert.find({ userId: req.user._id });
    res.status(200).json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    logger.error("Error fetching alerts:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch alerts",
    });
  }
};

export const getAlertHistory = async (req, res) => {
  try {
    const history = await AlertHistory.find({ userId: req.user._id })
      .populate("monitorId", "title")
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    logger.error("Error fetching alert history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch alert history",
    });
  }
};

export const createAlert = async (req, res) => {
  try {
    const { type, target } = req.body;
    
    if (!target) {
      return res.status(400).json({
        success: false,
        message: "Target is required",
      });
    }

    const newAlert = await Alert.create({
      userId: req.user._id,
      type: type || "email",
      target,
    });

    res.status(201).json({
      success: true,
      data: newAlert,
    });
  } catch (error) {
    logger.error("Error creating alert:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create alert",
    });
  }
};

export const toggleAlertStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const alert = await Alert.findOne({ _id: id, userId: req.user._id });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Alert not found",
      });
    }

    alert.isActive = !alert.isActive;
    await alert.save();

    res.status(200).json({
      success: true,
      data: alert,
    });
  } catch (error) {
    logger.error("Error toggling alert status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update alert status",
    });
  }
};

export const deleteAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const alert = await Alert.findOneAndDelete({ _id: id, userId: req.user._id });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Alert not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Alert deleted successfully",
    });
  } catch (error) {
    logger.error("Error deleting alert:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete alert",
    });
  }
};
