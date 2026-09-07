document.addEventListener('DOMContentLoaded', () => {
    const analyzeBtn = document.getElementById('analyzeBtn');
    const clearBtn = document.getElementById('clearBtn');
    const titleInput = document.getElementById('meetingTitle');
    const statusMsg = document.getElementById('statusMsg');

    function setStatus(msg, type) {
        statusMsg.textContent = msg;
        statusMsg.className = `status ${type}`;
    }

    analyzeBtn.addEventListener('click', async () => {
        const title = titleInput.value.trim() || "Google Meet " + new Date().toLocaleDateString();
        
        // Get the active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab.url.includes("meet.google.com")) {
            setStatus("Please open this on a Google Meet tab.", "error");
            return;
        }

        analyzeBtn.disabled = true;
        setStatus("Fetching transcript...", "");

        // Request transcript from content.js
        chrome.tabs.sendMessage(tab.id, { action: "GET_TRANSCRIPT" }, async (response) => {
            if (chrome.runtime.lastError) {
                setStatus("Error: Content script not found. Please refresh the Meet page.", "error");
                analyzeBtn.disabled = false;
                return;
            }

            const transcript = response?.transcript;
            
            if (!transcript || transcript.trim().length === 0) {
                setStatus("No transcript found. Did you turn on CC?", "error");
                analyzeBtn.disabled = false;
                return;
            }

            setStatus("Sending to MeetMind...", "");

            try {
                // Send to localhost backend
                const res = await fetch("http://localhost:3000/api/meetings/analyze", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        title: title,
                        transcript: transcript
                    })
                });

                if (!res.ok) {
                    throw new Error("Failed to reach MeetMind backend.");
                }

                const data = await res.json();
                setStatus(`Success! Meeting Analyzed. ID: ${data.meetingId}`, "success");
            } catch (err) {
                setStatus("Error: Is your MeetMind backend running?", "error");
            } finally {
                analyzeBtn.disabled = false;
            }
        });
    });

    clearBtn.addEventListener('click', async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab.url.includes("meet.google.com")) {
            chrome.tabs.sendMessage(tab.id, { action: "CLEAR_TRANSCRIPT" }, () => {
                setStatus("Transcript cleared.", "success");
            });
        }
    });
});
