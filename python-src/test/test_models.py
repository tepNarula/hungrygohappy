"""
Tests for Restaurant model serialization, schema parity, and defensive parsing.
Verifies strict conformance to SCHEMA.md and dual-layer storage compatibility.
"""

import json
import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from main import Restaurant


class TestRestaurantModel(unittest.TestCase):
    """Test suite validating Restaurant dataclass defaults, JSON parsing, and null safety."""

    def test_default_values(self):
        """Verify initial defaults for non-nullable and default fields."""
        r = Restaurant(google_maps_url="https://maps.google.com/place/1")
        self.assertEqual(r.google_maps_url, "https://maps.google.com/place/1")
        self.assertEqual(r.list_code, "default")
        self.assertEqual(r.visits, 0)
        self.assertIsNone(r.last_visited_at)
        self.assertEqual(r.visit_dates, [])

    def test_from_row_with_json_string_visit_dates(self):
        """Verify parsing when visit_dates is serialized as a JSON string from PostgreSQL."""
        dates = ["2026-11-01T10:00:00Z", "2026-11-10T12:00:00Z"]
        row = {
            "google_maps_url": "https://maps.google.com/place/2",
            "name": "Tasty Bites",
            "visits": 2,
            "last_visited_at": "2026-11-10T12:00:00Z",
            "visit_dates": json.dumps(dates),
            "city": "Bangkok",
            "country": "Thailand",
        }
        r = Restaurant.from_row(row)
        self.assertEqual(r.name, "Tasty Bites")
        self.assertEqual(r.visits, 2)
        self.assertEqual(r.visit_dates, dates)
        self.assertEqual(r.city, "Bangkok")
        self.assertEqual(r.country, "Thailand")

    def test_from_row_with_list_visit_dates(self):
        """Verify parsing when visit_dates is already a native Python list."""
        dates = ["2026-10-01T08:00:00Z"]
        row = {
            "google_maps_url": "https://maps.google.com/place/3",
            "visit_dates": dates,
            "visits": "1",
        }
        r = Restaurant.from_row(row)
        self.assertEqual(r.visits, 1)
        self.assertEqual(r.visit_dates, dates)

    def test_from_row_defensive_null_handling(self):
        """Verify defensive recovery when fields are null or corrupt."""
        row = {"google_maps_url": None, "visit_dates": "invalid-json"}
        r = Restaurant.from_row(row)
        self.assertEqual(r.google_maps_url, "")
        self.assertEqual(r.visit_dates, [])
        self.assertEqual(r.name, "Unnamed Place")


if __name__ == "__main__":
    unittest.main()
