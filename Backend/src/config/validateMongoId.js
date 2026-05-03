import mongoose from 'mongoose';

export default function validateId(id, res) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ success: false, message: 'Invalid monitorId' });
    return false;
  }
  return true;
}
