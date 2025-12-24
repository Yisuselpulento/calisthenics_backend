import mongoose from "mongoose";

const { Schema } = mongoose;

const PlayerDataSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    combo: {
      type: Schema.Types.ObjectId,
      ref: "Combo",
      required: true,
    },

    points: {
      type: Number,
      default: 0,
    },

    energySpent: {
      type: Number,
      default: 0,
    },

    // Resultado individual (clave para ranked)
    result: {
      type: String,
      enum: ["win", "loss", "draw"],
      required: true,
    },

    // Snapshot de elo (solo ranked)
    eloBefore: {
      type: Number,
      default: null,
    },

    eloAfter: {
      type: Number,
      default: null,
    },

    // Breakdown detallado del combo
    breakdown: {
      type: Object,
      default: {},
    },
  },
  { _id: false }
);

const MatchSchema = new Schema(
  {
    /* ---------------------- PLAYERS ---------------------- */

    players: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],

    playerData: {
      type: [PlayerDataSchema],
      validate: {
        validator: function (v) {
          return v.length === 2;
        },
        message: "Un match debe tener exactamente 2 jugadores",
      },
    },

    /* ---------------------- RESULT ---------------------- */

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

    /* ---------------------- MATCH CONFIG ---------------------- */

    mode: {
      type: String,
      enum: ["static", "dynamic"],
      required: true,
    },

    matchType: {
      type: String,
      enum: ["ranked", "casual"],
      default: "casual",
      required: true,
    },

    /* ---------------------- GLOBAL STATS ---------------------- */

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

    /* ---------------------- SNAPSHOTS ---------------------- */

    // Para evitar exploits futuros
    rulesSnapshot: {
      type: Object,
      default: {},
    },

    details: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

/* ---------------------- VALIDACIONES RANKED ---------------------- */

MatchSchema.pre("save", async function () {
  if (this.matchType !== "ranked") return;

  const isDraw = !this.winner && !this.loser;

  // ❌ Caso inválido: uno sí y otro no
  if (
    (this.winner && !this.loser) ||
    (!this.winner && this.loser)
  ) {
    throw new Error(
      "Match ranked inconsistente: winner/loser inválidos"
    );
  }

  // 🟡 Empate: permitido, sin ELO
  if (isDraw) {
    return;
  }

  // 🟢 Ranked con resultado: requiere ELO
  const invalidPlayer = this.playerData.some(
    (p) => p.eloBefore === null || p.eloAfter === null
  );

  if (invalidPlayer) {
    throw new Error(
      "Match ranked requiere eloBefore y eloAfter en playerData"
    );
  }
});

export default mongoose.model("Match", MatchSchema);
