"""
Tests for case-insensitive location filtering and location label formatting.
Validates parity with src/lib/location-filter.ts.
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from main import Restaurant, filter_by_location, location_label


class TestLocationFilter(unittest.TestCase):
    """Test suite validating case-insensitive matching across location fields."""

    def setUp(self):
        self.place_a = Restaurant(
            google_maps_url="https://maps.google.com/a",
            name="Sathon Eatery",
            city="Sathon",
            province="Bangkok",
            postal_code="10120",
            country="Thailand",
        )
        self.place_b = Restaurant(
            google_maps_url="https://maps.google.com/b",
            name="Nimman Cafe",
            city="Mueang",
            province="Chiang Mai",
            postal_code="50200",
            country="Thailand",
        )
        self.place_c = Restaurant(
            google_maps_url="https://maps.google.com/c",
            name="Virtual Diner",
        )
        self.all_places = [self.place_a, self.place_b, self.place_c]

    def test_empty_filter_keeps_all(self):
        """Verify empty or whitespace-only queries return all restaurants."""
        self.assertEqual(len(filter_by_location(self.all_places, "")), 3)
        self.assertEqual(len(filter_by_location(self.all_places, "   ")), 3)

    def test_matches_province_case_insensitively(self):
        """Verify substring matching in province is case-insensitive."""
        matched = filter_by_location(self.all_places, "chiang")
        self.assertEqual(len(matched), 1)
        self.assertEqual(matched[0].name, "Nimman Cafe")

    def test_matches_postal_code(self):
        """Verify postal code matching."""
        matched = filter_by_location(self.all_places, "10120")
        self.assertEqual(len(matched), 1)
        self.assertEqual(matched[0].name, "Sathon Eatery")

    def test_excludes_places_without_location_metadata(self):
        """Verify places with empty location fields are excluded when filtering."""
        matched = filter_by_location([self.place_c], "bangkok")
        self.assertEqual(len(matched), 0)

    def test_location_label_formatting(self):
        """Verify standardized formatting of location components."""
        self.assertEqual(location_label(self.place_a), "Sathon, Bangkok 10120, Thailand")
        self.assertEqual(location_label(self.place_c), "")


if __name__ == "__main__":
    unittest.main()
