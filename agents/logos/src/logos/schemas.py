"""JSON Schema validation for specialist responses.

Every specialist publishes a JSON schema along with its offer. Traders use
this module to reject any response that fails to validate — schema
compliance is part of the rating signal.
"""

from __future__ import annotations

from typing import Any

import jsonschema


class SchemaViolation(Exception):
    """Raised when a specialist response fails its declared schema."""


def validate_response(payload: dict[str, Any], schema: dict[str, Any]) -> None:
    try:
        jsonschema.validate(instance=payload, schema=schema)
    except jsonschema.ValidationError as e:
        raise SchemaViolation(str(e)) from e
