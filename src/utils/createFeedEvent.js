import FeedEvent from "../models/feedEvent.model.js";

export const createFeedEvent = async ({
  userId,
  type,
  message,
  metadata = {}
}) => {
  const baseEvent = {
    user: userId,
    type,
    message,
    metadata: {
      ...metadata,
      hasVideo: Boolean(metadata.videoUrl),
      timestamp: new Date(),
    }
  };

  return await FeedEvent.create(baseEvent);
};
