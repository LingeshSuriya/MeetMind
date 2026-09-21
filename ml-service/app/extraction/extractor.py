import re

# Try to use spaCy NER if the model is installed; otherwise fall back to
# simple regex-based name and date extraction.
_nlp = None

def _get_nlp():
    global _nlp
    if _nlp is None:
        try:
            import spacy
            _nlp = spacy.load("en_core_web_sm")
        except Exception:
            _nlp = None
    return _nlp


# ── Regex fallbacks ────────────────────────────────────────────────────────────

# Common deadline / date keywords
_DATE_PATTERNS = re.compile(
    r'\b(?:by|before|until|on|next|this)?\s*'
    r'(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|'
    r'january|february|march|april|may|june|july|august|september|october|november|december|'
    r'today|tomorrow|tonight|eod|eow|weekend|week|month|quarter|year|'
    r'\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?|\d{1,2}(?:st|nd|rd|th)?)',
    re.IGNORECASE
)

# Capitalised words that look like names (heuristic: Title Case, 2–15 chars, not sentence-start)
_NAME_PATTERN = re.compile(r'\b([A-Z][a-z]{1,14}(?:\s[A-Z][a-z]{1,14})?)\b')

# Words to exclude from name detection (common sentence-start words, acronyms, etc.)
_NAME_STOPWORDS = {
    "The", "This", "That", "These", "Those", "There", "Their",
    "We", "Our", "I", "You", "He", "She", "It", "They",
    "And", "But", "Or", "So", "If", "When", "After", "Before",
    "Please", "Let", "Make", "Also", "However", "Please",
    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday",
    "Saturday", "Sunday", "January", "February", "March", "April",
    "May", "June", "July", "August", "September", "October", "November", "December"
}


def extract_entities(sentence: str):
    """
    Extracts people and dates from a sentence.
    Uses spaCy NER when available, regex otherwise.
    """
    nlp = _get_nlp()

    if nlp is not None:
        doc = nlp(sentence)
        people = list({ent.text for ent in doc.ents if ent.label_ == "PERSON"})
        dates  = list({ent.text for ent in doc.ents if ent.label_ in ("DATE", "TIME")})
        return {"people": people, "dates": dates}

    # ── Regex fallback ────────────────────────────────────────────────────────
    names = [
        m.group(0) for m in _NAME_PATTERN.finditer(sentence)
        if m.group(0) not in _NAME_STOPWORDS
    ]
    dates = [m.group(0) for m in _DATE_PATTERNS.finditer(sentence)]
    return {"people": list(set(names)), "dates": list(set(dates))}


def extract_action_item(sentence: str, confidence: float):
    entities = extract_entities(sentence)
    person = entities['people'][0] if entities['people'] else "Unknown"
    if len(entities['people']) > 1:
        person = ", ".join(entities['people'])
    deadline = entities['dates'][0] if entities['dates'] else None
    if len(entities['dates']) > 1:
        deadline = ", ".join(entities['dates'])
    return {
        "type": "ACTION_ITEM",
        "person": person,
        "task": sentence,
        "deadline": deadline,
        "confidence": confidence
    }


def extract_decision(sentence: str, confidence: float):
    return {
        "type": "DECISION",
        "decision": sentence,
        "confidence": confidence
    }


def extract_deadline(sentence: str, confidence: float):
    entities = extract_entities(sentence)
    date = entities['dates'][0] if entities['dates'] else "Unknown date"
    if len(entities['dates']) > 1:
        date = ", ".join(entities['dates'])
    return {
        "type": "DEADLINE",
        "description": sentence,
        "date": date,
        "confidence": confidence
    }
