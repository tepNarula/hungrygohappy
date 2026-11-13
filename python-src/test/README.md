# HungryGoHappy Flet Companion — Test Suite Documentation

This document describes the structure, testing principles, test suites, and execution instructions for verifying the correctness, reliability, and security of the **HungryGoHappy** Flet companion application (`/python-src/main.py`).

---

## 1. Directory Structure & Organization Policy

All unit and regression test suites for the Python companion application are maintained under `python-src/test/`:

```text
python-src/test/
├── README.md              # This documentation file
├── __init__.py            # Test package marker
├── test_models.py         # Schema parity with SCHEMA.md, JSON visit_dates, and null safety
├── test_resolver.py       # Unsigned 64-bit place ID wrapping and 60-character URL truncation
├── test_filter.py         # Case-insensitive location filtering and standardized location labeling
├── test_visits.py         # Rolling 3-calendar-month visit counts and legacy visit fallback
└── test_sync.py           # 3-way sync planner, custom name preservation, and formula injection protection
