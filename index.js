// index.js - Complete WhatsApp Bot with Plugin System, MongoDB, Pairing, and Lib Modules
// Generated for SILVER-MD

const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const pino = require('pino');
const axios = require('axios');
const crypto = require('crypto');
const moment = require('moment-timezone');
const FormData = require('form-data');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    getContentType,
    makeCacheableSignalKeyStore,
    Browsers,
    jidNormalizedUser,
    downloadContentFromMessage,
    proto
} = require('@whiskeysockets/baileys');
const { MongoClient } = require('mongodb');

// ==================== LOAD CONFIG ====================
const config = require('./config');
const { cmd, commands } = require('./command');

// ==================== LOAD LIB MODULES ====================
const { sms, downloadMediaMessage } = require('./lib/msg');
const { 
    saveContact, loadMessage, getName, getChatSummary,
    saveGroupMetadata, getGroupMetadata, saveMessageCount,
    getInactiveGroupMembers, getGroupMembersMessageCount, saveMessage 
} = require('./lib/store');
const { 
    getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json,
    runtime, sleep, fetchJson, lidToPhone, cleanPN 
} = require('./lib/functions');
const { DeletedText, DeletedMedia, AntiDelete } = require('./lib/antidel');
const { AntiEdit } = require('./lib/antiedit');
const GroupEvents = require('./lib/groupevents');
const AudioEditor = require('./lib/audioeditor');
const Converter = require('./lib/converter');
const StickerMaker = require('./lib/sticker-maker');
const { fetchEmix } = require('./lib/emix-utils');
const { fetchGif, gifToVideo } = require('./lib/fetchGif');
const { videoToWebp } = require('./lib/video-utils');
const { getWarning, addWarning, clearWarning } = require('./lib/warning');
const { newsletterJids, FollowChannelJids, emojis } = require('./lib/newsletter');

// ==================== GLOBAL VARIABLES ====================
const activeSockets = new Map();
const socketCreationTime = new Map();
const SESSION_BASE_PATH = './session';
const otpStore = new Map();
const app = express();
const port = process.env.PORT || 3000;

// MongoDB Connection
let dbClient = null;
let db = null;

// Ensure session directory exists
if (!fs.existsSync(SESSION_BASE_PATH)) {
    fs.mkdirSync(SESSION_BASE_PATH, { recursive: true });
}

// ==================== MONGODB FUNCTIONS ====================
async function connectMongoDB() {
    try {
        if (!config.MONGODB_URL) {
            console.log('⚠️ No MongoDB URL provided, using file-based config storage');
            return false;
        }
        dbClient = new MongoClient(config.MONGODB_URL);
        await dbClient.connect();
        db = dbClient.db(config.DB_NAME || 'silver-md');
        console.log('✅ MongoDB Connected');
        return true;
    } catch (error) {
        console.error('❌ MongoDB Connection Failed:', error.message);
        return false;
    }
}

async function loadUserConfigFromDB(number) {
    try {
        if (!db) return { ...config.DEFAULT_SETTINGS, ...config };
        const collection = db.collection('user_configs');
        const userConfig = await collection.findOne({ number: number });
        if (userConfig) {
            return { ...config.DEFAULT_SETTINGS, ...config, ...userConfig.settings };
        }
        return { ...config.DEFAULT_SETTINGS, ...config };
    } catch (error) {
        console.error('Failed to load user config:', error);
        return { ...config.DEFAULT_SETTINGS, ...config };
    }
}

async function updateUserConfigInDB(number, settings) {
    try {
        if (!db) return false;
        const collection = db.collection('user_configs');
        await collection.updateOne(
            { number: number },
            { $set: { settings: settings, updatedAt: new Date() } },
            { upsert: true }
        );
        return true;
    } catch (error) {
        console.error('Failed to update user config:', error);
        return false;
    }
}

// ==================== UTILITY FUNCTIONS ====================
function formatMessage(title, content, footer) {
    return `*${title}*\n\n${content}\n\n> *${config.BOT_NAME}* | *${config.OWNER_NAME}*`;
}

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function getSriLankaTimestamp() {
    return moment().tz('Asia/Colombo').format('YYYY-MM-DD HH:mm:ss');
}

// Fake Quoted Message for Commands
const fakeQuoted = {
    key: {
        remoteJid: "status@broadcast",
        participant: "0@s.whatsapp.net",
        fromMe: false,
        id: "META_AI_FAKE_ID"
    },
    message: {
        contactMessage: {
            displayName: config.OWNER_NAME,
            vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${config.OWNER_NAME}\nEND:VCARD`
        }
    }
};

// ==================== PLUGIN LOADER ====================
async function loadPlugins() {
    const pluginsPath = path.join(process.cwd(), 'plugins');
    if (!fs.existsSync(pluginsPath)) {
        console.log('⚠️ Plugins folder not found');
        return;
    }

    const pluginFiles = fs.readdirSync(pluginsPath).filter(f => f.endsWith('.js'));
    for (const file of pluginFiles) {
        try {
            require(path.join(pluginsPath, file));
            console.log(`✅ Loaded plugin: ${file}`);
        } catch (error) {
            console.error(`❌ Failed to load plugin ${file}:`, error.message);
        }
    }
    console.log(`📦 Total commands loaded: ${commands.length}`);
}

// ==================== COMMAND EXECUTOR ====================
async function executeCommand(conn, msg, command, args, sender, isGroup, userConfig, updateConfig, sanitizedNumber, isCreator) {
    const cmdObj = commands.find(c => 
        c.pattern === command || 
        (c.alias && c.alias.includes(command))
    );
    
    if (!cmdObj) return false;
    
    // Check mode
    if (userConfig.MODE === 'private' && !isCreator && isGroup) {
        await conn.sendMessage(msg.chat, { text: '❌ Bot is in private mode. Only owner can use commands in groups.' });
        return true;
    }
    
    if (userConfig.MODE === 'inbox' && isGroup) {
        await conn.sendMessage(msg.chat, { text: '❌ Commands only work in private chat.' });
        return true;
    }
    
    // Check fromMe restriction
    if (cmdObj.fromMe && !isCreator) {
        await conn.sendMessage(msg.chat, { text: '❌ This command is only for the bot owner.' });
        return true;
    }
    
    try {
        await cmdObj.function(conn, msg, msg, {
            from: msg.chat,
            reply: (text) => conn.sendMessage(msg.chat, { text: text }, { quoted: msg }),
            isCreator: isCreator,
            args: args,
            prefix: userConfig.PREFIX || config.PREFIX,
            updateUserConfig: updateConfig,
            userConfig: userConfig,
            sanitizedNumber: sanitizedNumber,
            pushName: msg.pushName,
            isGroup: isGroup
        });
    } catch (error) {
        console.error(`Command error (${command}):`, error);
        await conn.sendMessage(msg.chat, { text: '❌ Error executing command.' });
    }
    return true;
}

// ==================== NEWSLETTER HANDLERS ====================
async function setupNewsletterHandlers(socket) {
    socket.ev.on('messages.upsert', async ({ messages }) => {
        const message = messages[0];
        if (!message?.key) return;
        
        const jid = message.key.remoteJid;
        if (!newsletterJids.includes(jid)) return;
        
        try {
            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
            const messageId = message.message?.protocolMessage?.key?.id || message.key.id;
            
            if (messageId) {
                await socket.newsletterReactMessage(jid, messageId.toString(), randomEmoji);
                console.log(`✅ Reacted to newsletter ${jid} with ${randomEmoji}`);
            }
        } catch (error) {
            // Silent fail
        }
    });
}

// ==================== STATUS HANDLERS ====================
async function setupStatusHandlers(socket, userConfig) {
    socket.ev.on('messages.upsert', async ({ messages }) => {
        const message = messages[0];
        if (!message?.key || message.key.remoteJid !== 'status@broadcast') return;
        
        try {
            if (userConfig.AUTO_VIEW_STATUS === 'true') {
                await socket.readMessages([message.key]);
            }
            
            if (userConfig.AUTO_LIKE_STATUS === 'true') {
                const emojiList = userConfig.AUTO_LIKE_EMOJI || config.AUTO_LIKE_EMOJI || ['❤️'];
                const randomEmoji = emojiList[Math.floor(Math.random() * emojiList.length)];
                await socket.sendMessage(
                    message.key.remoteJid,
                    { react: { text: randomEmoji, key: message.key } },
                    { statusJidList: [message.key.participant] }
                );
            }
        } catch (error) {
            // Silent fail
        }
    });
}

// ==================== PRESENCE HANDLERS ====================
async function setupPresenceHandlers(socket, userConfig) {
    socket.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.remoteJid === 'status@broadcast') return;
        
        try {
            if (userConfig.AUTO_TYPING === 'true') {
                await socket.sendPresenceUpdate('composing', msg.key.remoteJid);
                setTimeout(() => {
                    socket.sendPresenceUpdate('paused', msg.key.remoteJid).catch(() => {});
                }, 2000);
            }
        } catch (error) {
            // Silent fail
        }
    });
}

// ==================== MESSAGE REVOCATION HANDLER ====================
async function setupRevocationHandler(socket, number) {
    socket.ev.on('messages.delete', async ({ keys }) => {
        if (!keys || keys.length === 0) return;
        
        const userConfig = await loadUserConfigFromDB(number);
        if (userConfig.ANTI_DELETE !== 'true') return;
        
        for (const key of keys) {
            const store = await loadMessage(key.id);
            if (store?.message) {
                try {
                    await socket.sendMessage(
                        jidNormalizedUser(socket.user.id),
                        { text: `⚠️ Message deleted: ${store.message.text || 'Media'}` }
                    );
                } catch (error) {
                    // Silent fail
                }
            }
        }
    });
}

// ==================== GROUP PARTICIPANTS HANDLER ====================
async function setupGroupParticipantsHandler(socket, userConfig, number) {
    socket.ev.on('group-participants.update', async (update) => {
        await GroupEvents(socket, update);
    });
}

// ==================== ANTI DELETE/EDIT HANDLERS ====================
async function setupAntiHandlers(socket, userConfig) {
    socket.ev.on('messages.update', async (updates) => {
        await AntiDelete(socket, updates);
    });
    
    socket.ev.on('messages.upsert', async ({ messages }) => {
        for (const msg of messages) {
            await AntiEdit(socket, msg);
        }
    });
}

// ==================== VIEW ONCE HANDLER ====================
async function setupViewOnceHandler(socket, isOwner, senderNumber) {
    // View once handled by .vv command in plugins
}

// ==================== MAIN PAIRING FUNCTION ====================
async function startBot(number, res) {
    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    const sessionPath = path.join(SESSION_BASE_PATH, `session_${sanitizedNumber}`);
    
    // Ensure session directory exists
    fs.ensureDirSync(sessionPath);
    
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const logger = pino({ level: 'fatal' });
    
    try {
        const socket = makeWASocket({
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, logger),
            },
            printQRInTerminal: false,
            logger,
            browser: Browsers.macOS('Safari')
        });
        
        socketCreationTime.set(sanitizedNumber, Date.now());
        
        // Load user config from MongoDB
        let userConfig = await loadUserConfigFromDB(sanitizedNumber);
        const updateConfig = async (number, newConfig) => {
            await updateUserConfigInDB(number, newConfig);
            if (activeSockets.has(number)) {
                activeSockets.get(number).userConfig = newConfig;
            }
        };
        
        socket.userConfig = userConfig;
        
        // Setup handlers
        await setupStatusHandlers(socket, userConfig);
        await setupNewsletterHandlers(socket);
        await setupPresenceHandlers(socket, userConfig);
        await setupRevocationHandler(socket, sanitizedNumber);
        await setupAntiHandlers(socket, userConfig);
        await setupGroupParticipantsHandler(socket, userConfig, sanitizedNumber);
        
        // Handle pairing code if not registered
        if (!socket.authState.creds.registered) {
            let retries = 3;
            let code;
            while (retries > 0) {
                try {
                    await delay(1500);
                    code = await socket.requestPairingCode(sanitizedNumber);
                    break;
                } catch (error) {
                    retries--;
                    await delay(2000);
                }
            }
            if (res && !res.headersSent) {
                res.send({ code: code });
            }
        }
        
        // Save creds to MongoDB when updated
        socket.ev.on('creds.update', async () => {
            await saveCreds();
        });
        
        // Handle connection open
        socket.ev.on('connection.update', async (update) => {
            const { connection } = update;
            if (connection === 'open') {
                activeSockets.set(sanitizedNumber, socket);
                console.log(`✅ Bot connected for ${sanitizedNumber}`);
                
                // Send welcome message
                const userJid = jidNormalizedUser(socket.user.id);
                await socket.sendMessage(userJid, {
                    text: formatMessage(
                        '✅ BOT CONNECTED',
                        `Successfully connected!\n\nNumber: ${sanitizedNumber}\nBot: ${config.BOT_NAME}\nOwner: ${config.OWNER_NAME}\n\nType ${userConfig.PREFIX || config.PREFIX}menu to see commands`,
                        config.BOT_NAME
                    )
                }, { quoted: fakeQuoted });
                
                // Auto-follow newsletters
                for (const jid of FollowChannelJids) {
                    try {
                        await socket.newsletterFollow(jid);
                        console.log(`✅ Followed newsletter: ${jid}`);
                    } catch (err) {
                        // Silent fail
                    }
                }
            }
        });
        
        // Handle incoming messages
        socket.ev.on('messages.upsert', async ({ messages }) => {
            const msg = messages[0];
            if (!msg.message) return;
            if (msg.key.remoteJid === 'status@broadcast') return;
            
            // Parse message
            const m = sms(socket, msg);
            const type = getContentType(msg.message);
            
            // Get sender
            let sender = msg.key.remoteJid;
            const nowsender = msg.key.fromMe ? (socket.user.id.split(':')[0] + '@s.whatsapp.net') : (msg.key.participant || msg.key.remoteJid);
            const senderNumber = nowsender.split('@')[0];
            const isGroup = sender.endsWith('@g.us');
            const botNumber = socket.user.id.split(':')[0];
            const isCreator = config.SUDO.includes(`${senderNumber}@s.whatsapp.net`) || 
                             config.SUDO.includes(`${senderNumber}@lid`) ||
                             senderNumber === config.OWNER_NUMBER ||
                             senderNumber === config.DEV;
            
            // Get message body
            let body = '';
            if (type === 'conversation') body = msg.message.conversation;
            else if (type === 'extendedTextMessage') body = msg.message.extendedTextMessage.text;
            else if (type === 'imageMessage' && msg.message.imageMessage.caption) body = msg.message.imageMessage.caption;
            else if (type === 'videoMessage' && msg.message.videoMessage.caption) body = msg.message.videoMessage.caption;
            
            if (!body) return;
            
            // Check for command
            const prefix = socket.userConfig.PREFIX || config.PREFIX;
            if (!body.startsWith(prefix)) return;
            
            const command = body.slice(prefix.length).trim().split(' ')[0].toLowerCase();
            const args = body.trim().split(/ +/).slice(1);
            
            // Save message to store
            await saveMessage(msg);
            await saveMessageCount(msg);
            
            // Execute command
            await executeCommand(
                socket, m, command, args, sender, isGroup,
                socket.userConfig, updateConfig, sanitizedNumber, isCreator
            );
        });
        
    } catch (error) {
        console.error('Pairing error:', error);
        if (res && !res.headersSent) {
            res.status(503).send({ error: 'Service Unavailable' });
        }
    }
}

// ==================== EXPRESS ROUTES ====================
app.use(express.json());
app.use(express.static(path.join(__dirname, 'lib')));

// Serve main.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'lib', 'main.html'));
});

// Pairing code endpoint
app.get('/code', async (req, res) => {
    const { number } = req.query;
    if (!number) {
        return res.status(400).send({ error: 'Number parameter is required' });
    }
    
    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    if (activeSockets.has(sanitizedNumber)) {
        return res.status(200).send({ status: 'already_connected', message: 'Already connected' });
    }
    
    await startBot(sanitizedNumber, res);
});

// Active sessions endpoint
app.get('/active', (req, res) => {
    res.status(200).send({
        count: activeSockets.size,
        numbers: Array.from(activeSockets.keys())
    });
});

// Ping endpoint
app.get('/ping', (req, res) => {
    res.status(200).send({
        status: 'active',
        bot: config.BOT_NAME,
        activeSessions: activeSockets.size
    });
});

// ==================== START SERVER ====================
async function init() {
    await connectMongoDB();
    await loadPlugins();
    
    app.listen(port, () => {
        console.log(`✅ Server running on port ${port}`);
        console.log(`🤖 Bot: ${config.BOT_NAME}`);
        console.log(`👑 Owner: ${config.OWNER_NAME}`);
    });
}

init();

// Graceful shutdown
process.on('exit', () => {
    activeSockets.forEach((socket, number) => {
        socket.ws.close();
        activeSockets.delete(number);
    });
    if (dbClient) dbClient.close();
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
});

module.exports = { startBot, app };
