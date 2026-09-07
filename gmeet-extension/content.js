console.log("MeetMind: Content script loaded.");

let transcript = [];
let currentSpeaker = "";
let currentPhrase = "";

// Google Meet uses heavily obfuscated class names that change occasionally.
// A common pattern for closed captions container is an element added dynamically.
// We will observe the body and look for elements that look like speech.

const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    
                    // The speaker's name often has this class or similar. We will do a broad check.
                    // Another reliable way is checking if the element contains a speaker image and text.
                    const nameEl = node.querySelector('.CN2rsf'); 
                    const textEl = node.querySelector('.iTTPOb'); 
                    
                    if (nameEl && nameEl.innerText) {
                        currentSpeaker = nameEl.innerText.trim();
                    }
                    
                    if (textEl && textEl.innerText) {
                        const newText = textEl.innerText.trim();
                        // Google Meet CC appends text in chunks.
                        // For simplicity in this MVP, we capture the final text when the node is removed/updated 
                        // or just append distinct chunks.
                        
                        // We will just keep track of the most recent complete sentence per speaker.
                        // A more robust implementation handles the exact CC DOM lifecycle.
                        handleNewText(currentSpeaker, newText);
                    }
                }
            });
        } else if (mutation.type === 'characterData' || mutation.type === 'childList') {
            // Text updating within an existing caption block
            const target = mutation.target;
            const parent = target.parentElement;
            if (parent && parent.classList && parent.classList.contains('iTTPOb')) {
                // Find the associated speaker name in the parent structure
                const container = parent.closest('.Tmb7Fd');
                let speaker = "Unknown";
                if (container) {
                    const nameEl = container.querySelector('.CN2rsf');
                    if (nameEl) speaker = nameEl.innerText.trim();
                }
                handleNewText(speaker, parent.innerText.trim());
            }
        }
    });
});

// We store the last processed text to avoid duplicate spam from DOM updates
let lastProcessed = "";

function handleNewText(speaker, text) {
    if (!text || text.length < 3) return;
    if (text === lastProcessed) return;
    
    // Check if the current transcript already ends with this chunk (Meet updates DOM dynamically)
    // For simplicity, we just push it if it's substantially new.
    
    // In a production extension, you wait for the caption block to disappear (meaning the sentence finished)
    // Here we use a simpler heuristic:
    if (!lastProcessed.includes(text) && !text.includes(lastProcessed)) {
        transcript.push({
            speaker: speaker || "Participant",
            text: text,
            timestamp: new Date().toISOString()
        });
    } else if (text.length > lastProcessed.length) {
        // Updating the last entry because the caption got longer (more words spoken)
        if (transcript.length > 0 && transcript[transcript.length - 1].speaker === speaker) {
            transcript[transcript.length - 1].text = text;
        }
    }
    
    lastProcessed = text;
}

// Start observing
observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
});

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "GET_TRANSCRIPT") {
        // Format the transcript as a single string
        const formatted = transcript.map(t => `${t.speaker}: ${t.text}`).join('\n');
        sendResponse({ transcript: formatted });
    }
    if (request.action === "CLEAR_TRANSCRIPT") {
        transcript = [];
        lastProcessed = "";
        sendResponse({ success: true });
    }
});
