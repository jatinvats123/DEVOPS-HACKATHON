import mongoose from 'mongoose';

// Record of every notification dispatch attempt — powers the Transmission Log.
const notificationLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    monitorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Monitor',
    },
    event: {
      type: String, // e.g. CRITICAL_OUTAGE, HEALTH_RECOVERY
      required: true,
    },
    channel: {
      type: String, // Email, Slack, ...
      default: 'Email',
    },
    target: {
      type: String,
    },
    status: {
      type: String,
      enum: ['Delivered', 'Failed', 'Skipped'],
      default: 'Delivered',
    },
    detail: {
      type: String,
    },
  },
  { timestamps: true }
);

notificationLogSchema.index({ userId: 1, createdAt: -1 });

const notificationLogModel = mongoose.model(
  'NotificationLog',
  notificationLogSchema
);

export default notificationLogModel;
