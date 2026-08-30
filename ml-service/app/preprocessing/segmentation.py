import spacy

try:
    # Try loading the model, download it if it fails
    nlp = spacy.load("en_core_web_sm")
except OSError:
    from spacy.cli import download
    download("en_core_web_sm")
    nlp = spacy.load("en_core_web_sm")

def segment_sentences(transcript: str) -> list[str]:
    """
    Segments a raw transcript into a list of sentences.
    """
    doc = nlp(transcript)
    return [sent.text.strip() for sent in doc.sents if len(sent.text.strip()) > 5]
