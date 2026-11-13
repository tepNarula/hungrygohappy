"""
Tests for visit logging and rolling 3-month recency calculations.
Validates parity with recentVisitCount() in src/lib/restaurants.ts.
"""

import datetime
import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from main import Restaurant, recent_visit_count


class TestVisitsRecency(unittest.TestCase):
    """Test suite validating rolling 3-calendar-month visit filtering."""

    def test_recent_visit_count_within_3_months(self):
        """Verify timestamps within 3 months are counted, and older dates excluded."""
        now = datetime.datetime(2026, 11, 13, 12, 0, tzinfo=datetime.timezone.utc)
        r = Restaurant(
            google_maps_url="https://maps.google.com/test",
            visits=3,
            visit_dates=[
                "2026-11-10T10:00:00+00:00",  # 3 days ago (included)
                "2026-09-01T10:00:00+00:00",  # ~2.5 months ago (included)
                "2026-06-01T10:00:00+00:00",  # >5 months ago (excluded)
            ],
        )
        self.assertEqual(recent_visit_count(r, now), 2)

    def test_recent_visit_count_fallback_to_last_visited_at(self):
        """Verify fallback to last_visited_at when visit_dates array is empty."""
        now = datetime.datetime(2026, 11, 13, 12, 0, tzinfo=datetime.timezone.utc)
        r = Restaurant(
            google_maps_url="https://maps.google.com/test2",
            visits=1,
            last_visited_at="2026-10-15T12:00:00+00:00",
            visit_dates=[],
        )
        self.assertEqual(recent_visit_count(r, now), 1)

    def test_recent_visit_count_zero_when_no_visits(self):
        """Verify zero is returned when no visit timestamps exist."""
        r = Restaurant(google_maps_url="https://maps.google.com/test3")
        self.assertEqual(recent_visit_count(r), 0)


if __name__ == "__main__":
    unittest.main()
