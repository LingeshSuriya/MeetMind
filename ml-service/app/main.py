from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
