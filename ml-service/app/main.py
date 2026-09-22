from fastapi import FastAPI, HTTPException, File, UploadFile
from pydantic import BaseModel
from typing import List, Optional
import os

# Whisper is imported lazily so the service starts even when openai-whisper
# is not installed or the model has not been downloaded yet.
_whisper_model = None

def get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        try:
            import whisper as _whisper
        except ImportError:
            raise HTTPException(
                status_code=503,
                detail="openai-whisper is not installed. Run: pip install openai-whisper"
            )
        print("Loading Whisper model (may download ~140 MB on first run)...")
        _whisper_model = _whisper.load_model("base")
        print("Whisper model loaded.")
    return _whisper_model

from app.preprocessing.segmentation import segment_sentences
from app.classification.classifier import classify_sentence
from app.extraction.extractor import extract_action_item, extract_decision, extract_deadline, extract_entities

app = FastAPI(title="MeetMind NLP Service")

class TranscriptRequest(BaseModel):
    transcript: str

class ExtractedResult(BaseModel):
    actionItems: List[dict]
    decisions: List[dict]
    deadlines: List[dict]
    keyTopics: List[dict]
    participants: List[str]

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/analyze", response_model=ExtractedResult)
def analyze_transcript(request: TranscriptRequest):
    if not request.transcript or len(request.transcript.strip()) == 0:
        raise HTTPException(status_code=400, detail="Transcript is empty")
        
    sentences = segment_sentences(request.transcript)
    
    action_items = []
    decisions = []
    deadlines = []
    key_topics = []
    all_participants = set()
    
    for sentence in sentences:
        # 1. Classify
        classification = classify_sentence(sentence)
        label = classification["label"]
        conf = classification["confidence"]
        
        # 2. Extract Participants (for global participant list)
        entities = extract_entities(sentence)
        for p in entities["people"]:
            all_participants.add(p)
            
        # 3. Handle based on classification
        if label == "ACTION_ITEM":
            item = extract_action_item(sentence, conf)
            action_items.append(item)
        elif label == "DECISION":
            item = extract_decision(sentence, conf)
            decisions.append(item)
        elif label == "DEADLINE":
            item = extract_deadline(sentence, conf)
            deadlines.append(item)
        elif label == "DISCUSSION":
            # For discussion points, we extract them as key topics if confidence is high
            if conf > 0.6:
                key_topics.append({
                    "topic": sentence,
                    "confidence": conf
                })
                
    return {
        "actionItems": action_items,
        "decisions": decisions,
        "deadlines": deadlines,
        "keyTopics": key_topics,
        "participants": list(all_participants)
    }

@app.post("/transcribe", response_model=ExtractedResult)
async def transcribe_audio(file: UploadFile = File(...)):
    # Save uploaded file temporarily
    temp_path = f"temp_{file.filename}"
    with open(temp_path, "wb") as f:
        content = await file.read()
        f.write(content)
    # Run Whisper transcription (loads model on first call)
    result = get_whisper_model().transcribe(temp_path)
    transcript_text = result["text"]
    # Clean up temporary file
    os.remove(temp_path)
    # Reuse existing analysis pipeline
    request = TranscriptRequest(transcript=transcript_text)
    return analyze_transcript(request)

class SummaryResult(BaseModel):
    summary: str

@app.post("/summarize", response_model=SummaryResult)
def summarize_transcript(request: TranscriptRequest):
    """
    Extractive summarizer — works fully offline, no model download needed.
    Picks the opening sentence for context + up to 3 sentences that contain
    decision/action signals.
    """
    if not request.transcript or len(request.transcript.strip()) == 0:
        raise HTTPException(status_code=400, detail="Transcript is empty")

    sentences = segment_sentences(request.transcript)
    if not sentences:
        return {"summary": "No content to summarize."}

    key_signals = [
        'decided', 'agreed', 'approved', 'confirmed', 'action',
        'will', 'must', 'should', 'deadline', 'by', 'next',
        'assigned', 'responsible', 'follow up', 'task'
    ]
    key_sentences = [
        s for s in sentences
        if any(kw in s.lower() for kw in key_signals)
    ]

    summary_parts = [sentences[0]]   # always start with the opening sentence
    for s in key_sentences[:3]:
        if s not in summary_parts:
            summary_parts.append(s)

    return {"summary": " ".join(summary_parts)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
