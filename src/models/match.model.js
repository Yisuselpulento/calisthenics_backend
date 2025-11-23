import mongoose from "mongoose";

const { Schema } = mongoose;

const MatchSchema = new Schema(
  {
    players: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      }
    ],

    winner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    loser: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    mode: {
      type: String,
      enum: ["static", "dynamic"],
      required: true,
    },

    matchType: {
      type: String,
      enum: ["ranked", "casual"],
      required: true,
      default: "casual",
    },

    points: {
      type: Number,
      default: 0,
    },

    energySpent: {
      type: Number,
      default: 0,
    },

    comboUsed: {
      type: Schema.Types.ObjectId,
      ref: "Combo",
      default: null,
    },

    details: {
      type: Object,
      default: {},
    },

  },
  { timestamps: true }
);

export default mongoose.model("Match", MatchSchema);
