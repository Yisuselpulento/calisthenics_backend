import User from "../models/user.model.js";
import Purchase from "../models/purchase.model.js";
import { getProduct, MAX_ENERGY } from "../config/energyProducts.js";
import { applyEnergyRegen } from "./energy.service.js";

/**
 * Aplica el efecto de un producto a un usuario (energía / boost).
 * Lógica ÚNICA que reutilizan todos los canales de pago.
 * @param {Object} user - documento mongoose de User (se guarda dentro)
 * @param {String} productId
 */
export const grantProduct = async (user, productId) => {
  const product = getProduct(productId);
  if (!product) throw new Error(`Producto inválido: ${productId}`);

  // Siempre regenerar antes de tocar la energía
  applyEnergyRegen(user);

  if (product.type === "full_energy") {
    user.stats.energy = MAX_ENERGY;
    user.stats.energyLastUpdatedAt = new Date();
  } else if (product.type === "boost") {
    user.stats.energyRegenMultiplier = product.boostMultiplier;
    user.stats.energyRegenBoostUntil = new Date(
      Date.now() + product.boostDurationDays * 24 * 60 * 60 * 1000
    );
  } else {
    throw new Error(`Tipo de producto no soportado: ${product.type}`);
  }

  await user.save();
  return product;
};

/**
 * Procesa una compra YA VERIFICADA por el proveedor (la llaman los webhooks).
 * Idempotente: si ese pago (provider + txId) ya se otorgó, no lo repite.
 *
 * @returns {Promise<{ granted: boolean, purchase: Object }>}
 */
export const processPurchase = async ({
  userId,
  productId,
  provider,
  providerTransactionId,
  amount = 0,
  currency = "",
  raw = {},
}) => {
  if (!userId || !productId || !provider || !providerTransactionId) {
    throw new Error("Datos de compra incompletos");
  }

  // 1) ¿Ya se procesó este pago? (idempotencia)
  const existing = await Purchase.findOne({ provider, providerTransactionId });
  if (existing && existing.status === "completed") {
    return { granted: false, purchase: existing }; // ya otorgado antes
  }

  // 2) Validar producto
  const product = getProduct(productId);
  if (!product) throw new Error(`Producto inválido: ${productId}`);

  // 3) Otorgar al usuario
  const user = await User.findById(userId);
  if (!user) throw new Error("Usuario no encontrado");

  await grantProduct(user, productId);

  // 4) Registrar la compra (upsert: crea o completa el pending)
  const purchase = await Purchase.findOneAndUpdate(
    { provider, providerTransactionId },
    {
      user: userId,
      productId,
      provider,
      providerTransactionId,
      amount,
      currency,
      status: "completed",
      grantedAt: new Date(),
      raw,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return { granted: true, purchase };
};
