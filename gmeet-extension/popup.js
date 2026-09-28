document.addEventListener('DOMContentLoaded', () => {
    const analyzeBtn    = document.getElementById('analyzeBtn');
    const clearBtn      = document.getElementById('clearBtn');
    const debugBtn      = document.getElementById('debugBtn');
    const viewDashBtn   = document.getElementById('viewDashBtn');
    const copyBtn       = document.getElementById('copyBtn');
    const titleInput    = document.getElementById('meetingTitle');
    const statusMsg     = document.getElementById('statusMsg');
    const debugBox      = document.getElementById('debugBox');
    const captureCounter = document.getElementById('captureCounter');
    const livePreview   = document.getElementById('livePreview');

    const BACKEND = 'http://localhost:3000';
    const FRONTEND = 'http://localhost:5173';

    function setStatus(msg, type) {
        statusMsg.textContent = msg;
        statusMsg.className = type;   // 'error' | 'success' | 'info' | ''
        if (!type) statusMsg.style.display = 'none';
    }

    // ── Title Persistence ──────────────────────────────────────────────────────
    chrome.storage.local.get(['meetmind_title'], (res) => {
        if (res.meetmind_title) titleInput.value = res.meetmind_title;
    });
    titleInput.addEventListener('input', (e) => {
        chrome.storage.local.set({ meetmind_title: e.target.value });
    });

    // ── Live preview renderer ──────────────────────────────────────────────────
    function renderPreview(lines) {
        if (!lines || lines.length === 0) {
            livePreview.innerHTML = '<div class="preview-empty">Nothing captured yet. Start speaking in Meet.</div>';
            return;
        }
        livePreview.innerHTML = lines.map(l =>
            `<div class="preview-line">
                <span class="spk">${escHtml(l.speaker)}:</span>
                <span class="txt">${escHtml(l.text)}</span>
            </div>`
        ).join('');
        // Auto-scroll to bottom
        livePreview.scrollTop = livePreview.scrollHeight;
    }

    function escHtml(str) {
        return String(str)
            .replace(/&/g,'&amp;')
            .replace(/</g,'&lt;')
            .replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;');
    }

    // ── Poll count + preview every 2s ────────────────────────────────────────
    function refreshUI() {
        chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
            if (!tab || !tab.url || !tab.url.includes('meet.google.com')) {
                captureCounter.textContent = 'Not in Meet';
                captureCounter.className = 'badge';
                return;
            }

            // Get preview (last 5 lines)
            chrome.tabs.sendMessage(tab.id, { action: 'GET_PREVIEW', n: 5 }, (resp) => {
                if (chrome.runtime.lastError || !resp) return;
                captureCounter.textContent = resp.total + ' line' + (resp.total !== 1 ? 's' : '');
                captureCounter.className = resp.total > 0 ? 'badge active' : 'badge';
                renderPreview(resp.lines);
            });
        });
    }

    refreshUI();
    setInterval(refreshUI, 2000);

    // ── Copy all ──────────────────────────────────────────────────────────────
    copyBtn.addEventListener('click', async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.url || !tab.url.includes('meet.google.com')) {
            setStatus('Open this on a Google Meet tab first.', 'error'); return;
        }
        chrome.tabs.sendMessage(tab.id, { action: 'GET_TRANSCRIPT' }, (resp) => {
            if (chrome.runtime.lastError || !resp || !resp.transcript) {
                setStatus('No transcript to copy yet.', 'error'); return;
            }
            navigator.clipboard.writeText(resp.transcript)
                .then(() => setStatus('✅ Transcript copied to clipboard!', 'success'))
                .catch(() => setStatus('Copy failed — try manually.', 'error'));
        });
    });

    // ── Dashboard ─────────────────────────────────────────────────────────────
    viewDashBtn.addEventListener('click', () => {
        chrome.tabs.create({ url: FRONTEND });
    });

    // ── Analyze ───────────────────────────────────────────────────────────────
    analyzeBtn.addEventListener('click', async () => {
        const title = titleInput.value.trim() || 'Google Meet ' + new Date().toLocaleDateString();
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab || !tab.url || !tab.url.includes('meet.google.com')) {
            setStatus('Open this popup on a Google Meet tab.', 'error'); return;
        }

        analyzeBtn.disabled = true;
        setStatus('Fetching transcript…', 'info');

        chrome.tabs.sendMessage(tab.id, { action: 'GET_TRANSCRIPT' }, async (response) => {
            if (chrome.runtime.lastError) {
                setStatus('Content script not found — refresh the Meet page.', 'error');
                analyzeBtn.disabled = false; return;
            }

            const transcript = response?.transcript;
            if (!transcript || transcript.trim().length === 0) {
                setStatus('No transcript yet — speak in the meeting first!', 'error');
                analyzeBtn.disabled = false; return;
            }

            const wordCount = transcript.split(/\s+/).length;
            if (wordCount < 10) {
                setStatus(`Only ${wordCount} words captured — keep speaking!`, 'error');
                analyzeBtn.disabled = false; return;
            }

            setStatus('Sending to MeetMind…', 'info');
            try {
                const res = await fetch(`${BACKEND}/api/meetings/analyze`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, transcript })
                });
                if (!res.ok) throw new Error('Backend returned ' + res.status);
                const data = await res.json();
                setStatus('✅ Saved! Opening results…', 'success');
                // Open the analysis page in a new tab
                chrome.tabs.create({ url: `${FRONTEND}/meetings/${data.meetingId}` });
            } catch (err) {
                if (err.message.includes('Failed to fetch')) {
                    setStatus('❌ Cannot reach backend. Is it running?\n→ cd D:\\MeetMind\\backend && npm run dev', 'error');
                } else {
                    setStatus('❌ Error: ' + err.message, 'error');
                }
            } finally {
                analyzeBtn.disabled = false;
            }
        });
    });

    // ── Clear ─────────────────────────────────────────────────────────────────
    clearBtn.addEventListener('click', async () => {
        if (!confirm('Clear all captured transcript lines?')) return;
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.url && tab.url.includes('meet.google.com')) {
            chrome.tabs.sendMessage(tab.id, { action: 'CLEAR_TRANSCRIPT' }, () => {
                setStatus('Transcript cleared.', 'success');
                captureCounter.textContent = '0 lines';
                captureCounter.className = 'badge';
                renderPreview([]);
                chrome.storage.local.remove('meetmind_title');
                titleInput.value = '';
            });
        }
    });

    // ── Debug ─────────────────────────────────────────────────────────────────
    debugBtn.addEventListener('click', async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.url || !tab.url.includes('meet.google.com')) {
            setStatus('Open this popup on a Google Meet tab.', 'error'); return;
        }
        debugBox.style.display = debugBox.style.display === 'none' ? 'block' : 'none';
        if (debugBox.style.display === 'none') return;
        debugBox.textContent = 'Fetching…';
        chrome.tabs.sendMessage(tab.id, { action: 'GET_DEBUG' }, (resp) => {
            if (chrome.runtime.lastError) {
                debugBox.textContent = 'Error: ' + chrome.runtime.lastError.message; return;
            }
            if (resp) {
                debugBox.textContent =
                    `Lines captured: ${resp.count}\n` +
                    `Speech API active: ${resp.speechAPIActive ? 'YES' : 'NO'}\n` +
                    `Network errors: ${resp.networkErrors}\n` +
                    `Containers found: ${resp.containersFound}\n` +
                    `Selectors tried:\n${resp.selectorResults}\n\n` +
                    `Last captured:\n${resp.lastFew || '(none)'}`;
            }
        });
    });
});
