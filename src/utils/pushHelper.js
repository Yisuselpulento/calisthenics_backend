import fetch from "node-fetch";

/**
 * Envía notificación push vía Expo
 * @param {string} expoPushToken - token de Expo del usuario
 * @param {string} title - título de la notificación
 * @param {string} body - cuerpo de la notificación
 * @param {object} data - datos adicionales
 */
export async function sendPushNotification(expoPushToken, title, body, data = {}) {
  try {
    const message = {
      to: expoPushToken,
      sound: "default",
      title,
      body,
      data,
    };

    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    const resJson = await response.json();
    console.log("Push response:", resJson);
  } catch (err) {
    console.error("Error enviando push:", err);
  }
}
