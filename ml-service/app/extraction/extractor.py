import spacy

try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    from spacy.cli import download
    download("en_core_web_sm")
    nlp = spacy.load("en_core_web_sm")

def extract_entities(sentence: str):
    """
    Extracts entities (People, Dates) from a sentence.
    Uses spaCy's NER (Named Entity Recognition).
    """
    doc = nlp(sentence)
    
    people = []
    dates = []
    
    for ent in doc.ents:
        if ent.label_ == "PERSON":
            people.append(ent.text)
        elif ent.label_ == "DATE" or ent.label_ == "TIME":
            dates.append(ent.text)
            
    return {
        "people": list(set(people)), # Unique people
        "dates": list(set(dates))    # Unique dates
    }

def extract_action_item(sentence: str, confidence: float):
    """
    Extracts details for an ACTION_ITEM.
    """
    entities = extract_entities(sentence)
    
    # Heuristic: The task is usually the sentence itself, minus the names/dates if we want to be fancy.
    # For MVP, we'll keep the full sentence as the task to avoid stripping context.
    
    person = entities['people'][0] if entities['people'] else "Unknown"
    # If there are multiple people, we just join them
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
