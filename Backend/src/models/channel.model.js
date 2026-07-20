import mongoose from 'mongoose';

// A destination that incident notifications can be dispatched to.
const channelSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['Email', 'Slack', 'Webhook', 'SMS'],
      required: true,
      default: 'Email',
    },
    // email address, slack channel, or webhook url depending on type
    target: {
      type: String,
      required: true,
      trim: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const channelModel = mongoose.model('Channel', channelSchema);

export default channelModel;
