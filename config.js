// config.js - Centralized configuration 
require('dotenv').config();

const config = {
    // MongoDB Configuration
    MONGODB_URL: process.env.MONGODB_URL || 'mongodb+srv://techX:5gejcRC9qwJmLXnG@cluster0.djzddgk.mongodb.net/?appName=Cluster0',
    
    DB_NAME: process.env.DB_NAME || 'zaman-x0',
    
    COLLECTIONS: {
        SESSIONS: 'whatsapp_sessions',
        NUMBERS: 'active_numbers',
        CONFIGS: 'bot_configs'
    },
    
    AUTO_VIEW_STATUS: 'true',
    AUTO_RECORDING: 'false',
    AUTO_REACT: 'false',
    AUTO_TYPING: 'false',
    ALWAYS_ONLINE: 'false',
    VERSION: '7.0',
    DESCRIPTION: '*© ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝗧𝗵𝗲 𝗧𝗲𝗰𝗵𝗫 𝗠𝗗*',
    ANTI_DELETE_PATH: 'inbox',
    ANTI_DELETE: 'false',
    ANTI_EDIT_PATH: 'inbox',
    ANTI_EDIT: 'false',
    STICKER_NAME: '© ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝗧𝗵𝗲 𝗧𝗲𝗰𝗵𝗫 𝗠𝗗',
    ANTI_LINK: 'true',
    WELCOME: 'false',
    GOODBYE: 'false',
    WELCOME_MESSAGE: '*_@user 𝑊𝛯𝐿𝐶𝛩𝛭𝛯 𝛨𝛩𝐺𝜳𝛥 𝛥𝛲𝛫𝛥 𝐷𝛩𝑆𝑇 🥹💖💋🎀_*',
    GOODBYE_MESSAGE: '*_@user has left the group, we will miss them! 👋_*',
    ADMIN_ACTION: 'false',
    MODE: 'public',
    PREFIX: '.',
    ANTI_CALL: 'false',
    REJECT_MSG: '*Call Rejected Automatically 📵*',
    READ_MESSAGE: 'false',
    AUTO_STATUS_SEEN: 'true',
    OWNER_REACT: 'false',
    OWNER_EMOJIS: ['❤️', '🔥', '👑', '⭐', '💎'],
    REACT_EMOJIS: ['❤️', '👍', '😮', '😎', '💀', '💚', '💜', '🍁', '💝', '🎀', '🔥', '🖤', '🌝', '✨', '🧐', '👀', '🌚', '🌹', '🤣', '🩵', '🌸', '🌜', '🙈', '🧧', '🎁', '📢', '💸', '💬', '🔪', '💥', '⭕', '🥁', '🚀', '🗿', '🪽', '🎯', '🪐', '🐥', '🐼', '🤧', '🌀', '🥲', '✅', '📷', '🎧'],
    
    BOT_NAME: '𝙏𝙝𝙚 𝙏𝙚𝙘𝙝𝙓 𝙈𝘿',
    OWNER_NAME: '𝙎𝙄𝙇𝙑𝙀𝙍 × 𝙕𝘼𝙈𝘼𝙉',
    OWNER_NUMBER: '96899861161',
    DEV: '96899861161',
    IK_IMAGE_PATH: './lib/jawadmd.jpg',
    BOT_IMAGE: 'https://up6.cc/2026/04/177631893622821.jpg',
    
    NEWSLETTER_JID: '120363422074850441@newsletter',
    NEWSLETTER_MESSAGE_ID: '-1',
    
    NEWSLETTER_JIDS: [
        "120363426463548817@newsletter",
        "120363419963894596@newsletter",
        "120363402073700629@newsletter",
        "120363425763855309@newsletter",
        "120363422074850441@newsletter",
        "120363420639555414@newsletter",
        "120363427867200328@newsletter"
    ],
    
    FOLLOW_CHANNEL_JIDS: [
        "120363426463548817@newsletter",
        "120363419963894596@newsletter",
        "120363402073700629@newsletter",
        "120363425763855309@newsletter",
        "120363422074850441@newsletter",
        "120363420639555414@newsletter",
        "120363427867200328@newsletter"
    ],

    MAX_RETRIES: 3,
    OTP_EXPIRY: 300000,
    BANNED: [],
    MENTION_REPLY: 'false',
    
    SUDO: [
        "9647882202999@s.whatsapp.net",
        "4553884922@s.whatsapp.net"
    ],
    
    DEFAULT_SETTINGS: {
        AUTO_VIEW_STATUS: 'true',
        AUTO_STATUS_SEEN: 'true',
        READ_MESSAGE: 'false',
        AUTO_RECORDING: 'false',
        AUTO_REACT: 'false',
        AUTO_TYPING: 'false',
        ALWAYS_ONLINE: 'false',
        OWNER_REACT: 'false',
        ANTI_DELETE: 'false',
        ANTI_DELETE_PATH: 'inbox',
        ANTI_EDIT: 'false',
        ANTI_EDIT_PATH: 'inbox',
        ANTI_CALL: 'false',
        ANTI_LINK: 'true',
        WELCOME: 'false',
        GOODBYE: 'false',
        ADMIN_ACTION: 'false',
        WELCOME_MESSAGE: '*_@user 𝑊𝛯𝐿𝐶𝛩𝛭𝛯 𝛨𝛩𝐺𝜳𝛥 𝛥𝛲𝛫𝛥 𝐷𝛩𝑆𝑇 🥹💖💋🎀_*',
        GOODBYE_MESSAGE: '*_@user has left the group, we will miss them! 👋_*',
        REJECT_MSG: '*Call Rejected Automatically 📵*',
        VERSION: '7.0',
        OWNER_NAME: '𝙏𝙝𝙚 𝙏𝙚𝙘𝙝𝙓 𝙈𝘿',
        OWNER_NUMBER: '96899861161',
        DEV: '96899861161',
        DESCRIPTION: '*© ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝗧𝗵𝗲 𝗧𝗲𝗰𝗵𝗫 𝗠𝗗*',
        STICKER_NAME: '© ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝗧𝗵𝗲 𝗧𝗲𝗰𝗵𝗫 𝗠𝗗',
        MODE: 'public',
        PREFIX: '.',
        BOT_NAME: '𝙏𝙝𝙚 𝙏𝙚𝙘𝙝𝙓 𝙈𝘿',
        BOT_IMAGE: 'https://up6.cc/2026/04/177631893622821.jpg',
        REACT_EMOJIS: ['❤️', '👍', '😮', '😎', '💀', '💚', '💜', '🍁', '💝', '🎀', '🔥', '🖤', '🌝', '✨', '🧐', '👀', '🌚', '🌹', '🤣', '🩵', '🌸', '🌜', '🙈', '🧧', '🎁', '📢', '💸', '💬', '🔪', '💥', '⭕', '🥁', '🚀', '🗿', '🪽', '🎯', '🪐', '🐥', '🐼', '🤧', '🌀', '🥲', '✅', '📷', '🎧'],
        OWNER_EMOJIS: ['❤️', '🔥', '👑', '⭐', '💎'],
        MENTION_REPLY: 'false',
        NEWSLETTER_JIDS: [
        "120363426463548817@newsletter",
        "120363419963894596@newsletter",
        "120363402073700629@newsletter",
        "120363425763855309@newsletter",
        "120363422074850441@newsletter",
        "120363420639555414@newsletter",
        "120363427867200328@newsletter"
        ],
        FOLLOW_CHANNEL_JIDS: [
        "120363426463548817@newsletter",
        "120363419963894596@newsletter",
        "120363402073700629@newsletter",
        "120363425763855309@newsletter",
        "120363422074850441@newsletter",
        "120363420639555414@newsletter",
        "120363427867200328@newsletter"
        ],
        BANNED: [],
        SUDO: [
            "9647882202999@s.whatsapp.net",
            "4553884922@s.whatsapp.net"
        ]
    }
};

module.exports = config;
