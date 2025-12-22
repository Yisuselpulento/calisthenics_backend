import User from "../models/user.model.js";
import Notification from "../models/notification.model.js";

export const cleanupChallenge = async (challenge) => {
  const { fromUser, toUser, _id } = challenge;

  const notifications = await Notification.find({ challenge: _id });
  const notificationIds = notifications.map(n => n._id);

  await Notification.deleteMany({ challenge: _id });

  await User.updateOne(
    { _id: toUser },
    {
      hasPendingChallenge: false,
      pendingChallenge: null,
      $pull: { notifications: { $in: notificationIds } },
      $inc: { notificationsCount: -notificationIds.length },
    }
  );

  await User.updateOne(
    { _id: fromUser },
    {
      hasPendingChallenge: false,
      pendingChallenge: null,
    }
  );
};
