import axios from "axios";

const TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_ID = process.env.WHATSAPP_PHONE_ID;

function formatPhoneToE164(phone) {
  let cleaned = String(phone).replace(/\D/g, "");
  if (cleaned.startsWith("91")) return `+${cleaned}`;
  if (cleaned.length === 10) return `+91${cleaned}`;
  return `+${cleaned}`;
}

/**
 * Send a free-form text message (works only if user replied in last 24h).
 */
export async function sendWhatsAppText(to, body) {
  try {
    const url = `https://graph.facebook.com/v20.0/${PHONE_ID}/messages`;
    const payload = {
      messaging_product: "whatsapp",
      to: formatPhoneToE164(to),
      type: "text",
      text: { body },
    };
    const headers = {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    };
    const { data } = await axios.post(url, payload, { headers });
    console.log("✅ WhatsApp text sent:", data);
    return true;
  } catch (e) {
    console.error("❌ WhatsApp text error:", e.response?.data || e.message);
    return false;
  }
}

/**
 * Send a template message (works always).
 * Default: hello_world (you can replace with your custom booking template).
 */
export async function sendWhatsAppTemplate(to, templateName = "hello_world", lang = "en_US") {
  try {
    const url = `https://graph.facebook.com/v20.0/${PHONE_ID}/messages`;
    const payload = {
      messaging_product: "whatsapp",
      to: formatPhoneToE164(to),
      type: "template",
      template: {
        name: templateName,
        language: { code: lang },
      },
    };
    const headers = {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    };
    const { data } = await axios.post(url, payload, { headers });
    console.log("✅ WhatsApp template sent:", data);
    return true;
  } catch (e) {
    console.error("❌ WhatsApp template error:", e.response?.data || e.message);
    return false;
  }
}
