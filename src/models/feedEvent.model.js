import mongoose from "mongoose";

const { Schema } = mongoose;

const FeedEventSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: [
        "NEW_SKILL",
        "NEW_COMBO",
        "NEW_TEAM",
        "JOIN_TEAM",
        "MATCH_WIN",
        "MATCH_LOSS",
        "RANK_1",
      ],
      required: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    // Puedes guardar información adicional del evento
    metadata: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

export default mongoose.model("FeedEvent", FeedEventSchema);
