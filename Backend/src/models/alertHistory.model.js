import mongoose from "mongoose";

const alertHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    monitorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Monitor",
      required: true,
    },
    incidentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Incident",
    },
    channelType: {
      type: String,
      enum: ["email", "slack", "webhook"],
      required: true,
    },
    target: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["SENT", "FAILED", "PENDING"],
      default: "SENT",
    },
    message: {
      type: String,
    },
    error: {
      type: String,
    },
  },
  { timestamps: true }
);

const AlertHistory = mongoose.model("AlertHistory", alertHistorySchema);

export default AlertHistory;
