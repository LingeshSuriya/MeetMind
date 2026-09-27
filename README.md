# 🧠 MeetMind — Google Meet Intelligence Platform

MeetMind captures, transcribes, and analyses Google Meet conversations in real-time using a Chrome extension + a local AI pipeline. It extracts action items, decisions, deadlines, and participants — then lets you review everything in a beautiful dashboard.

---

## ✨ Features

### Chrome Extension
- **Real-time speech capture** via Web Speech API (your mic) + DOM CC observer (other speakers)
- **Noise filtering** — ignores fan noise, clicks, short sounds (requires ≥3 words)
- **Smart deduplication** — prevents repeated lines from polling
- **Live transcript preview** — popup shows last 5 lines in real-time
- **Copy transcript** to clipboard with one click
- **Auto-open results** — after analysis, opens the dashboard tab automatically
- **Persistent storage** — transcript survives tab reloads via `chrome.storage.local`

### Frontend Dashboard (React + Vite)
| Page | Features |
|------|---------|
| **Dashboard** | Stats cards (meetings, action items, decisions, participants), 30s auto-refresh, skeleton loading |
| **New Meeting** | Paste transcript, upload `.txt`, drag & drop, 3 demo transcripts, live word count |
| **Meeting Analysis** | 4 tabs: Extracted Insights, Speaker View, Transcript, AI Summary |
| **Meeting History** | Searchable list, delete, open analysis |

### Meeting Analysis Tabs
- **📊 Extracted Insights** — Action items table (with status dropdown), Decisions, Deadlines, Participants, Discussion topics
- **🎙 Speaker View** — Visual bar chart of who spoke how much + keyword cloud
- **📄 Transcript** — Raw text with copy button
- **✨ AI Summary** — Extractive summary, regenerate button
- **⬇ Export .md** — Download full analysis as Markdown

### ML Service (FastAPI + Python)
- `POST /analyze` — NLP pipeline: sentence segmentation → classification → entity extraction
- `POST /summarize` — Offline extractive summarizer (no model download needed)
- **BART classifier** (from cache if available) with keyword fallback
- **spaCy NER** (if model installed) with regex fallback
- Starts instantly even without internet

---

## 🏗 Architecture

```
Chrome Extension (gmeet-extension/)
  content.js  → Web Speech API (mic) + DOM CC observer
  popup.js    → live preview, analyze, copy, open dashboard

Backend (backend/) — Express — port 3000
  POST /api/meetings/analyze   → ML service → PostgreSQL
  POST /api/meetings/:id/summarize
  GET  /api/meetings           → paginated list
  GET  /api/meetings/stats     → dashboard stats
  GET  /api/meetings/:id       → full meeting data
  PATCH /api/action-items/:id  → update status
  DELETE /api/meetings/:id

ML Service (ml-service/) — FastAPI — port 8000
  POST /analyze    → segment → classify → extract entities
  POST /summarize  → extractive keyword summarizer
  GET  /health

Frontend (frontend/) — React + Vite — port 5173
  /             → Dashboard
  /new          → New Meeting (upload/paste)
  /meetings/:id → Meeting Analysis
  /history      → Meeting History
```

---

## 🚀 Setup

### Prerequisites
- Node.js 18+
- Python 3.10+ (tested on 3.14)
- PostgreSQL 14+
- Google Chrome

### 1. Database
```sql
-- Create database and run schema
psql -U postgres -c "CREATE DATABASE meetmind;"
psql -U postgres -d meetmind -f database/schema.sql
```

### 2. Backend
```powershell
cd D:\MeetMind\backend
npm install
# Create .env file:
```
```env
DB_USER=postgres
DB_HOST=localhost
DB_NAME=meetmind
DB_PASSWORD=your_password
DB_PORT=5432
PORT=3000
ML_SERVICE_URL=http://localhost:8000
```

### 3. ML Service
```powershell
cd D:\MeetMind\ml-service
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
# Optional: install spaCy model for better NLP accuracy
python -m spacy download en_core_web_sm
```

### 4. Frontend
```powershell
cd D:\MeetMind\frontend
npm install
```

### 5. Chrome Extension
1. Open `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked** → select `D:\MeetMind\gmeet-extension`

---

## ▶️ Running

Open **4 terminals** (or tabs in Windows Terminal):

```powershell
# Terminal 1 — Backend
cd D:\MeetMind\backend
npm run dev

# Terminal 2 — ML Service
cd D:\MeetMind\ml-service
.\venv\Scripts\activate
uvicorn app.main:app --host 0.0.0.0 --port 8000

# Terminal 3 — Frontend
cd D:\MeetMind\frontend
npm run dev

# Then open: http://localhost:5173
```

---

## 🧪 Quick Test

```powershell
# Test ML service
Invoke-RestMethod http://localhost:8000/health

# Analyze a transcript
$body = @{
  title = "Test Meeting"
  transcript = "Alice will prepare the report by Friday. We decided to use PostgreSQL. Bob needs to review the code this week."
} | ConvertTo-Json
Invoke-RestMethod -Uri http://localhost:3000/api/meetings/analyze -Method POST -ContentType "application/json" -Body $body | ConvertTo-Json -Depth 5
```

---

## 📄 Demo Transcripts

Ready-to-use sample transcripts in `demo-transcripts/`:

| File | Description |
|------|-------------|
| `sprint-planning.txt` | Engineering sprint — 4 speakers, API spec, DB upgrade, staging |
| `product-review.txt` | Q3 roadmap — Firebase→OneSignal migration, dark mode deferral, API cost audit |
| `client-sync.txt` | Enterprise sales — EU data residency, SLA, pricing, go-live date |

Load them directly from the **New Meeting** page (click the demo card).

---

## 🔧 Troubleshooting

| Problem | Fix |
|---------|-----|
| Extension shows "0 lines" | Make sure CC is ON: ⋮ → Turn on captions. Also allow microphone when prompted |
| Fan noise being captured | Fixed in v1.1+ — noise gate requires ≥3 words per utterance |
| "Backend not running" error | Run `cd D:\MeetMind\backend && npm run dev` |
| ML service crashes on start | No internet needed — all modules have offline fallbacks |
| spaCy model missing | Run `python -m spacy download en_core_web_sm` in the venv, or ignore (regex fallback is used) |
| BART model slow | First run loads from cache (~1.5 GB). Subsequent runs are instant |
| 1386 lines in 2 minutes | Old bug (fixed). Reload the extension after updating |

---

## 🗂 Project Structure

```
MeetMind/
├── gmeet-extension/          # Chrome extension
│   ├── content.js            # Speech capture + DOM observer
│   ├── popup.html/js         # Extension popup UI
│   └── manifest.json
├── backend/                  # Express API
│   └── src/
│       ├── controllers/meetingsController.js
│       ├── routes/meetings.js
│       └── server.js
├── ml-service/               # FastAPI NLP service
│   └── app/
│       ├── main.py
│       ├── classification/classifier.py
│       ├── extraction/extractor.py
│       └── preprocessing/segmentation.py
├── frontend/                 # React dashboard
│   └── src/pages/
│       ├── Dashboard.jsx
│       ├── NewMeeting.jsx
│       ├── MeetingAnalysis.jsx
│       └── MeetingHistory.jsx
├── database/schema.sql
├── demo-transcripts/         # Sample .txt files
└── README.md
```

---

## 🔐 Environment Variables

Only the backend needs an `.env` file. No external API keys required — everything runs locally.

```env
# backend/.env
DB_USER=postgres
DB_HOST=localhost
DB_NAME=meetmind
DB_PASSWORD=your_password
DB_PORT=5432
PORT=3000
ML_SERVICE_URL=http://localhost:8000
```

---

## 📦 Tech Stack

| Layer | Tech |
|-------|------|
| Extension | Vanilla JS, Web Speech API, Chrome Extension MV3 |
| Backend | Node.js, Express, PostgreSQL (`pg`) |
| ML Service | Python, FastAPI, spaCy, HuggingFace Transformers (BART), openai-whisper |
| Frontend | React 18, Vite, Tailwind CSS, lucide-react, react-router-dom |

---

*Last updated: September 2026 — v1.1*
