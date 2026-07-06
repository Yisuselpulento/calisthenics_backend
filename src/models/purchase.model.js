import mongoose from "mongoose";

const { Schema } = mongoose;

const PurchaseSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    productId: {
      type: String,
      required: true, // id del catálogo (energyProducts.js)
    },

    provider: {
      type: String,
      enum: ["paypal", "mercadopago", "google_play", "app_store"],
      required: true,
    },

    // ID de la transacción EN EL PROVEEDOR. Junto con provider es único:
    // evita otorgar dos veces el mismo pago (idempotencia / anti-fraude).
    providerTransactionId: {
      type: String,
      required: true,
    },

    amount: { type: Number, default: 0 },
    currency: { type: String, default: "" },

    status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending",
    },

    grantedAt: { type: Date, default: null },

    // Payload crudo del webhook/recibo, para auditar disputas
    raw: { type: Object, default: {} },
  },
  { timestamps: true }
);

// Un pago (provider + txId) solo puede existir una vez
PurchaseSchema.index(
  { provider: 1, providerTransactionId: 1 },
  { unique: true }
);

export default mongoose.model("Purchase", PurchaseSchema);
