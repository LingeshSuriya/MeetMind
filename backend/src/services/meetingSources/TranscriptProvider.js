/**
 * Abstract base class for transcript providers.
 * This architecture allows us to easily add Google Meet integration later
 * without changing the core logic of the application.
 */
class TranscriptProvider {
    constructor() {
        if (this.constructor === TranscriptProvider) {
            throw new Error("Abstract classes can't be instantiated.");
        }
    }

    /**
     * Retrieves the transcript.
     * @returns {Promise<string>} The meeting transcript
     */
    async getTranscript() {
        throw new Error("Method 'getTranscript()' must be implemented.");
    }
}

module.exports = TranscriptProvider;
