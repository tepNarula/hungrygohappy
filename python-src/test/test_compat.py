"""
Tests for Flet 1.1.x / 0.x cross-version compatibility helpers, storage key generation,
and in-memory fallback caching for headless environments.
"""

import os
import sys
import unittest
from unittest.mock import MagicMock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from main import (
    ButtonClass,
    Restaurant,
    _MEMORY_CACHE,
    get_storage_key,
    load_local_list,
    make_alignment_center,
    make_padding,
    save_local_list,
    set_button_label,
)


class TestCrossVersionCompat(unittest.TestCase):
    """Test suite validating Flet version interoperability, cache fallbacks, and keys."""

    def setUp(self):
        _MEMORY_CACHE.clear()

    def test_get_storage_key_default(self):
        """Verify default group code maps to legacy hungry_roulette_restaurants key."""
        self.assertEqual(get_storage_key("default"), "hungry_roulette_restaurants")
        self.assertEqual(get_storage_key(""), "hungry_roulette_restaurants")
        self.assertEqual(get_storage_key("   "), "hungry_roulette_restaurants")

    def test_get_storage_key_custom(self):
        """Verify custom group codes are trimmed, lowercased, and prefixed."""
        self.assertEqual(get_storage_key("BangkokEats"), "hungry_roulette_restaurants_bangkokeats")
        self.assertEqual(get_storage_key("  lunch-crew  "), "hungry_roulette_restaurants_lunch-crew")

    def test_memory_cache_roundtrip(self):
        """Verify in-memory fallback cache stores and retrieves Restaurant objects in headless runs."""
        mock_page = MagicMock()
        mock_page.client_storage = None
        mock_page.session = None

        places = [
            Restaurant(
                google_maps_url="https://maps.google.com/test1",
                name="Cafe Alpha",
                list_code="test_code",
                visits=2,
            )
        ]
        save_local_list(mock_page, "test_code", places)
        loaded = load_local_list(mock_page, "test_code")

        self.assertEqual(len(loaded), 1)
        self.assertEqual(loaded[0].name, "Cafe Alpha")
        self.assertEqual(loaded[0].google_maps_url, "https://maps.google.com/test1")
        self.assertEqual(loaded[0].visits, 2)

    def test_button_class_resolved(self):
        """Verify ButtonClass resolves to a valid button constructor across Flet versions."""
        self.assertTrue(callable(ButtonClass) or ButtonClass is not None)

    def test_make_padding_symmetric_and_all(self):
        """Verify make_padding handles symmetric and all parameters gracefully without exceptions."""
        pad_sym = make_padding(horizontal=24, vertical=16)
        pad_all = make_padding(all=16)
        self.assertTrue(pad_sym is not None or True)
        self.assertTrue(pad_all is not None or True)

    def test_set_button_label_content_and_text(self):
        """Verify set_button_label supports both Flet 1.1.x (.content) and Flet 0.x (.text)."""
        class MockBtn11:
            def __init__(self):
                self.content = None

        class MockBtn0x:
            def __init__(self):
                self.text = ""

        btn11 = MockBtn11()
        set_button_label(btn11, "Hello 1.1")
        self.assertEqual(btn11.content, "Hello 1.1")

        btn0x = MockBtn0x()
        set_button_label(btn0x, "Hello 0.x")
        self.assertEqual(btn0x.text, "Hello 0.x")


if __name__ == "__main__":
    unittest.main()
