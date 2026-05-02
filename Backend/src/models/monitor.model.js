import mongoose from 'mongoose';

const monitorSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['website', 'api'],
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
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const monitorModel = mongoose.model('Monitor', monitorSchema);

export default monitorModel;
