document.addEventListener('DOMContentLoaded', () => {
    const analyzeBtn    = document.getElementById('analyzeBtn');
    const clearBtn      = document.getElementById('clearBtn');
    const debugBtn      = document.getElementById('debugBtn');
    const titleInput    = document.getElementById('meetingTitle');
    const statusMsg     = document.getElementById('statusMsg');
    const debugBox      = document.getElementById('debugBox');
    const captureCounter = document.getElementById('captureCounter');

    function setStatus(msg, type) {
        statusMsg.textContent = msg;
        statusMsg.className = `status ${type}`;
    }

    // Poll the count from the content script every 2s
    function refreshCount() {
        chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
            if (!tab || !tab.url.includes('meet.google.com')) return;
            chrome.tabs.sendMessage(tab.id, { action: 'GET_COUNT' }, (resp) => {
                if (chrome.runtime.lastError) return;
                if (resp && typeof resp.count === 'number') {
                    captureCounter.textContent = `${resp.count} line${resp.count !== 1 ? 's' : ''} captured`;
                    captureCounter.style.background = resp.count > 0 ? '#1a7a30' : '#0d7377';
                }
            });
        });
    }
    refreshCount();
    setInterval(refreshCount, 2000);

    // ── Analyze ────────────────────────────────────────────────────────────────
    analyzeBtn.addEventListener('click', async () => {
        const title = titleInput.value.trim() || 'Google Meet ' + new Date().toLocaleDateString();
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab || !tab.url.includes('meet.google.com')) {
            setStatus('Please open this on a Google Meet tab.', 'error');
            return;
        }

        analyzeBtn.disabled = true;
        setStatus('Fetching transcript…', '');

        chrome.tabs.sendMessage(tab.id, { action: 'GET_TRANSCRIPT' }, async (response) => {
            if (chrome.runtime.lastError) {
                setStatus('Error: Content script not found. Refresh the Meet page.', 'error');
                analyzeBtn.disabled = false;
                return;
            }

            const transcript = response?.transcript;
            if (!transcript || transcript.trim().length === 0) {
                setStatus('No transcript yet. Turn on CC and speak first!', 'error');
                analyzeBtn.disabled = false;
                return;
            }

            setStatus('Sending to MeetMind backend…', '');
            try {
                const res = await fetch('http://localhost:3000/api/meetings/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, transcript })
                });
                if (!res.ok) throw new Error('Backend returned ' + res.status);
                const data = await res.json();
                setStatus(`✅ Success! Meeting ID: ${data.meetingId}`, 'success');
            } catch (err) {
                setStatus('❌ Error: Is the MeetMind backend running on port 3000?', 'error');
            } finally {
                analyzeBtn.disabled = false;
            }
        });
    });

    // ── Clear ──────────────────────────────────────────────────────────────────
    clearBtn.addEventListener('click', async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.url.includes('meet.google.com')) {
            chrome.tabs.sendMessage(tab.id, { action: 'CLEAR_TRANSCRIPT' }, () => {
                setStatus('Transcript cleared.', 'success');
                captureCounter.textContent = '0 lines captured';
                captureCounter.style.background = '#0d7377';
            });
        }
    });

    // ── Debug ──────────────────────────────────────────────────────────────────
    debugBtn.addEventListener('click', async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.url.includes('meet.google.com')) {
            setStatus('Open this popup on a Google Meet tab first.', 'error');
            return;
        }
        debugBox.style.display = 'block';
        debugBox.textContent = 'Fetching debug info…';
        chrome.tabs.sendMessage(tab.id, { action: 'GET_DEBUG' }, (resp) => {
            if (chrome.runtime.lastError) {
                debugBox.textContent = 'Error: ' + chrome.runtime.lastError.message;
                return;
            }
            if (resp) {
                debugBox.textContent =
                    `Lines captured: ${resp.count}\n` +
                    `Containers found: ${resp.containersFound}\n` +
                    `Selectors tried:\n${resp.selectorResults}\n\n` +
                    `Last captured:\n${resp.lastFew || '(none)'}`;
            }
        });
    });
});
