console.log('MeetMind: Content script loaded.');

let transcript = [];
let lastText = '';
let lastSpeaker = '';

// ─── Extension context guard ──────────────────────────────────────────────────
function isContextValid() {
    try { return !!chrome.runtime.id; } catch (e) { return false; }
}

// ─── Noise filter ─────────────────────────────────────────────────────────────
// Prevents fan noise, clicks, single-word coughs from being saved.
function isNoise(text) {
    const t = text.trim();
    if (t.length < 12) return true;                    // too short
    const words = t.split(/\s+/).filter(w => w.length > 0);
    if (words.length < 3) return true;                 // fewer than 3 words
    // All same character repeated (keyboard mash / noise artifact)
    if (/^(.)\1+$/.test(t)) return true;
    return false;
}

// ─── Restore persisted transcript ────────────────────────────────────────────
if (isContextValid()) {
    chrome.storage.local.get(['meetmind_transcript'], function(res) {
        if (chrome.runtime.lastError) return;
        if (res.meetmind_transcript && Array.isArray(res.meetmind_transcript)) {
            transcript = res.meetmind_transcript;
            updateIndicator(transcript.length);
        }
    });
}

function persist() {
    if (!isContextValid()) return;
    try { chrome.storage.local.set({ meetmind_transcript: transcript }); } catch (e) {}
    syncToLive();
}

function syncToLive() {
    // Send to backend's live session memory (fire and forget)
    try {
        const formatted = transcript.map(t => t.speaker + ': ' + t.text).join('\n');
        fetch('http://localhost:3000/api/meetings/live', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transcript: formatted, count: transcript.length })
        }).catch(() => {});
    } catch (e) {}
}

// ─── On-page indicator ────────────────────────────────────────────────────────
function addIndicator() {
    if (document.getElementById('meetmind-indicator')) return;
    const el = document.createElement('div');
    el.id = 'meetmind-indicator';
    el.style.cssText = [
        'position:fixed','bottom:80px','right:16px','z-index:99999',
        'background:#0d7377','color:#fff','font-size:12px',
        'padding:6px 14px','border-radius:20px','font-family:sans-serif',
        'pointer-events:none','box-shadow:0 2px 8px rgba(0,0,0,.5)',
        'transition:background .3s','max-width:260px',
        'white-space:nowrap','overflow:hidden','text-overflow:ellipsis'
    ].join(';');
    el.textContent = 'MeetMind: 0 lines captured';
    document.body.appendChild(el);
}

function updateIndicator(count) {
    const el = document.getElementById('meetmind-indicator');
    if (!el) return;
    el.textContent = 'MeetMind: ' + count + ' line' + (count !== 1 ? 's' : '') + ' captured';
    el.style.background = count > 0 ? '#1a7a30' : '#0d7377';
}

// ─── Core handler ─────────────────────────────────────────────────────────────
function handleNewText(speaker, text) {
    if (!text) return;
    text = text.trim();
    if (isNoise(text)) return;                         // ← noise gate
    if (text === lastText && speaker === lastSpeaker) return;

    // Dedup: check if any of last 3 lines already contain this text
    const recent = transcript.slice(-3);
    if (recent.some(r => r.text === text || text.startsWith(r.text) || r.text.startsWith(text))) {
        // Update in-place if same speaker and text is growing
        const last = transcript[transcript.length - 1];
        if (last && last.speaker === speaker && text.startsWith(last.text)) {
            last.text = text;
            lastText = text;
            return;
        }
        if (recent.some(r => r.text === text)) return;   // exact dupe
    }

    transcript.push({ speaker: speaker || 'You', text, timestamp: new Date().toISOString() });
    lastText = text;
    lastSpeaker = speaker;
    updateIndicator(transcript.length);
    persist();
}

// ─── PRIMARY: Web Speech API ──────────────────────────────────────────────────
let recognition = null;
let recognitionActive = false;
let networkErrorCount = 0;
const MAX_NETWORK_RETRIES = 3;

function startSpeechRecognition() {
    if (!isContextValid()) return false;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
        console.warn('MeetMind: Web Speech API unavailable.');
        return false;
    }

    recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = function() {
        recognitionActive = true;
        networkErrorCount = 0;
        const ind = document.getElementById('meetmind-indicator');
        if (ind) ind.title = 'Listening via microphone';
    };

    recognition.onresult = function(event) {
        if (!isContextValid()) return;
        let finalText = '';
        let interimText = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
                finalText += event.results[i][0].transcript;
            } else {
                interimText += event.results[i][0].transcript;
            }
        }
        if (finalText.trim()) {
            handleNewText('You', finalText.trim());
        } else if (interimText.trim() && interimText.trim().length > 5) {
            const el = document.getElementById('meetmind-indicator');
            if (el) el.textContent = '\uD83C\uDFA4 ' + interimText.trim().slice(0, 45) + '...';
        }
    };

    recognition.onerror = function(event) {
        recognitionActive = false;
        switch (event.error) {
            case 'not-allowed':
                console.warn('MeetMind: Mic permission denied. DOM fallback only.');
                break;
            case 'network':
                networkErrorCount++;
                if (networkErrorCount <= MAX_NETWORK_RETRIES) {
                    setTimeout(startSpeechRecognition, 10000);
                } else {
                    console.warn('MeetMind: Speech API unreachable. DOM fallback only.');
                }
                break;
            case 'no-speech':
            case 'aborted':
                break; // handled silently by onend restart
            default:
                setTimeout(startSpeechRecognition, 5000);
        }
    };

    recognition.onend = function() {
        recognitionActive = false;
        if (isContextValid() && networkErrorCount < MAX_NETWORK_RETRIES) {
            setTimeout(function() {
                if (!recognitionActive && isContextValid()) startSpeechRecognition();
            }, 1000);
        }
    };

    try { recognition.start(); return true; }
    catch (e) { console.warn('MeetMind: Could not start SR:', e); return false; }
}

// ─── SECONDARY: DOM-based CC observer ────────────────────────────────────────
const CONTAINER_SELECTORS = [
    '[aria-label="Captions"]', '[aria-label="Caption"]',
    '[jsname="tgaKEf"]', '[jsname="hkU0g"]', '[jsname="Yv7E1b"]',
    '[aria-live="polite"]', '[aria-live="assertive"]'
];
const BLOCK_SELECTORS = [
    ['.zs7s8d', '.CNusmb'], ['.CN2rsf', '.iTTPOb'],
    ['span:first-of-type', 'span:last-of-type']
];

function tryExtractFromContainers() {
    if (!isContextValid()) return;
    CONTAINER_SELECTORS.forEach(function(sel) {
        document.querySelectorAll(sel).forEach(extractFromContainer);
    });
}

function extractFromContainer(container) {
    for (let i = 0; i < BLOCK_SELECTORS.length; i++) {
        const speakerEl = container.querySelector(BLOCK_SELECTORS[i][0]);
        const textEl    = container.querySelector(BLOCK_SELECTORS[i][1]);
        if (textEl && textEl.innerText && textEl.innerText.trim().length > 10) {
            const text    = textEl.innerText.trim();
            const speaker = speakerEl ? speakerEl.innerText.trim() : (lastSpeaker || 'Participant');
            if (speaker !== text) { handleNewText(speaker, text); return; }
        }
    }
    const spans = Array.from(container.querySelectorAll('span')).filter(function(s) {
        return s.offsetParent !== null && s.innerText && s.innerText.trim().length > 10;
    });
    if (spans.length >= 2) {
        const text = spans[spans.length - 1].innerText.trim();
        const spk  = spans[0].innerText.trim();
        if (spk !== text) handleNewText(spk, text);
    } else if (spans.length === 1) {
        handleNewText(lastSpeaker || 'Participant', spans[0].innerText.trim());
    }
}

function startDOMFallback() {
    const obs = new MutationObserver(function() {
        requestAnimationFrame(tryExtractFromContainers);
    });
    obs.observe(document.body, { childList: true, subtree: true, characterData: true });
    setInterval(tryExtractFromContainers, 1500);
}

// ─── Init ─────────────────────────────────────────────────────────────────────
function init() {
    addIndicator();
    startSpeechRecognition();
    startDOMFallback();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// ─── Message handlers ─────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (!isContextValid()) return;

    if (request.action === 'GET_TRANSCRIPT') {
        const formatted = transcript.map(function(t) {
            return t.speaker + ': ' + t.text;
        }).join('\n');
        sendResponse({ transcript: formatted, count: transcript.length, raw: transcript });
    }
    if (request.action === 'GET_COUNT') {
        sendResponse({ count: transcript.length });
    }
    if (request.action === 'CLEAR_TRANSCRIPT') {
        transcript = []; lastText = ''; lastSpeaker = '';
        persist(); updateIndicator(0);
        sendResponse({ success: true });
    }
    if (request.action === 'GET_PREVIEW') {
        // Return last N lines for popup preview
        const n = request.n || 5;
        sendResponse({ lines: transcript.slice(-n), total: transcript.length });
    }
    if (request.action === 'GET_DEBUG') {
        const results = CONTAINER_SELECTORS.map(function(sel) {
            const els = document.querySelectorAll(sel);
            const sample = els.length > 0 ? els[0].innerText.slice(0, 60).replace(/\n/g, ' ') : '';
            return '  ' + sel + ': ' + els.length + (sample ? ' -> "' + sample + '"' : '');
        }).join('\n');
        sendResponse({
            count: transcript.length,
            speechAPIActive: recognitionActive,
            networkErrors: networkErrorCount,
            containersFound: CONTAINER_SELECTORS.reduce(function(a, s) {
                return a + document.querySelectorAll(s).length;
            }, 0),
            selectorResults: results,
            lastFew: transcript.slice(-3).map(function(t) {
                return t.speaker + ': ' + t.text;
            }).join('\n')
        });
    }
    return true;
});
