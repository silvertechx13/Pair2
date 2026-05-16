const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;

class UniversalConverter {
    constructor() {
        this.tempDir = path.join(__dirname, '../temp');
        this.ensureTempDir();
        this.logFile = path.join(__dirname, '../logs/converter.log');
        this.setupLogging();
    }

    ensureTempDir() {
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }

    setupLogging() {
        if (!fs.existsSync(path.dirname(this.logFile))) {
            fs.mkdirSync(path.dirname(this.logFile), { recursive: true });
        }
    }

    async logError(error) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ERROR: ${error.stack || error}\n`;
        fs.appendFileSync(this.logFile, logMessage);
    }

    async cleanFile(file) {
        if (file && fs.existsSync(file)) {
            try {
                await fs.promises.unlink(file);
            } catch (cleanError) {
                await this.logError(cleanError);
            }
        }
    }

    async convert(buffer, args, ext, ext2) {
        const timestamp = Date.now();
        const inputPath = path.join(this.tempDir, `${timestamp}.${ext}`);
        const outputPath = path.join(this.tempDir, `${timestamp}.${ext2}`);

        try {
            await fs.promises.writeFile(inputPath, buffer);
            
            return new Promise((resolve, reject) => {
                const ffmpeg = spawn(ffmpegPath, [
                    '-y',
                    '-i', inputPath,
                    ...args,
                    outputPath
                ], { timeout: 900000 }); // 15 minutes timeout

                let errorOutput = '';
                ffmpeg.stderr.on('data', (data) => {
                    const errorData = data.toString();
                    errorOutput += errorData;
                    console.error('FFmpeg Error:', errorData);
                });

                ffmpeg.on('close', async (code) => {
                    await this.cleanFile(inputPath);
                    
                    if (code !== 0) {
                        await this.logError(new Error(`FFmpeg process exited with code ${code}\n${errorOutput}`));
                        await this.cleanFile(outputPath);
                        return reject(new Error(`Conversion failed (code ${code}). Check logs for details.`));
                    }

                    try {
                        const result = await fs.promises.readFile(outputPath);
                        await this.cleanFile(outputPath);
                        resolve(result);
                    } catch (readError) {
                        await this.logError(readError);
                        reject(new Error('Failed to read converted file'));
                    }
                });

                ffmpeg.on('error', async (err) => {
                    await this.logError(err);
                    reject(new Error('FFmpeg process failed to start'));
                });
            });
        } catch (err) {
            await this.logError(err);
            await this.cleanFile(inputPath);
            await this.cleanFile(outputPath);
            throw err;
        }
    }

    // Convert sticker to image (WebP to PNG)
    async stickerToImage(stickerBuffer) {
        return this.convert(stickerBuffer, [
            '-vf', 'scale=512:512:flags=lanczos', // High quality scaling
            '-frames:v', '1'                      // Single frame
        ], 'webp', 'png');
    }

    // Convert to MP3 (lowest quality)
    toAudio(buffer, ext) {
        return this.convert(buffer, [
            '-vn',                          // No video
            '-ac', '1',                     // Mono audio (reduces size)
            '-ar', '22050',                 // Lower sample rate
            '-b:a', '64k',                  // Low bitrate
            '-acodec', 'libmp3lame',        // MP3 codec
            '-f', 'mp3'                     // Force MP3 format
        ], ext, 'mp3');
    }

    // Convert to PTT (voice message - optimized for voice)
    toPTT(buffer, ext) {
        return this.convert(buffer, [
            '-vn',                          // No video
            '-c:a', 'libopus',              // OPUS codec
            '-b:a', '24k',                  // Very low bitrate for voice
            '-ac', '1',                     // Mono
            '-ar', '16000',                 // Voice-optimized sample rate
            '-vbr', 'on',                   // Variable bitrate
            '-compression_level', '10',     // Max compression
            '-application', 'voip',         // Optimized for voice
            '-f', 'ogg'                     // OGG container
        ], ext, 'ogg');
    }
}

module.exports = new UniversalConverter();
