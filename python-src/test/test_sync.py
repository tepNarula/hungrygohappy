"""
Tests for sync planning, custom place name preservation, and spreadsheet formula protection.
Validates parity with src/lib/gmaps-sync-plan.ts and formula neutralization.
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from main import Restaurant, plan_gmaps_sync, safe_spreadsheet_text


class TestSyncPlanning(unittest.TestCase):
    """Test suite validating 3-way merge logic and input sanitization."""

    def test_preserves_custom_name_when_google_name_updates(self):
        """Verify user-customized place names are never overwritten by upstream refreshes."""
        url = "https://www.google.com/maps/place/Cafe"
        current = [
            Restaurant(
                google_maps_url=url,
                name="Our Favorite Lunch Spot",
                gmaps_name="Cafe",
            )
        ]
        incoming = [{"google_maps_url": url, "name": "New Cafe Name"}]
        plan = plan_gmaps_sync(current, incoming, "src_123")
        self.assertEqual(len(plan.added), 0)
        self.assertEqual(len(plan.updates), 1)
        self.assertEqual(plan.updates[0]["name"], "Our Favorite Lunch Spot")
        self.assertEqual(plan.updates[0]["gmaps_name"], "New Cafe Name")

    def test_updates_name_if_user_never_customized_it(self):
        """Verify unedited names update to the latest Google Maps title."""
        url = "https://www.google.com/maps/place/Cafe2"
        current = [
            Restaurant(
                google_maps_url=url,
                name="Old Google Name",
                gmaps_name="Old Google Name",
            )
        ]
        incoming = [{"google_maps_url": url, "name": "Brand New Name"}]
        plan = plan_gmaps_sync(current, incoming, "src_123")
        self.assertEqual(plan.updates[0]["name"], "Brand New Name")
        self.assertEqual(plan.updates[0]["gmaps_name"], "Brand New Name")

    def test_safe_spreadsheet_text_neutralization(self):
        """Verify formula injection characters (=, +, -, @, \\t, \\r) are prepended with single-quote."""
        self.assertEqual(safe_spreadsheet_text("Normal Name"), "Normal Name")
        self.assertEqual(safe_spreadsheet_text("=CMD('calc')"), "'=CMD('calc')")
        self.assertEqual(safe_spreadsheet_text("+12345"), "'+12345")
        self.assertEqual(safe_spreadsheet_text("-Discount"), "'-Discount")
        self.assertEqual(safe_spreadsheet_text("@sum(A1:A10)"), "'@sum(A1:A10)")


if __name__ == "__main__":
    unittest.main()
