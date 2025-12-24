import User from "../models/user.model.js";
import Notification from "../models/notification.model.js";

export const cleanupChallenge = async (challenge) => {
  const { _id } = challenge;

  const notifications = await Notification.find({ challenge: _id });
  const notificationIds = notifications.map(n => n._id);

  await Notification.deleteMany({ challenge: _id });

  await User.updateMany(
    { pendingChallenge: _id },
    {
      hasPendingChallenge: false,
      pendingChallenge: null,
      $pull: { notifications: { $in: notificationIds } },
      $inc: { notificationsCount: -notificationIds.length },
    }
  );
};
