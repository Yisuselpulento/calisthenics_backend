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
        minlength: [3, "El nombre debe tener al menos 3 caracteres"],
        maxlength: [20, "El nombre no puede exceder los 20 caracteres"],
      },

    username: {
      type: String,
      unique: true,
      required: true,
      trim: true,
      minlength: [3, "El username debe tener al menos 3 caracteres"],
      maxlength: [15, "El username no puede exceder los 15 caracteres"],
      match: [
        /^[a-zA-Z0-9_]+$/,
        "El username solo puede contener letras, números y guiones bajos (sin espacios)"
      ],
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

    profileType: {
      type: String,
      enum: ["static", "dynamic"],
      default: "static",
    },

    avatar: {
     type: String,
      default: "https://upload.wikimedia.org/wikipedia/commons/b/b5/Windows_10_Default_Profile_Picture.svg",
    },
    country: {
  type: String,
  default: "",
    },  
 altura: { type: Number, default: 0 },
peso: { type: Number, default: 0 },
videoProfile: { type: String, default: "" },

    stats: {
      mainAura: { type: Number, default: 0 },
      staticAura: { type: Number, default: 0 },
      dynamicAura: { type: Number, default: 0 },
      energy: { type: Number, default: 1000 },
      lastUpdated: { type: Date, default: new Date(0) }
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
    userSkill: { type: Schema.Types.ObjectId, ref: "UserSkill", required: true },
    variantKey: { type: String, required: true },
    fingers: { type: Number, enum: [1, 2, 5], required: true }
    }
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
