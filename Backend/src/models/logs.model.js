import mongoose from 'mongoose';

const logSchema = new mongoose.Schema({
  monitorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Monitor',
  },
  status: {
    type: String,
    enum: ['UP', 'DOWN', 'DEGRADED'],
  },
  latency: {
    type: Number,
  },
  statusCode: {
    type: Number,
  },
  error: {
    type: String,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const logModel = mongoose.model('Log', logSchema);

export default logModel;
