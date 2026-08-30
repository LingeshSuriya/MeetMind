const TranscriptProvider = require('./TranscriptProvider');

/**
 * Concrete implementation for transcripts uploaded directly by the user.
 */
class UploadedTranscriptProvider extends TranscriptProvider {
    constructor(transcriptText) {
        super();
        this.transcriptText = transcriptText;
    }

    async getTranscript() {
        // Here we could add logic to read from a file if we passed a file path,
        // but for MVP we are just passing the raw text string.
        return this.transcriptText;
    }
}

module.exports = UploadedTranscriptProvider;
