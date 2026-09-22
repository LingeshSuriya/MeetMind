import re

# Try to use spaCy if the model is already installed, otherwise fall back to
# a simple regex sentence splitter. This keeps the service running even when
# there is no internet access to download en_core_web_sm.
_nlp = None

def _get_nlp():
    global _nlp
    if _nlp is None:
        try:
            import spacy
            _nlp = spacy.load("en_core_web_sm")
        except Exception:
            _nlp = None  # Will use regex fallback below
    return _nlp


def _regex_split(transcript: str):
    """
    Improved regex sentence splitter. Handles:
    - Standard sentence endings (. ! ?)
    - Abbreviations like 'Option A.' by requiring the next word to start with a capital
    - Newlines as natural sentence boundaries
    """
    # First split on newlines
    chunks = re.split(r'[\n\r]+', transcript)
    sentences = []
    for chunk in chunks:
        chunk = chunk.strip()
        if not chunk:
            continue
        # Split on sentence-ending punctuation followed by space + capital letter
        # This avoids splitting on abbreviations like "Option A." mid-sentence
        parts = re.split(r'(?<=[.!?])\s+(?=[A-Z])', chunk)
        sentences.extend(p.strip() for p in parts if p.strip() and len(p.strip()) > 5)
    return sentences


def segment_sentences(transcript: str) -> list:
    """
    Segments a raw transcript into a list of sentences.
    Uses spaCy if available, otherwise uses a regex fallback.
    """
    nlp = _get_nlp()
    if nlp is not None:
        doc = nlp(transcript)
        return [sent.text.strip() for sent in doc.sents if len(sent.text.strip()) > 5]
    return _regex_split(transcript)
