import mongoose from "mongoose";

const { Schema } = mongoose;

const UserSchema = new Schema(
  {
    /* ---------------------- AUTH ---------------------- */
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    username: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },

    gender: {
      type: String,
      enum: ["male", "female"],
      required: true,
    },

    isVerified: { type: Boolean, default: false },
    isAdmin: { type: Boolean, default: false },

    verificationToken: String,
    verificationTokenExpiresAt: Date,
    lastVerificationTokenSentAt: Date,

    resetPasswordToken: String,
    resetPasswordExpiresAt: Date,

    loginAttempts: { type: Number, default: 0 },
    lockUntil: Date,

    lastEditAt: {
      type: Date,
      default: new Date(0),
    },

    /* ---------------------- PROFILE ---------------------- */

    avatar: String,
    country: String,
    altura: Number,
    peso: Number,
    videoProfile: String,

    stats: {
      mainAura: { type: Number, default: 0 },
      staticAura: { type: Number, default: 0 },
      dynamicAura: { type: Number, default: 0 },
      energy: { type: Number, default: 1000 },
    },

    /* ---------------------- RELACIONES ---------------------- */

    skills: [
      {
        type: Schema.Types.ObjectId,
        ref: "UserSkill",
      },
    ],

    combos: [
      {
        type: Schema.Types.ObjectId,
        ref: "Combo",
      },
    ],

    favoriteSkills: [
      {
        type: Schema.Types.ObjectId,
        ref: "Skill",
      },
    ],

    favoriteCombos: {
      static: { type: Schema.Types.ObjectId, ref: "Combo", default: null },
      dynamic: { type: Schema.Types.ObjectId, ref: "Combo", default: null },
    },

    match: [
      {
        type: Schema.Types.ObjectId,
        ref: "Match",
      },
    ],

    followers: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    following: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    teams: [
      {
        type: Schema.Types.ObjectId,
        ref: "Team",
      },
    ],

    /* ---------------------- RANKING SYSTEM ---------------------- */

    ranking: {
        points: { type: Number, default: 1000 }, 
        tier: { type: String, default: "Bronze" },
        wins: { type: Number, default: 0 },
        losses: { type: Number, default: 0 },
      },

    /* ---------------------- NOTIFICATIONS ---------------------- */

    notifications: [
      {
        type: Schema.Types.ObjectId,
        ref: "Notification",
      },
    ],

    notificationsCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

UserSchema.methods.updateTier = function () {
  const p = this.ranking.points;

  if (p < 1000) this.ranking.tier = "Bronze";
  else if (p < 1500) this.ranking.tier = "Silver";
  else if (p < 2000) this.ranking.tier = "Gold";
  else this.ranking.tier = "Diamond";
};

export default mongoose.model("User", UserSchema);
