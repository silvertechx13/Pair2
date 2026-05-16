const { isJidGroup } = require('@whiskeysockets/baileys');
const { loadMessage } = require('./store');
const config = require('../config');

const DeletedText = async (conn, mek, jid, deleteInfo, isGroup, update, userConfig) => {
    try {
        if (!conn || !mek || !jid) return;
        
        const messageContent = mek.message?.conversation || 
                              mek.message?.extendedTextMessage?.text || 
                              'Unknown content';
        
        const mentionedJid = [];
        if (isGroup && mek.key?.participant) {
            mentionedJid.push(mek.key.participant);
        } else if (!isGroup && mek.key?.remoteJid) {
            mentionedJid.push(mek.key.remoteJid);
        }
        
        // Send info card with rate limit handling
        if (deleteInfo) {
            try {
                await conn.sendMessage(
                    jid,
                    {
                        text: deleteInfo,
                        contextInfo: {
                            mentionedJid: mentionedJid.length ? mentionedJid : undefined,
                        },
                    },
                    { quoted: mek }
                ).catch(e => {
                    // Silent fail on rate limit
                    if (e.message?.includes('rate-overlimit') || e.message?.includes('429')) return;
                });
            } catch (e) {
                // Silent fail
            }
        }
        
        // Send content with rate limit handling
        if (messageContent) {
            try {
                await conn.sendMessage(
                    jid,
                    {
                        text: messageContent,
                        contextInfo: {
                            mentionedJid: mentionedJid.length ? mentionedJid : undefined,
                        },
                    },
                    { quoted: mek }
                ).catch(e => {
                    // Silent fail on rate limit
                    if (e.message?.includes('rate-overlimit') || e.message?.includes('429')) return;
                });
            } catch (e) {
                // Silent fail
            }
        }
    } catch (error) {
        // Silent fail - no logs
    }
};

const DeletedMedia = async (conn, mek, jid, deleteInfo, userConfig) => {
    try {
        if (!conn || !mek || !jid || !mek.message) return;
        
        const antideletedmek = structuredClone(mek.message);
        if (!antideletedmek) return;
        
        const messageType = Object.keys(antideletedmek)[0];
        if (!messageType) return;
        
        // Send info card with rate limit handling
        if (deleteInfo) {
            try {
                await conn.sendMessage(
                    jid,
                    {
                        text: deleteInfo,
                        contextInfo: {
                            mentionedJid: mek.sender ? [mek.sender] : undefined,
                        },
                    },
                    { quoted: mek }
                ).catch(e => {
                    // Silent fail on rate limit
                    if (e.message?.includes('rate-overlimit') || e.message?.includes('429')) return;
                });
            } catch (e) {
                // Silent fail
            }
        }
        
        // Send media with rate limit handling
        const mediaTypes = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage'];
        if (mediaTypes.includes(messageType)) {
            try {
                await conn.relayMessage(jid, antideletedmek, {}).catch(e => {
                    // Silent fail on rate limit
                    if (e.message?.includes('rate-overlimit') || e.message?.includes('429')) return;
                });
            } catch (e) {
                // Silent fail
            }
        }
    } catch (error) {
        // Silent fail - no logs
    }
};

const AntiDelete = async (conn, updates) => {
    try {
        // ⚡ INSTANT check - no I/O, no database
        if (!conn || !updates || !Array.isArray(updates)) return;
        
        // Get userConfig from connection object
        const userConfig = conn.userConfig || { ...config.DEFAULT_SETTINGS };
        
        // Check if ANTI_DELETE is enabled in userConfig
        if (!userConfig.ANTI_DELETE || userConfig.ANTI_DELETE !== "true") return;
        
        for (const update of updates) {
            try {
                if (!update?.key?.id) continue;
                if (!update.update || update.update.message !== null) continue;
                
                const store = await loadMessage(update.key.id).catch(() => null);
                if (!store?.message || !store?.jid) continue;
                
                const mek = store.message;
                const isGroup = isJidGroup(store.jid);
                
                // Determine destination - uses userConfig
                let jid;
                if (userConfig.ANTI_DELETE_PATH === "inbox") {
                    jid = conn.user?.id ? conn.user.id.split(':')[0] + '@s.whatsapp.net' : null;
                    if (!jid) continue;
                } else {
                    jid = isGroup ? store.jid : (update.key?.remoteJid || store.jid);
                    if (!jid) continue;
                }
                
                // Get sender
                let senderNumber = 'Unknown';
                if (isGroup && mek.key?.participant) {
                    senderNumber = mek.key.participant.split('@')[0];
                } else if (!isGroup && mek.key?.remoteJid) {
                    senderNumber = mek.key.remoteJid.split('@')[0];
                }
                
                const deleteInfo = `*⚠️ Deleted Message Alert 🚨*
*╭────⬡ 𝙏𝙝𝙚 𝙏𝙚𝙘𝙝𝙓 𝙈𝘿 ⬡────*
*├▢ SENDER :* @${senderNumber}
*├▢ ACTION :* Deleted a Message
*╰▢ MESSAGE :* Content Below 🔽`;
                
                // Check message type
                const hasText = mek.message?.conversation || mek.message?.extendedTextMessage?.text;
                
                if (hasText) {
                    await DeletedText(conn, mek, jid, deleteInfo, isGroup, update, userConfig);
                } else {
                    const messageKeys = Object.keys(mek.message || {});
                    const mediaTypes = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage'];
                    const isMedia = messageKeys.some(key => mediaTypes.includes(key));
                    
                    if (isMedia) {
                        await DeletedMedia(conn, mek, jid, deleteInfo, userConfig);
                    }
                }
            } catch (error) {
                // Silent fail on individual update errors
                continue;
            }
        }
    } catch (error) {
        // Silent fail - no logs
    }
};

module.exports = {
    DeletedText,
    DeletedMedia,
    AntiDelete,
};
