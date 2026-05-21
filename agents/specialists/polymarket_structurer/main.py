"""polymarket_structurer — turns a free-form prediction into a binary
Polymarket V2 market record (outcome parameters + resolution condition id).
"""

from __future__ import annotations

import hashlib
from typing import Any

from logos.server import ReasoningTrace, Specialist, run

SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "market_title": {"type": "string"},
        "outcome_parameters": {
            "type": "array",
            "items": {"type": "string"},
            "minItems": 2,
        },
        "resolved_condition_id": {"type": "string"},
        "selected_outcome": {"type": "string"},
    },
    "required": ["outcome_parameters", "resolved_condition_id"],
}


def _structure(prediction: str, conviction: float) -> dict[str, Any]:
    binary = ["YES", "NO"]
    selected = "NO" if prediction.lower().startswith(("no", "won't", "wont", "no ")) else "YES"
    condition = hashlib.sha256(prediction.encode()).hexdigest()[:32]
    return {
        "market_title": prediction[:80] + (" …" if len(prediction) > 80 else ""),
        "outcome_parameters": binary,
        "resolved_condition_id": f"0x{condition}",
        "selected_outcome": selected,
        "_conviction": conviction,
    }


class PolymarketStructurer(Specialist):
    name = "polymarket_structurer"
    service_type = "polymarket_structuring"
    price_per_query_usdc_6 = 50  # $0.000050
    response_schema = SCHEMA

    async def handle(
        self, payload: dict[str, Any], *, trace: ReasoningTrace
    ) -> dict[str, Any]:
        prediction = str(payload.get("prediction", payload.get("question", "Will X happen?")))
        conviction = float(payload.get("conviction", 0.5))
        trace.step(f"Mapped prediction → Polymarket V2 binary lane (conviction={conviction:.2f})")
        result = _structure(prediction, conviction)
        result.pop("_conviction", None)
        trace.step(
            f"Selected outcome {result['selected_outcome']!r}; "
            f"resolved_condition_id={result['resolved_condition_id'][:14]}…"
        )
        return result


SPECIALIST = PolymarketStructurer()


if __name__ == "__main__":
    run(SPECIALIST, port=7403)
