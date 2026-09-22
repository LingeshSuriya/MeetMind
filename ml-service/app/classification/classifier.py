import re

# ── Try loading the heavy transformer model ────────────────────────────────────
# The model (facebook/bart-large-mnli, ~1.5 GB) is downloaded on first use.
# If it is not cached or there is no internet, we fall back to a fast
# keyword-based classifier that works completely offline.

_classifier = None
_model_tried = False


def _get_classifier():
    global _classifier, _model_tried
    if not _model_tried:
        _model_tried = True
        try:
            from transformers import pipeline
            # local_files_only=True — only load if already cached; never hit the network.
            # On a machine where the model was never downloaded this raises an error
            # immediately, which we catch and fall through to the keyword classifier.
            _classifier = pipeline(
                "zero-shot-classification",
                model="facebook/bart-large-mnli",
                local_files_only=True
            )
            print("[MeetMind] BART classifier loaded from cache.")
        except Exception as e:
            print(f"[MeetMind] BART not in cache ({type(e).__name__}). Using keyword fallback.")
            _classifier = None
    return _classifier


CANDIDATE_LABELS = [
    "ACTION_ITEM",
    "DECISION",
    "DEADLINE",
    "DISCUSSION",
    "INFORMATION"
]

# ── Keyword fallback ───────────────────────────────────────────────────────────
_ACTION_KW  = re.compile(
    r'\b(will|should|need to|must|please|assign|follow.?up|send|create|write|'
    r'update|schedule|prepare|review|complete|submit|fix|handle|take care|'
    r'responsible|task|action item)\b', re.IGNORECASE)

_DECISION_KW = re.compile(
    r'\b(decided|agreed|approved|confirmed|resolved|finalized|conclusion|'
    r'we (will|are going to|have decided)|chosen|selected|going with)\b',
    re.IGNORECASE)

_DEADLINE_KW = re.compile(
    r'\b(by|before|due|deadline|no later than|end of (day|week|month)|'
    r'eod|eow|monday|tuesday|wednesday|thursday|friday|next week|'
    r'\d{1,2}[/-]\d{1,2})\b', re.IGNORECASE)

_DISCUSSION_KW = re.compile(
    r'\b(discuss|talk about|question|concern|issue|problem|idea|suggest|'
    r'proposal|thought|opinion|consider|agenda|topic|what about|how about)\b',
    re.IGNORECASE)


def _keyword_classify(sentence: str) -> dict:
    action_hits   = len(_ACTION_KW.findall(sentence))
    decision_hits = len(_DECISION_KW.findall(sentence))
    deadline_hits = len(_DEADLINE_KW.findall(sentence))
    discussion_hits = len(_DISCUSSION_KW.findall(sentence))

    scores = {
        # ACTION_ITEM gets a higher per-keyword weight (0.40) so that
        # "John will prepare the report by Friday" (will+prepare=action, by+Friday=deadline)
        # correctly resolves to ACTION_ITEM rather than DEADLINE.
        "ACTION_ITEM": action_hits   * 0.40,
        "DECISION":    decision_hits * 0.45,  # strong signal words
        "DEADLINE":    deadline_hits * 0.30,  # date keywords are weak alone
        "DISCUSSION":  discussion_hits * 0.25,
        "INFORMATION": 0.05  # baseline
    }

    # If a sentence has BOTH action AND deadline keywords, it's an action item
    # with a deadline — not a pure deadline entry.
    if action_hits > 0 and deadline_hits > 0:
        scores["DEADLINE"] = 0  # suppress deadline in favour of action

    best_label = max(scores, key=scores.get)
    best_score = min(scores[best_label], 0.95)
    if best_score < 0.1:
        best_label = "INFORMATION"
        best_score = 0.1
    return {"label": best_label, "confidence": round(best_score, 3)}


def classify_sentence(sentence: str) -> dict:
    """
    Classifies a sentence into one of the predefined categories.
    Uses facebook/bart-large-mnli when available, keyword fallback otherwise.
    """
    clf = _get_classifier()
    if clf is not None:
        result = clf(sentence, CANDIDATE_LABELS)
        best_label = result['labels'][0]
        best_score = result['scores'][0]
        if best_score < 0.4:
            best_label = "INFORMATION"

        # Post-processing correction: BART sometimes classifies action items
        # as DEADLINE when they contain date words (e.g. "will prepare by Friday").
        # If the sentence has BOTH action keywords AND deadline keywords, the
        # keyword classifier's verdict overrides BART.
        if best_label == "DEADLINE":
            action_hits  = len(_ACTION_KW.findall(sentence))
            deadline_hits = len(_DEADLINE_KW.findall(sentence))
            if action_hits > 0 and deadline_hits > 0:
                best_label = "ACTION_ITEM"

        return {"label": best_label, "confidence": round(best_score, 3)}

    return _keyword_classify(sentence)
