"""
Tests for place ID normalization, bitwise wrapping, and URL display truncation.
Validates parity with src/lib/gmaps-core.ts and src/lib/restaurants.ts.
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from main import normalize_place_id, to_canonical_place_id, truncate_for_display

CANONICAL_ID = "0x3102bf84957100fd:0xe4dffd4135acd87c"
LEGACY_SIGNED_ID = "0x3102bf84957100fd:0x-1b2002beca532784"


class TestPlaceIdResolver(unittest.TestCase):
    """Test suite validating unsigned 64-bit hexadecimal wrapping and truncation."""

    def test_to_canonical_place_id_bitwise_wrapping(self):
        """Verify 64-bit integer halves wrap into canonical hex without negative signs."""
        high = 0x3102bf84957100fd
        low_signed = -0x1b2002beca532784
        self.assertEqual(to_canonical_place_id(high, low_signed), CANONICAL_ID)

    def test_normalize_place_id_legacy_signed_hex(self):
        """Verify legacy signed hex IDs normalize into canonical unsigned hex format."""
        self.assertEqual(normalize_place_id(LEGACY_SIGNED_ID), CANONICAL_ID)

    def test_normalize_place_id_canonical_passthrough(self):
        """Verify valid canonical IDs pass through unchanged."""
        self.assertEqual(normalize_place_id(CANONICAL_ID), CANONICAL_ID)

    def test_normalize_place_id_rejects_invalid(self):
        """Verify non-ID strings and null values return None without crashing."""
        self.assertIsNone(normalize_place_id("not-a-valid-id"))
        self.assertIsNone(normalize_place_id(None))

    def test_truncate_for_display_under_limit(self):
        """Verify strings under the 60-character limit are returned untouched."""
        short = "https://maps.app.goo.gl/short"
        self.assertEqual(truncate_for_display(short, 60), short)

    def test_truncate_for_display_exact_boundary(self):
        """Verify strings exactly at the 60-character limit are not truncated."""
        exact_60 = "a" * 60
        self.assertEqual(truncate_for_display(exact_60, 60), exact_60)

    def test_truncate_for_display_exceeding_threshold(self):
        """Verify strings exceeding 60 characters are sliced to 60 with trailing ellipsis."""
        long_url = "https://www.google.com/maps/place/Some+Very+Long+Restaurant+Name+And+Address+String"
        truncated = truncate_for_display(long_url, 60)
        self.assertEqual(len(truncated), 63)
        self.assertTrue(truncated.endswith("..."))
        self.assertEqual(truncated[:60], long_url[:60])


if __name__ == "__main__":
    unittest.main()
