import torch
from transformers import pipeline

# We use a zero-shot classification model as an out-of-the-box solution
# without needing a pre-trained domain-specific dataset.
# The 'facebook/bart-large-mnli' is powerful, but for speed, we might use a smaller model 
# like 'cross-encoder/nli-distilroberta-base' or standard pipeline.
# We'll use facebook/bart-large-mnli for the MVP.
# Note: For real-time on CPU, it might be slightly slow, but it's acceptable for an MVP.
try:
    classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")
except Exception as e:
    print(f"Error loading model: {e}")
    classifier = None

CANDIDATE_LABELS = [
    "ACTION_ITEM",
    "DECISION",
    "DEADLINE",
    "DISCUSSION",
    "INFORMATION"
]

def classify_sentence(sentence: str) -> dict:
    """
    Classifies a sentence into one of the predefined categories.
    Returns a dictionary with label and confidence score.
    """
    if not classifier:
        return {"label": "OTHER", "confidence": 1.0}
    
    result = classifier(sentence, CANDIDATE_LABELS)
    best_label = result['labels'][0]
    best_score = result['scores'][0]
    
    # If the confidence is too low, we classify it as OTHER
    if best_score < 0.4:
        best_label = "OTHER"
        
    return {
        "label": best_label,
        "confidence": best_score
    }
