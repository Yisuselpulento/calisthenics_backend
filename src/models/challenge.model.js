import mongoose from "mongoose";
const { Schema } = mongoose;

const ChallengeSchema = new Schema(
  {
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

    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "expired", "cancelled", "completed"],
      default: "pending",
    },

    // ⏱️ timeout configurable
    expiresAt: {
      type: Date,
      required: true,
    },

    // 🔁 rematch
    rematchOf: {
      type: Schema.Types.ObjectId,
      ref: "Challenge",
      default: null,
    },

    // 🔢 para ranked / historial
    eloSnapshot: {
      fromUser: Number,
      toUser: Number,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Challenge", ChallengeSchema);
