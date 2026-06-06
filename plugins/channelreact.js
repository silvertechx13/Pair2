const { cmd } = require('../command');
const axios = require('axios');
const config = require('../config');

// ==================== CONFIGURATION ====================
const API_BASE_URL = 'https://techxpair.vercel.app/api';

// ==================== HELPER FUNCTIONS ====================

// Validate channel post URL format
function isValidChannelPostUrl(url) {
    const pattern = /^https?:\/\/(?:www\.)?whatsapp\.com\/channel\/[a-zA-Z0-9]+\/\d+$/;
    return pattern.test(url);
}

// Extract channel ID and post ID from URL
function extractIdsFromUrl(url) {
    const match = url.match(/\/channel\/([a-zA-Z0-9]+)\/(\d+)/);
    if (match) {
        return {
            channelId: match[1],
            postId: match[2]
        };
    }
    return null;
}

// Parse emojis, server count, and specific server index
function parseEmojisAndServerOptions(input) {
    let emojis = [];
    let serverCount = null;
    let serverIndex = null;
    
    // Check for & (specific server index)
    const ampIndex = input.lastIndexOf('&');
    if (ampIndex !== -1) {
        const afterAmp = input.substring(ampIndex + 1).trim();
        if (afterAmp && !isNaN(afterAmp) && parseInt(afterAmp) > 0) {
            serverIndex = parseInt(afterAmp);
            input = input.substring(0, ampIndex);
        }
    }
    
    // Check for # (server count)
    const hashIndex = input.lastIndexOf('#');
    if (hashIndex !== -1) {
        const afterHash = input.substring(hashIndex + 1).trim();
        if (afterHash && !isNaN(afterHash) && parseInt(afterHash) > 0) {
            serverCount = parseInt(afterHash);
            input = input.substring(0, hashIndex);
        }
    }
    
    // Split by commas for emojis
    const parts = input.split(',').map(p => p.trim()).filter(p => p);
    
    for (const part of parts) {
        if (part.startsWith('#') || part.startsWith('&')) continue;
        const emojiRegex = /[\p{Emoji}\u200d]/u;
        if (emojiRegex.test(part)) {
            emojis.push(part);
        }
    }
    
    return { emojis, serverCount, serverIndex };
}

// Validate emojis
function validateEmojis(emojis) {
    if (!emojis || emojis.length === 0) {
        return {
            valid: false,
            error: '❌ *No valid emojis found!*\n*Example:* .chreact https://whatsapp.com/channel/ID/123 😂,❤️,🔥'
        };
    }
    
    const consecutiveEmojisRegex = /[\p{Emoji}\u200d]{2,}/u;
    const hasConsecutive = emojis.some(e => consecutiveEmojisRegex.test(e));
    
    if (hasConsecutive) {
        return {
            valid: false,
            error: '❌ *Invalid format! Please separate all emojis with commas*\n*Example:* .chreact link 😂,❤️,🔥,👏,😮'
        };
    }
    
    return { valid: true, emojis };
}

// ==================== CHREACT COMMAND ====================
cmd({
    pattern: "chreact",
    alias: ["channelreact", "react", "rch"],
    react: "🎯",
    desc: "React to WhatsApp channel post using servers",
    category: "group",
    use: ".chreact <channel_post_url> [emojis] [#count|&index]",
    filename: __filename
}, async (conn, mek, m, { 
    from, quoted, body, isCmd, command, args, q, 
    isGroup, sender, senderNumber, botNumber2, botNumber,
    pushname, isMe, isCreator, isRealOwner, reply, react 
}) => {
    try {
        if (!args[0]) {
            await react('❌');
            return reply(`❌ *Please provide a channel post URL!*

*Valid URL Format:*
https://whatsapp.com/channel/CHANNEL_ID/POST_ID

*Usage Examples:*

1️⃣ *Basic reaction (all servers):*
.chreact https://whatsapp.com/channel/channlink/123

2️⃣ *Custom emojis (all servers):*
.chreact https://whatsapp.com/channel/channlink/123 😂,❤️,🔥

3️⃣ *Specific server by index (&):*
.chreact https://whatsapp.com/channel/channlink/123 😂,❤️,🔥 &3

4️⃣ *First N servers (#):*
.chreact https://whatsapp.com/channel/channlink/123 😂,❤️,🔥 #10

5️⃣ *Combine both (# then & - & takes priority):*
.chreact https://whatsapp.com/channel/channlink/123 😂,❤️,🔥 #10 &5
`);
        }
        
        const url = args[0];
        
        if (!isValidChannelPostUrl(url)) {
            await react('❌');
            return reply(`❌ *Invalid URL!*

*Valid Format:* 
https://whatsapp.com/channel/CHANNEL_ID/POST_ID

*Example:* 
https://whatsapp.com/channel/channlink/123

❌ *Wrong Format:* 
https://whatsapp.com/channel/channlink (missing post ID)
`);
        }
        
        const ids = extractIdsFromUrl(url);
        if (!ids) {
            await react('❌');
            return reply(`❌ *Failed to extract channel/post IDs from URL!*`);
        }
        
        await react('⏳');
        
        let emojisInput = '';
        let serverCount = null;
        let serverIndex = null;
        
        if (args.length > 1) {
            const remaining = args.slice(1).join(' ');
            const parsed = parseEmojisAndServerOptions(remaining);
            emojisInput = parsed.emojis.join(',');
            serverCount = parsed.serverCount;
            serverIndex = parsed.serverIndex;
        }
        
        let emojis = [];
        if (!emojisInput) {
            emojis = ['❤️', '👍', '😮', '😎', '💀'];
        } else {
            emojis = emojisInput.split(',').map(e => e.trim()).filter(e => e);
        }
        
        const validation = validateEmojis(emojis);
        if (!validation.valid) {
            await react('❌');
            return reply(validation.error);
        }
        
        const serversResponse = await axios.get(`${API_BASE_URL}/servers`, { 
            timeout: 10000 
        });
        
        if (!serversResponse.data || !serversResponse.data.servers) {
            await react('❌');
            return reply("❌ *Failed to fetch server list!*");
        }
        
        let servers = serversResponse.data.servers;
        
        if (servers.length === 0) {
            await react('❌');
            return reply("❌ *No servers found!*");
        }
        
        let serversToUse = [];
        let actualCount = 0;
        let infoMessage = "";
        
        if (serverIndex !== null) {
            if (serverIndex < 1 || serverIndex > servers.length) {
                await react('❌');
                return reply(`❌ *Invalid server index!*\n\nAvailable servers: 1 to ${servers.length}\nYou requested: ${serverIndex}`);
            }
            serversToUse = [servers[serverIndex - 1]];
            actualCount = 1;
            infoMessage = `🎯 *Server ${serverIndex} of ${servers.length}*`;
        }
        else if (serverCount !== null && serverCount > 0) {
            if (serverCount > servers.length) {
                serverCount = servers.length;
            }
            serversToUse = servers.slice(0, serverCount);
            actualCount = serverCount;
            infoMessage = `🔢 *First ${actualCount} servers of ${servers.length}*`;
        }
        else {
            serversToUse = servers;
            actualCount = servers.length;
            infoMessage = `🌐 *All ${actualCount} servers*`;
        }
        
        const emojisString = validation.emojis.join(',');
        
        let requestCount = 0;
        for (const server of serversToUse) {
            const reactUrl = `${server.url}/chreact?url=${encodeURIComponent(url)}&emojis=${encodeURIComponent(emojisString)}`;
            axios.get(reactUrl, { timeout: 5000 }).catch(() => {});
            requestCount++;
        }
        
        await react('✅');
        
        let responseMsg = `✅ *Reactions sent successfully!*

📊 *Details:*
🎯 *Channel ID:* ${ids.channelId}
📝 *Post ID:* ${ids.postId}
😊 *Emojis:* ${validation.emojis.join(' ')}
${infoMessage}
📡 *Requests Sent:* ${requestCount}

> *© ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝗧𝗵𝗲 𝗧𝗲𝗰𝗵𝗫 𝗠𝗗-♡*`;
        
        await reply(responseMsg);
        
    } catch (error) {
        console.error("React post error:", error);
        await react('❌');
        await reply(`❌ *Error processing request!*\n\n*Error:* ${error.message}`);
    }
});