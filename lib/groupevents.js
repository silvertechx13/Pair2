// Credits JawadTechX - KHAN-MD 💜

const { isJidGroup } = require('@whiskeysockets/baileys');
const config = require('../config');
const { lidToPhone } = require('./functions');

// Add delay between messages to avoid rate limits
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const GroupEvents = async (conn, update) => {
    try {
        // Null check for update and update.id
        if (!update || !update.id) return;
        
        const isGroup = isJidGroup(update.id);
        if (!isGroup) return;

        // Null check for update.participants
        if (!update.participants || !Array.isArray(update.participants) || update.participants.length === 0) return;

        // Get userConfig from connection object
        const userConfig = conn.userConfig || { ...config.DEFAULT_SETTINGS };

        // Get metadata with error handling for rate limits
        let metadata;
        try {
            metadata = await conn.groupMetadata(update.id);
        } catch (err) {
            // If rate limit hit, skip this group event completely
            if (err.message?.includes('rate-overlimit') || err.message?.includes('429')) {
                console.log(`[⏱️] Group event rate limit: ${update.id} - skipping`);
                return;
            }
            // Other errors: log and skip
            console.error('Group metadata error:', err.message);
            return;
        }
        
        // Null check for metadata
        if (!metadata) return;

        const participants = update.participants;
        const desc = metadata.desc || "No Description";
        const groupMembersCount = metadata.participants ? metadata.participants.length : 0;
        const timestamp = new Date().toLocaleString();

        // Process participants with delay to avoid rate limits
        for (let i = 0; i < participants.length; i++) {
            const user = participants[i];
            
            // Null check for user
            if (!user) continue;
            
            const lid = user.id || user;
            // Null check for lid
            if (!lid) continue;
            
            let userName;
            try {
                const userPN = await lidToPhone(conn, lid);
                userName = userPN || lid.split('@')[0] || "unknown";
            } catch (e) {
                userName = lid.split('@')[0] || "unknown";
            }

            try {
                if (update.action === "add" && userConfig.WELCOME === "true") {
                    const welcomeMessageTemplate = userConfig.WELCOME_MESSAGE || config.WELCOME_MESSAGE;
                    if (!welcomeMessageTemplate) continue;
                    
                    let welcomeMsg = welcomeMessageTemplate
                        .replace(/@user/g, `@${userName}`)
                        .replace(/@group/g, metadata.subject || "Group")
                        .replace(/@desc/g, desc)
                        .replace(/@count/g, groupMembersCount)
                        .replace(/@bot/g, userConfig.BOT_NAME || config.BOT_NAME || "Bot")
                        .replace(/@time/g, timestamp);

                    await conn.sendMessage(update.id, {
                        text: welcomeMsg,
                        mentions: [lid]
                    });
                    
                    // Add delay to prevent rate limits
                    await delay(1000);

                } else if (update.action === "remove" && userConfig.GOODBYE === "true") {
                    const goodbyeMessageTemplate = userConfig.GOODBYE_MESSAGE || config.GOODBYE_MESSAGE;
                    if (!goodbyeMessageTemplate) continue;
                    
                    let goodbyeMsg = goodbyeMessageTemplate
                        .replace(/@user/g, `@${userName}`)
                        .replace(/@group/g, metadata.subject || "Group")
                        .replace(/@desc/g, desc)
                        .replace(/@count/g, groupMembersCount)
                        .replace(/@bot/g, userConfig.BOT_NAME || config.BOT_NAME || "Bot")
                        .replace(/@time/g, timestamp);

                    await conn.sendMessage(update.id, {
                        text: goodbyeMsg,
                        mentions: [lid]
                    });
                    
                    await delay(1000);

                } else if (update.action === "demote" && userConfig.ADMIN_ACTION === "true") {
                    if (!update.author) continue;
                    
                    const authorLid = update.author;
                    let authorName;
                    try {
                        const authorPN = await lidToPhone(conn, authorLid);
                        authorName = authorPN || authorLid.split('@')[0] || "unknown";
                    } catch (e) {
                        authorName = authorLid.split('@')[0] || "unknown";
                    }
                    
                    await conn.sendMessage(update.id, {
                        text: `@${authorName} demoted @${userName}`,
                        mentions: [authorLid, lid]
                    });
                    
                    await delay(500);

                } else if (update.action === "promote" && userConfig.ADMIN_ACTION === "true") {
                    if (!update.author) continue;
                    
                    const authorLid = update.author;
                    let authorName;
                    try {
                        const authorPN = await lidToPhone(conn, authorLid);
                        authorName = authorPN || authorLid.split('@')[0] || "unknown";
                    } catch (e) {
                        authorName = authorLid.split('@')[0] || "unknown";
                    }
                    
                    await conn.sendMessage(update.id, {
                        text: `@${authorName} promoted @${userName}`,
                        mentions: [authorLid, lid]
                    });
                    
                    await delay(500);
                }
                
            } catch (err) {
                // Skip if rate limit hit for this message
                if (err.message?.includes('rate-overlimit') || err.message?.includes('429')) {
                    console.log(`[⏱️] Rate limit hit for ${update.action}, skipping`);
                    continue;
                }
                console.error(`Error sending ${update.action} message:`, err.message);
            }
        }
    } catch (err) {
        // Silent fail for outer errors
        if (!err.message?.includes('rate-overlimit')) {
            console.error('Group event error:', err.message);
        }
    }
};

module.exports = GroupEvents;
