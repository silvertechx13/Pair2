const axios = require("axios");
const FormData = require('form-data');
const fs = require('fs');
const os = require('os');
const path = require("path");
const { cmd } = require("../command");

// Helper function to format bytes
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

cmd({
  pattern: "imix",
  alias: ["edit", "editimg"],
  react: '🧠',
  desc: "Edit image using AI with a custom prompt",
  category: "utility",
  use: ".imix <prompt> [reply to image]",
  filename: __filename
}, async (conn, message, m, { reply, text }) => {
  try {
    if (!text) return reply("❌ Please provide a prompt.\n\nExample: `.imix add a boy in with this girl`");

    // Check for quoted image
    const quotedMsg = message.quoted ? message.quoted : message;
    const mimeType = (quotedMsg.msg || quotedMsg).mimetype || '';
    if (!mimeType || !mimeType.startsWith('image/')) {
      return reply("📸 Please reply to an *image* (JPEG or PNG).");
    }

    // Download media
    const mediaBuffer = await quotedMsg.download();
    const fileSize = formatBytes(mediaBuffer.length);

    // Determine extension
    let extension = '';
    if (mimeType.includes('image/jpeg')) extension = '.jpg';
    else if (mimeType.includes('image/png')) extension = '.png';
    else return reply("❌ Unsupported image format. Use JPEG or PNG.");

    // Save to temp file
    const tempFilePath = path.join(os.tmpdir(), `imix_${Date.now()}${extension}`);
    fs.writeFileSync(tempFilePath, mediaBuffer);

    // Upload to Catbox
    const form = new FormData();
    form.append('fileToUpload', fs.createReadStream(tempFilePath), `image${extension}`);
    form.append('reqtype', 'fileupload');

    const uploadResponse = await axios.post("https://catbox.moe/user/api.php", form, {
      headers: form.getHeaders()
    });

    const imageUrl = uploadResponse.data;
    fs.unlinkSync(tempFilePath); // Clean temp

    if (!imageUrl || !imageUrl.startsWith('https')) {
      throw new Error("❌ Failed to upload image to Catbox.");
    }

    // Call ZenZ API with prompt
    const apiUrl = `https://api.zenzxz.my.id/maker/imagedit?url=${encodeURIComponent(imageUrl)}&prompt=${encodeURIComponent(text)}`;
    const response = await axios.get(apiUrl, { responseType: "arraybuffer" });

    if (!response || !response.data) {
      return reply("⚠️ API did not return a valid image. Try again later.");
    }

    const imageBuffer = Buffer.from(response.data, "binary");

    // Send edited image
    await conn.sendMessage(m.chat, {
      image: imageBuffer,
      caption: `🧠 *AI Image Edit Completed!*\n📏 Size: ${fileSize}\n📝 Prompt: ${text}\n\n> *Powered by The TechX MD*`
    }, { quoted: message });

  } catch (error) {
    console.error("Imix Error:", error);
    reply(`❌ Error: ${error.response?.data?.message || error.message || "Unknown error"}`);
  }
});
