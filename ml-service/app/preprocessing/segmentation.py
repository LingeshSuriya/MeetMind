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
    Simple regex-based sentence splitter used when spaCy is unavailable.
    Handles common sentence endings: '.', '!', '?', and newlines.
    """
    # Split on sentence-ending punctuation or newlines
    raw = re.split(r'(?<=[.!?])\s+|[\n\r]+', transcript)
    return [s.strip() for s in raw if s.strip() and len(s.strip()) > 5]


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
