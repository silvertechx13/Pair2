const { cmd } = require('../command');
const fetch = require('node-fetch');

cmd({
  pattern: "simdata",
  alias: ["sdata", "siminfo"],
  react: "🗯️",
  desc: "Fetch SIM data by number (Owner only).",
  category: "utility",
  filename: __filename
}, async (conn, mek, m, { from, isCreator, args, reply }) => {

  // 🔒 Only owner
  if (!isCreator) return reply("❌ Owner only command!");

  let number = args[0];
  if (!number) return reply("📞 Example: .simdata 034XXXXXXXXX");

  // 🔧 Normalize number (03 → 92)
  if (number.startsWith("03")) {
    number = "92" + number.slice(1);
  }

  // 🛡️ Protected numbers
  const protectedNumbers = [
    "923104609886",
    "923106367029"
  ];

  if (protectedNumbers.includes(number)) {
    return reply("🚫 Access Denied! Protected number.");
  }

  try {
    const apiUrl = `https://sychosimdatabase.vercel.app/api/lookup/${number}`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      return reply("❌ API Error: " + response.status);
    }

    // ❗ API returns TEXT (not JSON)
    const text = await response.text();

    // 🔍 Extract data using regex
    const mobile = text.match(/MOBILE:\s*(\d+)/i)?.[1];
    const name = text.match(/NAME:\s*(.*)/i)?.[1];
    const cnic = text.match(/CNIC:\s*(\d+)/i)?.[1];
    const address = text.match(/ADDRESS:\s*(.*)/i)?.[1];

    if (!mobile) {
      return reply("❌ No record found for this number.");
    }

    // 🛡️ Double protection check
    if (protectedNumbers.includes(mobile)) {
      return reply("🚫 Access Denied! Protected number.");
    }

    // ✅ Format output
    let msg = `*╭┈───〔 ꜱɪᴍ ᴅᴀᴛᴀ 〕┈───⊷*\n`;
    msg += `*├▢ 📱 Number:* ${mobile}\n`;
    msg += `*├▢ 👤 Name:* ${name || "N/A"}\n`;
    msg += `*├▢ 🆔 CNIC:* ${cnic || "N/A"}\n`;
    msg += `*├▢ 🏠 Address:* ${address || "N/A"}\n`;
    msg += `*╰─────────────*\n\n`;
    msg += `⚠️ _Data from public source_`;

    await conn.sendMessage(from, { text: msg }, { quoted: mek });

  } catch (err) {
    console.error(err);
    reply("❌ Failed to fetch data.");
  }
});