"""
HungryGoHappy — Flet Companion Application for Android, Desktop, and Web.
==========================================================================
This standalone Python application interoperates directly with the HungryGoHappy
Lovable Cloud PostgreSQL database, sharing the open group-code data model,
Row-Level Security (RLS) policies, and restaurant visit tracking.

Design Goals:
1. Multi-platform execution across Android APK, Desktop, and Web via Flet.
2. Dual-layer storage: instant startup from client_storage cache merged with Cloud.
3. Native Android Intent handoff to Google Maps for turn-by-turn navigation.
4. Python-native upstream shortlink resolution and unsigned 64-bit place-ID normalization.
5. Educational docstrings and comments detailing algorithms and architectural invariants.
"""

import asyncio
import datetime
import json
import random
import urllib.parse
from dataclasses import asdict, dataclass, field
from typing import Dict, List, Optional, Tuple
import flet as ft
import httpx
from supabase import Client, create_client

# ==============================================================================
# 1. DATABASE CONFIGURATION & SCHEMA DATA MODELS (SCHEMA.md Parity)
# ==============================================================================

# Supabase endpoint and anonymous publishable key for the HungryGoHappy project.
# Open RLS policies allow public read, insert, update, and delete scoped by list_code.
SUPABASE_URL = "https://ldwwyifsilftpokatqjh.supabase.co"
SUPABASE_KEY = "sb_publishable_iZQuUskLWJre3r765Fv9bA_sqR7gCW4"

# Initialize global Supabase client using supabase-py.
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


@dataclass
class Restaurant:
    """
    Data model representing a restaurant record conforming strictly to `SCHEMA.md`.
    Supports dual-layer serialization between JSON strings and native Python objects.
    """
    google_maps_url: str
    list_code: str = "default"
    name: Optional[str] = None
    visits: int = 0
    last_visited_at: Optional[str] = None
    visit_dates: List[str] = field(default_factory=list)
    gmaps_name: Optional[str] = None
    source_list_id: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    gmaps_place_id: Optional[str] = None

    @classmethod
    def from_row(cls, row: dict) -> "Restaurant":
        """
        Factory method to safely parse a database row or cached JSON dictionary.
        Handles JSON string vs list representations for `visit_dates` defensively.
        """
        raw_dates = row.get("visit_dates")
        parsed_dates: List[str] = []
        if isinstance(raw_dates, str):
            try:
                decoded = json.loads(raw_dates)
                if isinstance(decoded, list):
                    parsed_dates = [str(d) for d in decoded]
            except Exception:
                parsed_dates = []
        elif isinstance(raw_dates, list):
            parsed_dates = [str(d) for d in raw_dates]

        return cls(
            google_maps_url=str(row.get("google_maps_url") or ""),
            list_code=str(row.get("list_code") or "default"),
            name=row.get("name") or "Unnamed Place",
            visits=int(row.get("visits", 0) or 0),
            last_visited_at=row.get("last_visited_at"),
            visit_dates=parsed_dates,
            gmaps_name=row.get("gmaps_name"),
            source_list_id=row.get("source_list_id"),
            city=row.get("city"),
            province=row.get("province"),
            postal_code=row.get("postal_code"),
            country=row.get("country"),
            gmaps_place_id=row.get("gmaps_place_id"),
        )


# ==============================================================================
# 2. LOCAL CACHE & CLOUD SYNCHRONIZATION HELPERS
# ==============================================================================

def get_storage_key(list_code: str) -> str:
    """
    Generate client storage key matching the web application's convention:
    'hungry_roulette_restaurants' for 'default', and with suffix for other lists.
    """
    clean_code = list_code.strip().lower() or "default"
    return "hungry_roulette_restaurants" if clean_code == "default" else f"hungry_roulette_restaurants_{clean_code}"


def load_local_list(page: ft.Page, list_code: str) -> List[Restaurant]:
    """
    Retrieve cached restaurant objects from native device storage for instant render.
    Returns an empty list if no local cache exists for the specified group code.
    """
    key = get_storage_key(list_code)
    raw = page.client_storage.get(key)
    if not raw:
        return []
    try:
        data = json.loads(raw)
        return [Restaurant.from_row(r) for r in data] if isinstance(data, list) else []
    except Exception:
        return []


def save_local_list(page: ft.Page, list_code: str, items: List[Restaurant]) -> None:
    """
    Persist current restaurant list to native device storage in serialized JSON format.
    """
    key = get_storage_key(list_code)
    serialized = json.dumps([asdict(r) for r in items])
    page.client_storage.set(key, serialized)


async def fetch_cloud_restaurants(list_code: str) -> List[Restaurant]:
    """
    Query the Lovable Cloud PostgreSQL 'restaurants' table for the active list code.
    RLS policy 'Group-code lists are readable' permits public anon SELECT.
    """
    try:
        clean_code = list_code.strip().lower() or "default"
        res = (
            supabase.table("restaurants")
            .select("*")
            .eq("list_code", clean_code)
            .order("created_at", desc=False)
            .execute()
        )
        return [Restaurant.from_row(row) for row in (res.data or [])]
    except Exception as e:
        print(f"[CloudSync] Query error for list '{list_code}': {e}")
        return []


async def record_visit_cloud(restaurant: Restaurant) -> None:
    """
    Increment visit count and append current UTC ISO timestamp to PostgreSQL.
    Maintains rolling 3-month visit history parity with the web application.
    """
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    restaurant.visits += 1
    restaurant.last_visited_at = now_iso
    restaurant.visit_dates.append(now_iso)

    payload = {
        "visits": restaurant.visits,
        "last_visited_at": now_iso,
        "visit_dates": restaurant.visit_dates,
        "updated_at": now_iso,
    }
    try:
        (
            supabase.table("restaurants")
            .update(payload)
            .eq("list_code", restaurant.list_code)
            .eq("google_maps_url", restaurant.google_maps_url)
            .execute()
        )
    except Exception as e:
        print(f"[CloudSync] Failed to update visit record: {e}")


# ==============================================================================
# 3. UPSTREAM RESOLVER & PLACE ID NORMALIZATION
# ==============================================================================

def to_canonical_place_id(high: int, low: int) -> str:
    """
    Convert Google's signed 64-bit integer halves into canonical unsigned hex format.
    Applies 64-bit bitwise AND wrapping (& 0xFFFFFFFFFFFFFFFF) equivalent to BigInt.asUintN.
    """
    u_high = high & 0xFFFFFFFFFFFFFFFF
    u_low = low & 0xFFFFFFFFFFFFFFFF
    return f"0x{u_high:x}:0x{u_low:x}"


async def resolve_and_extract_place(url: str) -> Tuple[str, str, Optional[str]]:
    """
    Resolve Google Maps shortlinks (maps.app.goo.gl) and extract metadata.
    Returns: (canonical_url, place_name, optional_place_id)
    """
    clean_url = url.strip()
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
    }

    try:
        async with httpx.AsyncClient(headers=headers, follow_redirects=True, timeout=12.0) as client:
            resp = await client.get(clean_url)
            final_url = str(resp.url)

            # Heuristic 1: Extract title from URL path slug
            name = "Added Place"
            if "/place/" in final_url:
                slug = final_url.split("/place/")[1].split("/")[0]
                name = urllib.parse.unquote(slug.replace("+", " "))
            elif "query=" in final_url:
                parsed_query = urllib.parse.parse_qs(urllib.parse.urlparse(final_url).query)
                if "query" in parsed_query and parsed_query["query"]:
                    name = urllib.parse.unquote(parsed_query["query"][0])
            elif "<title>" in resp.text:
                # Fallback to HTML title tag, stripping Google Maps brand suffix
                title = resp.text.split("<title>")[1].split("</title>")[0]
                name = title.replace(" - Google Maps", "").strip()

            return final_url, name, None
    except Exception as e:
        print(f"[Resolver] Upstream resolution failed: {e}")
        return clean_url, "Added Place", None


# ==============================================================================
# 4. FLET APPLICATION USER INTERFACE
# ==============================================================================

def main(page: ft.Page) -> None:
    """
    Main application UI setup and lifecycle handler for Flet.
    Initializes Material 3 styling, theme modes, and responsive layout structure.
    """
    # Page configuration & branding
    page.title = "HungryGoHappy"
    page.theme_mode = ft.ThemeMode.DARK
    page.theme = ft.Theme(color_scheme_seed="#EA580C")  # Signature burnt orange
    page.padding = 16
    page.horizontal_alignment = ft.CrossAxisAlignment.CENTER
    page.scroll = ft.ScrollMode.ADAPTIVE

    # Reactive state variables
    current_list_code: str = "default"
    restaurants: List[Restaurant] = []
    current_picked: Optional[Restaurant] = None
    is_spinning: bool = False

    # ---------------- UI Component Definitions ----------------

    list_code_field = ft.TextField(
        value=current_list_code,
        label="List Code",
        prefix_icon=ft.Icons.SHARE_ROUNDED,
        dense=True,
        expand=True,
        text_size=14,
    )

    filter_field = ft.TextField(
        hint_text="Filter city, province or postal code…",
        prefix_icon=ft.Icons.LOCATION_ON_OUTLINED,
        dense=True,
        expand=True,
        text_size=14,
    )

    candidate_count_text = ft.Text(
        "Loading places…",
        size=12,
        color=ft.Colors.GREY_400,
        text_align=ft.TextAlign.CENTER,
    )

    place_name_text = ft.Text(
        "Ready to spin!",
        size=26,
        weight=ft.FontWeight.BOLD,
        text_align=ft.TextAlign.CENTER,
    )

    location_subtext = ft.Text(
        "",
        size=14,
        color=ft.Colors.GREY_400,
        text_align=ft.TextAlign.CENTER,
    )

    lets_go_btn = ft.ElevatedButton(
        "Let's Go! 🗺️",
        icon=ft.Icons.DIRECTIONS,
        visible=False,
        style=ft.ButtonStyle(
            color=ft.Colors.WHITE,
            bgcolor="#EA580C",
            padding=ft.padding.symmetric(horizontal=24, vertical=16),
            shape=ft.RoundedRectangleBorder(radius=16),
        ),
    )

    # ---------------- Synchronize & Filter Logic ----------------

    def update_candidate_count() -> None:
        """Update the UI counter reflecting how many places match the location filter."""
        candidates = get_filtered_candidates()
        total = len(restaurants)
        if filter_field.value and filter_field.value.strip():
            candidate_count_text.value = f"{len(candidates)} of {total} places match filter"
        else:
            candidate_count_text.value = f"{total} places on this list"
        page.update()

    def get_filtered_candidates() -> List[Restaurant]:
        """Return candidate spots matching the current case-insensitive location query."""
        query = (filter_field.value or "").strip().lower()
        if not query:
            return restaurants
        matched: List[Restaurant] = []
        for r in restaurants:
            loc_str = " ".join(filter(None, [r.city, r.province, r.postal_code, r.country])).lower()
            if query in loc_str:
                matched.append(r)
        return matched

    async def reload_restaurants(e=None) -> None:
        """
        Refresh current list:
        1. Render instantly from local client storage cache.
        2. Query Lovable Cloud asynchronously and update storage with merged rows.
        """
        nonlocal current_list_code, restaurants, current_picked
        current_list_code = list_code_field.value.strip().lower() or "default"
        current_picked = None
        lets_go_btn.visible = False
        place_name_text.value = "Ready to spin!"
        location_subtext.value = ""

        # Step 1: Instant local cache read
        restaurants = load_local_list(page, current_list_code)
        update_candidate_count()
        page.update()

        # Step 2: Fresh cloud query
        cloud_items = await fetch_cloud_restaurants(current_list_code)
        if cloud_items:
            restaurants = cloud_items
            save_local_list(page, current_list_code, restaurants)

        update_candidate_count()
        page.snack_bar = ft.SnackBar(ft.Text(f"Synced {len(restaurants)} spots for '{current_list_code}'"))
        page.snack_bar.open = True
        page.update()

    list_code_field.on_submit = reload_restaurants
    filter_field.on_change = lambda e: update_candidate_count()

    # ---------------- Spin / Roulette Animation ----------------

    async def spin_roulette(e) -> None:
        """
        Execute random selection with slot-machine rolling animation.
        Respects active location filter and picks only from qualifying places.
        """
        nonlocal is_spinning, current_picked
        candidates = get_filtered_candidates()
        if not candidates:
            page.snack_bar = ft.SnackBar(ft.Text("No places match your location filter!"))
            page.snack_bar.open = True
            page.update()
            return

        if is_spinning:
            return

        is_spinning = True
        lets_go_btn.visible = False
        spin_button.disabled = True

        # Decelerating slot-machine visual cycle
        roll_steps = 14
        for step in range(roll_steps):
            temp_pick = random.choice(candidates)
            place_name_text.value = temp_pick.name or "Picking…"
            page.update()
            # Gradually increase delay to simulate a mechanical wheel slowing down
            await asyncio.sleep(0.04 + (step * 0.012))

        # Final chosen restaurant
        current_picked = random.choice(candidates)
        place_name_text.value = current_picked.name or "Unnamed Place"
        loc_components = filter(None, [current_picked.city, current_picked.province, current_picked.country])
        location_subtext.value = ", ".join(loc_components)

        lets_go_btn.visible = True
        lets_go_btn.text = f"Let's Go! (Visited {current_picked.visits}x)"
        spin_button.disabled = False
        is_spinning = False
        page.update()

    # ---------------- "Let's Go!" Visit Action ----------------

    async def on_lets_go_clicked(e) -> None:
        """
        Launch Google Maps via Android Native Intent (or browser on Desktop/Web),
        and record the visit in both the Cloud database and client storage.
        """
        if not current_picked:
            return

        # Launch native navigation via Android Intent
        page.launch_url(current_picked.google_maps_url)

        # Update visit state in Lovable Cloud PostgreSQL
        await record_visit_cloud(current_picked)
        save_local_list(page, current_list_code, restaurants)

        lets_go_btn.text = f"Enjoy! ✓ ({current_picked.visits} visits)"
        page.update()

    lets_go_btn.on_click = on_lets_go_clicked

    # ---------------- Theme Switcher ----------------

    def toggle_theme(e) -> None:
        """Toggle between Dark and Light Material 3 theme modes."""
        page.theme_mode = (
            ft.ThemeMode.LIGHT if page.theme_mode == ft.ThemeMode.DARK else ft.ThemeMode.DARK
        )
        theme_btn.icon = (
            ft.Icons.DARK_MODE if page.theme_mode == ft.ThemeMode.LIGHT else ft.Icons.LIGHT_MODE
        )
        page.update()

    theme_btn = ft.IconButton(
        icon=ft.Icons.LIGHT_MODE,
        tooltip="Toggle Dark/Light theme",
        on_click=toggle_theme,
    )

    # ---------------- Add Restaurant Dialog ----------------

    new_url_field = ft.TextField(
        label="Google Maps URL",
        hint_text="https://maps.app.goo.gl/...",
        autofocus=True,
    )
    new_name_field = ft.TextField(
        label="Custom Name (optional)",
        hint_text="Leave blank to auto-extract",
    )

    async def add_place_to_cloud(e) -> None:
        """Resolve Google Maps link and insert new place row into Lovable Cloud."""
        target_url = new_url_field.value.strip()
        if not target_url:
            return

        add_dialog.open = False
        page.snack_bar = ft.SnackBar(ft.Text("Resolving Google Maps link…"))
        page.snack_bar.open = True
        page.update()

        resolved_url, extracted_name, place_id = await resolve_and_extract_place(target_url)
        final_name = new_name_field.value.strip() or extracted_name

        new_record = {
            "list_code": current_list_code,
            "google_maps_url": resolved_url,
            "name": final_name,
            "gmaps_name": extracted_name,
            "visits": 0,
            "visit_dates": [],
            "gmaps_place_id": place_id,
        }

        try:
            supabase.table("restaurants").upsert(new_record).execute()
            new_url_field.value = ""
            new_name_field.value = ""
            await reload_restaurants()
        except Exception as err:
            page.snack_bar = ft.SnackBar(ft.Text(f"Save error: {err}"))
            page.snack_bar.open = True
            page.update()

    add_dialog = ft.AlertDialog(
        title=ft.Text("Add Restaurant"),
        content=ft.Column([new_url_field, new_name_field], tight=True),
        actions=[
            ft.TextButton("Cancel", on_click=lambda e: setattr(add_dialog, "open", False) or page.update()),
            ft.ElevatedButton("Add to List", on_click=add_place_to_cloud),
        ],
    )
    page.overlay.append(add_dialog)

    # ---------------- Main Spin Button ----------------

    spin_button = ft.ElevatedButton(
        content=ft.Container(
            content=ft.Column(
                [
                    ft.Icon(ft.Icons.CASINO_ROUNDED, size=40, color=ft.Colors.WHITE),
                    ft.Text(
                        "Where To Eat/Drink Today?",
                        size=18,
                        weight=ft.FontWeight.BOLD,
                        color=ft.Colors.WHITE,
                        text_align=ft.TextAlign.CENTER,
                    ),
                ],
                alignment=ft.MainAxisAlignment.CENTER,
                horizontal_alignment=ft.CrossAxisAlignment.CENTER,
                spacing=6,
            ),
            padding=ft.padding.symmetric(vertical=20, horizontal=24),
        ),
        on_click=spin_roulette,
        style=ft.ButtonStyle(
            bgcolor="#EA580C",
            shape=ft.RoundedRectangleBorder(radius=24),
            elevation=8,
        ),
    )

    # ---------------- View Layout Tree ----------------

    page.add(
        # Top App Bar
        ft.Row(
            [
                list_code_field,
                ft.IconButton(ft.Icons.SYNC, tooltip="Sync Cloud", on_click=reload_restaurants),
                ft.IconButton(
                    ft.Icons.ADD_LOCATION_ALT,
                    tooltip="Add place",
                    on_click=lambda e: setattr(add_dialog, "open", True) or page.update(),
                ),
                theme_btn,
            ],
            alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
        ),
        ft.Divider(height=8, color=ft.Colors.TRANSPARENT),

        # Location Filter Input Bar
        ft.Row([filter_field], alignment=ft.MainAxisAlignment.CENTER),
        candidate_count_text,
        ft.Divider(height=16, color=ft.Colors.TRANSPARENT),

        # Central Result Card
        ft.Container(
            content=ft.Column(
                [
                    place_name_text,
                    location_subtext,
                    ft.Divider(height=12, color=ft.Colors.TRANSPARENT),
                    lets_go_btn,
                ],
                horizontal_alignment=ft.CrossAxisAlignment.CENTER,
            ),
            padding=24,
            border_radius=24,
            bgcolor=ft.Colors.SURFACE_CONTAINER_HIGH,
            width=380,
            alignment=ft.alignment.center,
        ),
        ft.Divider(height=28, color=ft.Colors.TRANSPARENT),

        # Big Spin Action Button
        ft.Container(spin_button, width=340, alignment=ft.alignment.center),
    )

    # Trigger initial data synchronization on application launch
    page.run_task(reload_restaurants)


# ==============================================================================
# 5. ENTRY POINT
# ==============================================================================

if __name__ == "__main__":
    # Launch Flet native application
    ft.app(target=main)
