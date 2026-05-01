import mongoose from 'mongoose';

const monitorSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['website', 'api'],
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    interval: {
      type: Number, //How ofter to check the monitor
    },
    timeout: {
      type: Number, //request timeout in duration
    },
  },
  { timestamps: true }
);

const Monitor = mongoose.model('Monitor', monitorSchema);

export default Monitor;
