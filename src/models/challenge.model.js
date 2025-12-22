import mongoose from "mongoose";

const { Schema } = mongoose;

const ChallengeSchema = new Schema(
  {
    /* ---------------------- USERS ---------------------- */

    fromUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    toUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    /* ---------------------- MATCH CONFIG ---------------------- */

    type: {
      type: String,
      enum: ["static", "dynamic"],
      required: true,
    },

    matchType: {
      type: String,
      enum: ["casual", "ranked"],
      default: "casual",
    },

    /* ---------------------- STATUS ---------------------- */

    status: {
      type: String,
      enum: [
        "pending",
        "accepted",
        "rejected",
        "expired",
        "cancelled",
        "completed",
      ],
      default: "pending",
    },

    /* ---------------------- TIMEOUT ---------------------- */

    expiresAt: {
      type: Date,
      required: true,
    },

    /* ---------------------- REMATCH ---------------------- */

    rematchOf: {
      type: Schema.Types.ObjectId,
      ref: "Challenge",
      default: null,
    },

    /* ---------------------- RANKED SNAPSHOT ---------------------- */

    eloSnapshot: {
      fromUser: { type: Number, default: null },
      toUser: { type: Number, default: null },
    },

    /* ---------------------- MATCH LINK ---------------------- */

    matchId: {
      type: Schema.Types.ObjectId,
      ref: "Match",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Challenge", ChallengeSchema);
