import mongoose from 'mongoose';

const monitorSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    trim: true,
    default: 'Untitled monitor',
    set: (value) => value?.trim() || 'Untitled monitor',
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
  type: {
    type: String,
    enum: ['website', 'api', 'HTTP/HTTPS', 'Ping', 'TCP', 'DNS', 'http', 'ping', 'tcp', 'dns'],
    required: true,
    default: 'website',
  },
  url: {
    type: String,
    required: true,
  },
  interval: {
    type: Number, //How ofter to check the monitor
    default: 60, //default to check every 60 seconds
  },
  timeout: {
    type: Number, //request timeout in duration
    default: 5000, //default timeout of 5 seconds
  },
  status: {
    type: String,
    enum: ['UP', 'DOWN'],
    default: 'UP',
  },
  lastChecked: {
    type: Date,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const monitorModel = mongoose.model('Monitor', monitorSchema);

export default monitorModel;
