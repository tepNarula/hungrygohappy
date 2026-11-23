"""
HungryGoHappy — Flet Companion Application Test Suite
======================================================
Automated unit and regression test suite verifying data models, resolvers,
filters, rolling visit calculations, and custom-name preservation.
"""

import sys
import types
from unittest.mock import MagicMock

# Gracefully stub UI and network framework dependencies when running in headless CI/CD
for mod in ["flet", "httpx"]:
    if mod not in sys.modules:
        try:
            __import__(mod)
        except ImportError:
            sys.modules[mod] = MagicMock()

if "supabase" not in sys.modules:
    try:
        sb = __import__("supabase")
        if not hasattr(sb, "Client"):
            raise ImportError()
    except (ImportError, AttributeError):
        mock_sb = types.ModuleType("supabase")
        mock_sb.Client = MagicMock
        mock_sb.create_client = MagicMock()
        sys.modules["supabase"] = mock_sb
