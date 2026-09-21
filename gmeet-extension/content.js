console.log('MeetMind: Content script loaded.');

let transcript = [];
let lastText = '';
let lastSpeaker = '';

// ─── Restore persisted transcript from previous session ───────────────────────
chrome.storage.local.get(['meetmind_transcript'], function(res) {
    if (res.meetmind_transcript && Array.isArray(res.meetmind_transcript)) {
        transcript = res.meetmind_transcript;
        updateIndicator(transcript.length);
    }
});

function persist() {
    chrome.storage.local.set({ meetmind_transcript: transcript });
}

// ─── On-page indicator ────────────────────────────────────────────────────────
function addIndicator() {
    if (document.getElementById('meetmind-indicator')) return;
    const el = document.createElement('div');
    el.id = 'meetmind-indicator';
    el.style.cssText = [
        'position:fixed', 'bottom:80px', 'right:16px', 'z-index:99999',
        'background:#0d7377', 'color:#fff', 'font-size:12px',
        'padding:6px 14px', 'border-radius:20px', 'font-family:sans-serif',
        'pointer-events:none', 'box-shadow:0 2px 8px rgba(0,0,0,.5)',
        'transition:background .3s'
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
    if (!text || text.length < 3) return;
    if (text === lastText && speaker === lastSpeaker) return;

    if (text.startsWith(lastText) && lastText.length > 0
        && transcript.length > 0
        && transcript[transcript.length - 1].speaker === speaker) {
        // Caption streaming word-by-word — update in place
        transcript[transcript.length - 1].text = text;
    } else if (!lastText.startsWith(text)) {
        transcript.push({
            speaker: speaker || 'You',
            text: text,
            timestamp: new Date().toISOString()
        });
    }

    lastText = text;
    lastSpeaker = speaker;
    updateIndicator(transcript.length);
    persist();
}

// ─── PRIMARY: Web Speech API ──────────────────────────────────────────────────
// Captures YOUR microphone directly. Works even without CC turned on.
let recognition = null;
let recognitionActive = false;

function startSpeechRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
        console.warn('MeetMind: Web Speech API unavailable, using DOM fallback only.');
        return false;
    }

    recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = function() {
        recognitionActive = true;
        console.log('MeetMind: Speech recognition ACTIVE (microphone).');
        const ind = document.getElementById('meetmind-indicator');
        if (ind) ind.title = 'MeetMind is listening via microphone';
    };

    recognition.onresult = function(event) {
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
        } else if (interimText.trim()) {
            // Show interim preview in indicator
            const el = document.getElementById('meetmind-indicator');
            if (el) el.textContent = '\uD83C\uDFA4 ' + interimText.trim().slice(0, 40) + '...';
        }
    };

    recognition.onerror = function(event) {
        console.warn('MeetMind: Speech recognition error:', event.error);
        recognitionActive = false;
        // Auto-restart unless the tab closed or recognition was intentionally aborted
        if (event.error !== 'aborted' && event.error !== 'not-allowed') {
            setTimeout(startSpeechRecognition, 3000);
        }
        if (event.error === 'not-allowed') {
            console.error('MeetMind: Microphone permission denied. Using DOM fallback only.');
        }
    };

    recognition.onend = function() {
        recognitionActive = false;
        // Auto-restart to keep capturing continuously
        setTimeout(function() {
            if (!recognitionActive) startSpeechRecognition();
        }, 1000);
    };

    try {
        recognition.start();
        return true;
    } catch (e) {
        console.warn('MeetMind: Could not start speech recognition:', e);
        return false;
    }
}

// ─── SECONDARY: DOM-based CC observer ────────────────────────────────────────
// Catches OTHER speakers' captions displayed in Google Meet CC.
const CONTAINER_SELECTORS = [
    '[aria-label="Captions"]',
    '[aria-label="Caption"]',
    '[jsname="tgaKEf"]',
    '[jsname="hkU0g"]',
    '[jsname="Yv7E1b"]',
    '[aria-live="polite"]',
    '[aria-live="assertive"]'
];

const BLOCK_SELECTORS = [
    ['.zs7s8d', '.CNusmb'],   // Meet 2024-2025
    ['.CN2rsf', '.iTTPOb'],   // Older Meet
    ['span:first-of-type', 'span:last-of-type']  // generic
];

function tryExtractFromContainers() {
    CONTAINER_SELECTORS.forEach(function(sel) {
        document.querySelectorAll(sel).forEach(function(c) {
            extractFromContainer(c);
        });
    });
}

function extractFromContainer(container) {
    for (let i = 0; i < BLOCK_SELECTORS.length; i++) {
        const speakerEl = container.querySelector(BLOCK_SELECTORS[i][0]);
        const textEl    = container.querySelector(BLOCK_SELECTORS[i][1]);
        if (textEl && textEl.innerText && textEl.innerText.trim().length > 2) {
            const text    = textEl.innerText.trim();
            const speaker = speakerEl ? speakerEl.innerText.trim() : (lastSpeaker || 'Participant');
            if (speaker !== text) { handleNewText(speaker, text); return; }
        }
    }
    // Generic span-based fallback
    const spans = Array.from(container.querySelectorAll('span')).filter(function(s) {
        return s.offsetParent !== null && s.innerText && s.innerText.trim().length > 2;
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
    setInterval(tryExtractFromContainers, 1000);
    console.log('MeetMind: DOM fallback observer started.');
}

// ─── Init ─────────────────────────────────────────────────────────────────────
function init() {
    addIndicator();
    const speechOK = startSpeechRecognition();
    startDOMFallback();
    console.log('MeetMind: Initialised. Speech API: ' + (speechOK ? 'YES' : 'NO'));
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// ─── Message handlers ─────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'GET_TRANSCRIPT') {
        const formatted = transcript.map(function(t) {
            return t.speaker + ': ' + t.text;
        }).join('\n');
        sendResponse({ transcript: formatted, count: transcript.length });
    }
    if (request.action === 'GET_COUNT') {
        sendResponse({ count: transcript.length });
    }
    if (request.action === 'CLEAR_TRANSCRIPT') {
        transcript = []; lastText = ''; lastSpeaker = '';
        persist();
        updateIndicator(0);
        sendResponse({ success: true });
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
