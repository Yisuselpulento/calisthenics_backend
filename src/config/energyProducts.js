// Catálogo de productos de energía. FUENTE DE VERDAD del precio y de lo que otorga.
// El cliente NUNCA manda precio ni cantidad: solo el productId. El backend decide.
//
// ⚠️ AJUSTA los precios a lo que quieras cobrar.
// Cada producto lleva su id equivalente en cada proveedor (para mapear webhooks/IAP).

export const MAX_ENERGY = 1000;

export const ENERGY_PRODUCTS = {
  boost_x2_3d: {
    id: "boost_x2_3d",
    name: "Boost x2 (3 días)",
    description: "Duplica la regeneración de energía durante 3 días",
    type: "boost", // boost | full_energy
    boostMultiplier: 2,
    boostDurationDays: 3,
    price: { clp: 1990, usd: 1.99 }, // AJUSTA
    // IDs del mismo producto en cada tienda (los defines al crear los productos allá)
    storeIds: {
      google_play: "boost_x2_3d",
      app_store: "boost_x2_3d",
    },
  },

  full_energy: {
    id: "full_energy",
    name: "Recarga completa",
    description: "Rellena tu energía al máximo de forma instantánea",
    type: "full_energy",
    price: { clp: 990, usd: 0.99 }, // AJUSTA
    storeIds: {
      google_play: "full_energy",
      app_store: "full_energy",
    },
  },
};

export const getProduct = (productId) => ENERGY_PRODUCTS[productId] || null;
