"""
HungryGoHappy — Flet Companion Application for Android, Desktop, and Web.
==========================================================================
This standalone Python application interoperates directly with the HungryGoHappy
Lovable Cloud PostgreSQL database, sharing the open group-code data model,
Row-Level Security (RLS) policies, and restaurant visit tracking.

Design Goals:
1. Multi-platform execution across Android APK, Desktop, and Web via Flet 1.1.x.
2. Dual-layer storage: instant startup from local storage / session cache merged with Cloud.
3. Native Android Intent handoff to Google Maps for turn-by-turn navigation.
4. Python-native upstream shortlink resolution and unsigned 64-bit place-ID normalization.
5. Educational docstrings and comments detailing algorithms and architectural invariants.
"""

import asyncio
import calendar
import datetime
import json
import random
import re
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
        if isinstance(raw_dates, str):
            try:
                visit_dates = json.loads(raw_dates)
            except Exception:
                visit_dates = []
        elif isinstance(raw_dates, list):
            visit_dates = raw_dates
        else:
            visit_dates = []

        return cls(
            google_maps_url=row.get("google_maps_url", ""),
            list_code=row.get("list_code", "default") or "default",
            name=row.get("name"),
            visits=int(row.get("visits", 0) or 0),
            last_visited_at=row.get("last_visited_at"),
            visit_dates=visit_dates,
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

# In-memory process fallback cache supporting Flet 0.x, 1.1.x, and headless test runners.
_MEMORY_CACHE: Dict[str, str] = {}


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
    Supports Flet 0.x client_storage, Flet 1.1.x session store, and in-memory cache.
    Returns an empty list if no local cache exists for the specified group code.
    """
    key = get_storage_key(list_code)
    raw = None
    try:
        if hasattr(page, "client_storage") and page.client_storage:
            raw = page.client_storage.get(key)
        elif hasattr(page, "session") and page.session and hasattr(page.session, "store"):
            raw = page.session.store.get(key)
    except Exception:
        raw = None

    if raw is None:
        raw = _MEMORY_CACHE.get(key)

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
    Supports Flet 0.x client_storage, Flet 1.1.x session store, and in-memory cache.
    """
    key = get_storage_key(list_code)
    serialized = json.dumps([asdict(r) for r in items])
    _MEMORY_CACHE[key] = serialized
    try:
        if hasattr(page, "client_storage") and page.client_storage:
            page.client_storage.set(key, serialized)
        elif hasattr(page, "session") and page.session and hasattr(page.session, "store"):
            page.session.store.set(key, serialized)
    except Exception:
        pass


async def fetch_cloud_restaurants(list_code: str) -> List[Restaurant]:
    """
    Query the Lovable Cloud PostgreSQL 'restaurants' table for the active list code.
    RLS policy 'Group-code lists are readable' permits public anon SELECT.
    """
    try:
        clean_code = list_code.strip().lower() or "default"
        resp = (
            supabase.table("restaurants")
            .select("*")
            .eq("list_code", clean_code)
            .execute()
        )
        return [Restaurant.from_row(r) for r in (resp.data or [])]
    except Exception as e:
        print(f"[CloudSync] Query error for list '{list_code}': {e}")
        return []


async def record_visit_cloud(restaurant: Restaurant) -> None:
    """
    Increment visit count and append current UTC ISO timestamp to PostgreSQL.
    Maintains rolling 3-month visit history parity with the web application.
    """
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    new_dates = list(restaurant.visit_dates) + [now_iso]
    new_visits = restaurant.visits + 1

    try:
        (
            supabase.table("restaurants")
            .update({
                "visits": new_visits,
                "last_visited_at": now_iso,
                "visit_dates": new_dates,
            })
            .eq("list_code", restaurant.list_code)
            .eq("google_maps_url", restaurant.google_maps_url)
            .execute()
        )
        restaurant.visits = new_visits
        restaurant.last_visited_at = now_iso
        restaurant.visit_dates = new_dates
    except Exception as e:
        print(f"[CloudSync] Visit update error: {e}")


# ==============================================================================
# 3. UPSTREAM RESOLVER, PLACE ID & SECURITY UTILITIES
# ==============================================================================

def to_canonical_place_id(high: int, low: int) -> str:
    """
    Convert Google's signed 64-bit integer halves into canonical unsigned hex format.
    Applies 64-bit bitwise AND wrapping (& 0xFFFFFFFFFFFFFFFF) equivalent to BigInt.asUintN.
    """
    u_high = high & 0xFFFFFFFFFFFFFFFF
    u_low = low & 0xFFFFFFFFFFFFFFFF
    return f"0x{u_high:x}:0x{u_low:x}"


def normalize_place_id(value: Optional[str]) -> Optional[str]:
    """
    Normalize canonical IDs and legacy IDs containing a signed hexadecimal half.
    Keeps database rows imported before the unsigned fix usable without migrations.
    """
    if not isinstance(value, str):
        return None
    raw = value.strip()
    if not raw.startswith("0x") or ":" not in raw:
        return None
    try:
        parts = raw.split(":")
        if len(parts) != 2:
            return None
        return f"0x{parts[0]}:0x{parts[1]}"
    except Exception:
        return None


def truncate_for_display(text: str, max_chars: int = 60) -> str:
    """
    Truncate URL or label text for compact UI display with trailing ellipsis.
    Matches the web application's 60-character threshold from src/lib/restaurants.ts.
    """
    return f"{text[:max_chars]}..." if len(text) > max_chars else text


def safe_spreadsheet_text(v: str) -> str:
    """
    Neutralize spreadsheet formula injection characters (=, +, -, @, \\t, \\r).
    Ensures exported CSVs or user-entered strings cannot trigger formula execution.
    """
    if v and v[0] in ("=", "+", "-", "@", "\t", "\r"):
        return f"'{v}"
    return v


async def resolve_and_extract_place(url: str) -> Tuple[str, str, Optional[str]]:
    """
    Resolve Google Maps shortlinks (maps.app.goo.gl) and extract metadata.
    Returns: (canonical_url, place_name, optional_place_id)
    """
    clean_url = url.strip()
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Linux; Android 14; Pixel 8) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36"
        ),
        "Accept-Language": "en-US,en;q=0.9",
    }

    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=10.0, headers=headers) as client:
            resp = await client.get(clean_url)
            final_url = str(resp.url)
            body = resp.text

            # 1. Attempt title tag extraction
            name_match = re.search(r"<title>([^<]+) - Google Maps</title>", body)
            name = name_match.group(1).strip() if name_match else ""

            # 2. Fallback to path segment parsing
            if not name:
                path_match = re.search(r"/place/([^/@]+)", final_url)
                if path_match:
                    name = urllib.parse.unquote(path_match.group(1)).replace("+", " ")

            # 3. Extract 64-bit hexadecimal Place ID pairs if present
            pid_match = re.search(r"!1s(0x[0-9a-fA-F]+:0x[0-9a-fA-F]+)", final_url)
            place_id = pid_match.group(1) if pid_match else None

            return final_url, name or "Google Maps Place", place_id
    except Exception as e:
        print(f"[Resolver] Resolution failed for {clean_url}: {e}")
        return clean_url, "Added Place", None


# ==============================================================================
# 4. LOCATION FILTERING & RECENCY CALCULATIONS
# ==============================================================================

def filter_by_location(restaurants: List[Restaurant], query: str) -> List[Restaurant]:
    """
    Return restaurants matching a case-insensitive location substring.
    Searches across city, province, postal_code, and country fields.
    """
    clean_q = (query or "").strip().lower()
    if not clean_q:
        return list(restaurants)

    matched = []
    for r in restaurants:
        loc_str = f"{r.city or ''} {r.province or ''} {r.postal_code or ''} {r.country or ''}".lower()
        if clean_q in loc_str:
            matched.append(r)
    return matched


def location_label(r: Restaurant) -> str:
    """
    Format a restaurant's location components into a standardized display label:
    '{city}, {province} {postal_code}, {country}'.
    """
    parts = []
    if r.city:
        parts.append(r.city)
    if r.province:
        parts.append(f"{r.province} {r.postal_code}".strip() if r.postal_code else r.province)
    elif r.postal_code:
        parts.append(r.postal_code)
    if r.country:
        parts.append(r.country)
    return ", ".join(parts) if parts else ""


def recent_visit_count(r: Restaurant, now: Optional[datetime.datetime] = None) -> int:
    """
    Calculate the number of visits within the trailing 3 calendar months.
    Conforms strictly to the web application's recentVisitCount() algorithm.
    """
    if now is None:
        now = datetime.datetime.now(datetime.timezone.utc)

    # Calculate exact 3-calendar-month boundary
    target_year = now.year
    target_month = now.month - 3
    if target_month < 1:
        target_month += 12
        target_year -= 1

    _, max_days = calendar.monthrange(target_year, target_month)
    target_day = min(now.day, max_days)
    boundary = now.replace(year=target_year, month=target_month, day=target_day)

    count = 0
    if r.visit_dates:
        for d_str in r.visit_dates:
            try:
                dt = datetime.datetime.fromisoformat(d_str.replace("Z", "+00:00"))
                if dt >= boundary:
                    count += 1
            except Exception:
                continue
    elif r.last_visited_at:
        try:
            dt = datetime.datetime.fromisoformat(r.last_visited_at.replace("Z", "+00:00"))
            if dt >= boundary:
                count = 1
        except Exception:
            count = 0

    return count


# ==============================================================================
# 5. GMAPS SYNC PLANNER (User Custom Name Preservation)
# ==============================================================================

@dataclass
class SyncPlan:
    """Container for additions and updates produced by the Google Maps sync planner."""
    added: List[dict]
    updates: List[dict]


def plan_gmaps_sync(current: List[Restaurant], incoming: List[dict], source_id: str) -> SyncPlan:
    """
    Plan updates for a tracked Google Maps list without overwriting custom place names.
    Preserves user edits: only updates name if existing name is blank or equals existing gmaps_name.
    """
    by_url = {r.google_maps_url: r for r in current}
    added = []
    updates = []

    for inc in incoming:
        url = inc["google_maps_url"]
        inc_gmaps_name = inc.get("gmaps_name") or inc.get("name")
        safe_name = safe_spreadsheet_text(inc_gmaps_name or "")

        if url not in by_url:
            added.append({
                **inc,
                "name": safe_name,
                "gmaps_name": inc_gmaps_name,
                "source_list_id": source_id,
            })
        else:
            existing = by_url[url]
            should_update_name = not existing.name or existing.name == existing.gmaps_name
            updates.append({
                "google_maps_url": url,
                "name": safe_name if should_update_name else existing.name,
                "gmaps_name": inc_gmaps_name,
            })

    return SyncPlan(added=added, updates=updates)


# ==============================================================================
# 5b. FLET 1.1.x & 0.x CROSS-VERSION COMPATIBILITY HELPERS
# ==============================================================================

# Button class resolver: Flet 1.1.x replaced ElevatedButton with FilledButton / Button
ButtonClass = getattr(ft, "FilledButton", getattr(ft, "Button", getattr(ft, "ElevatedButton", None)))


def make_padding(horizontal: float = 0, vertical: float = 0, all: Optional[float] = None):
    """
    Factory creating padding compatible across both Flet 0.x (ft.padding) and Flet 1.1.x (ft.Padding).
    """
    if all is not None:
        if hasattr(ft, "Padding") and hasattr(ft.Padding, "all"):
            return ft.Padding.all(all)
        if hasattr(ft, "padding") and hasattr(ft.padding, "all"):
            return ft.padding.all(all)
    if hasattr(ft, "Padding") and hasattr(ft.Padding, "symmetric"):
        return ft.Padding.symmetric(horizontal=horizontal, vertical=vertical)
    if hasattr(ft, "padding") and hasattr(ft.padding, "symmetric"):
        return ft.padding.symmetric(horizontal=horizontal, vertical=vertical)
    return None


def make_alignment_center():
    """Resolve center alignment across Flet 1.1.x (ft.Alignment.CENTER) and Flet 0.x (ft.alignment.center)."""
    if hasattr(ft, "Alignment") and hasattr(ft.Alignment, "CENTER"):
        return ft.Alignment.CENTER
    if hasattr(ft, "alignment") and hasattr(ft.alignment, "center"):
        return ft.alignment.center
    return None


def set_button_label(btn, text: str) -> None:
    """Set button label across Flet 0.x (btn.text) and Flet 1.1.x (btn.content)."""
    if hasattr(btn, "content") and (isinstance(btn.content, str) or btn.content is None):
        btn.content = text
    if hasattr(btn, "text"):
        btn.text = text


def show_snack(page: ft.Page, message: str) -> None:
    """Display a snackbar notification compatible with Flet 0.x and Flet 1.1.x."""
    snack = ft.SnackBar(ft.Text(message))
    if hasattr(page, "show_dialog"):
        page.show_dialog(snack)
    elif hasattr(page, "snack_bar"):
        page.snack_bar = snack
        page.snack_bar.open = True
        page.update()
    elif hasattr(page, "overlay"):
        page.overlay.append(snack)
        snack.open = True
        page.update()


def open_dialog(page: ft.Page, dialog: ft.AlertDialog) -> None:
    """Open an alert dialog compatible with Flet 0.x and Flet 1.1.x."""
    if hasattr(page, "show_dialog"):
        page.show_dialog(dialog)
    else:
        dialog.open = True
        page.update()


def close_dialog(page: ft.Page, dialog: ft.AlertDialog) -> None:
    """Close an alert dialog compatible with Flet 0.x and Flet 1.1.x."""
    if hasattr(page, "pop_dialog"):
        page.pop_dialog()
    else:
        dialog.open = False
        page.update()


def open_external_url(page: ft.Page, url: str) -> None:
    """Launch external URL across Flet 0.x, Flet 1.1.x, and desktop environments."""
    if hasattr(page, "launch_url"):
        page.launch_url(url)
    elif hasattr(ft, "UrlLauncher"):
        try:
            page.run_task(ft.UrlLauncher().launch_url, url)
        except Exception:
            import webbrowser
            webbrowser.open(url)
    else:
        import webbrowser
        webbrowser.open(url)


# ==============================================================================
# 6. FLET APPLICATION USER INTERFACE
# ==============================================================================

def main(page: ft.Page) -> None:
    """
    Main application UI setup and lifecycle handler for Flet.
    Initializes Material 3 styling, theme modes, and responsive layout structure.
    """
    page.title = "HungryGoHappy"
    page.theme_mode = ft.ThemeMode.DARK
    page.theme = ft.Theme(color_scheme_seed="#EA580C")
    page.scroll = ft.ScrollMode.ADAPTIVE
    page.horizontal_alignment = ft.CrossAxisAlignment.CENTER

    current_list_code = "default"
    restaurants: List[Restaurant] = []
    current_picked: Optional[Restaurant] = None
    is_spinning = False

    # ---------------- Top Navigation Header ----------------

    list_code_field = ft.TextField(
        value="default",
        label="List Code",
        width=120,
        dense=True,
        prefix_icon=ft.Icons.GROUP,
    )

    theme_btn = ft.IconButton(
        icon=ft.Icons.LIGHT_MODE,
        tooltip="Toggle Light/Dark Theme",
        on_click=lambda e: toggle_theme(e),
    )

    roadmap_btn = ft.IconButton(
        icon=ft.Icons.DESCRIPTION_OUTLINED,
        tooltip="Development Roadmap & Releases History",
        url="https://hungrygohappy.lovable.app/roadmap",
        on_click=lambda e: open_external_url(page, "https://hungrygohappy.lovable.app/roadmap"),
    )

    # ---------------- Location Filter Input ----------------

    filter_field = ft.TextField(
        label="Filter by city, province, or postal code",
        hint_text="e.g. Bangkok, Sukhumvit, 10110",
        prefix_icon=ft.Icons.SEARCH,
        width=380,
        dense=True,
    )

    candidate_count_text = ft.Text(
        "0 places on this list",
        size=12,
        color=ft.Colors.GREY_400,
        text_align=ft.TextAlign.CENTER,
    )

    # ---------------- Picked Restaurant Display ----------------

    prompt_label = ft.Text(
        "HOW ABOUT:",
        size=12,
        weight=ft.FontWeight.BOLD,
        color=ft.Colors.ORANGE_400,
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

    lets_go_btn = ButtonClass(
        content="Let's Go! 🗺️",
        icon=ft.Icons.DIRECTIONS,
        visible=False,
        style=ft.ButtonStyle(
            color=ft.Colors.WHITE,
            bgcolor="#EA580C",
            padding=make_padding(horizontal=24, vertical=16),
            shape=ft.RoundedRectangleBorder(radius=16),
        ),
    )

    # ---------------- Synchronize & Filter Logic ----------------

    def update_candidate_count() -> None:
        """Update the UI counter reflecting how many places match the location filter."""
        candidates = filter_by_location(restaurants, filter_field.value)
        total = len(restaurants)
        if filter_field.value and filter_field.value.strip():
            candidate_count_text.value = f"{len(candidates)} of {total} places match filter"
        else:
            candidate_count_text.value = f"{total} places on this list"
        page.update()

    async def reload_restaurants(e=None) -> None:
        """
        Refresh current list:
        1. Render instantly from local client storage cache.
        2. Query Lovable Cloud asynchronously and update storage with merged rows.
        """
        nonlocal restaurants, current_list_code
        active_code = list_code_field.value.strip().lower() or "default"
        current_list_code = active_code

        # 1. Instant cache load
        cached = load_local_list(page, active_code)
        if cached:
            restaurants = cached
            update_candidate_count()

        # 2. Cloud pull
        cloud_items = await fetch_cloud_restaurants(active_code)
        if cloud_items:
            restaurants = cloud_items
            save_local_list(page, active_code, restaurants)
            update_candidate_count()
            show_snack(page, f"Synced {len(restaurants)} restaurants from Lovable Cloud")

    list_code_field.on_submit = reload_restaurants
    filter_field.on_change = lambda e: update_candidate_count()

    # ---------------- Spin / Roulette Animation ----------------

    async def spin_roulette(e) -> None:
        """
        Execute random selection with slot-machine rolling animation.
        Respects active location filter and picks only from qualifying places.
        """
        nonlocal is_spinning, current_picked
        if is_spinning:
            return

        candidates = filter_by_location(restaurants, filter_field.value)
        if not candidates:
            place_name_text.value = "No restaurants match filter!"
            location_subtext.value = ""
            lets_go_btn.visible = False
            page.update()
            return

        is_spinning = True
        lets_go_btn.visible = False

        # Slot-machine rapid roll across candidates
        total_ticks = 15
        for i in range(total_ticks):
            sample = random.choice(candidates)
            place_name_text.value = sample.name or truncate_for_display(sample.google_maps_url, 40)
            page.update()
            await asyncio.sleep(0.04 + (i * 0.015))

        # Final selection
        current_picked = random.choice(candidates)
        place_name_text.value = current_picked.name or "Selected Restaurant"
        location_subtext.value = location_label(current_picked)
        lets_go_btn.visible = True

        recent_count = recent_visit_count(current_picked)
        set_button_label(lets_go_btn, f"Let's Go! (Visited {current_picked.visits}x, {recent_count} recent)")

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

        # Open Google Maps URL via Android Intent or web browser
        open_external_url(page, current_picked.google_maps_url)

        # Update visit timestamp and counter asynchronously
        await record_visit_cloud(current_picked)
        save_local_list(page, current_list_code, restaurants)
        show_snack(page, f"Visit recorded for {current_picked.name}!")

    lets_go_btn.on_click = on_lets_go_clicked

    # ---------------- Theme Switcher ----------------

    def toggle_theme(e) -> None:
        """Toggle between Dark and Light Material 3 theme modes."""
        page.theme_mode = (
            ft.ThemeMode.LIGHT if page.theme_mode == ft.ThemeMode.DARK else ft.ThemeMode.DARK
        )
        theme_btn.icon = (
            ft.Icons.DARK_MODE if page.theme_mode == ft.ThemeMode.DARK else ft.Icons.LIGHT_MODE
        )
        page.update()

    # ---------------- Add Restaurant Modal Dialog ----------------

    new_url_field = ft.TextField(
        label="Google Maps URL",
        hint_text="https://maps.app.goo.gl/... or https://google.com/maps/place/...",
        autofocus=True,
    )
    new_name_field = ft.TextField(
        label="Custom Name (optional)",
        hint_text="Leave blank to auto-extract",
    )

    async def add_place_to_cloud(e) -> None:
        """Resolve Google Maps link, sanitize name, and insert new place row into Lovable Cloud."""
        target_url = new_url_field.value.strip()
        if not target_url:
            return

        show_snack(page, "Resolving Google Maps place...")
        page.update()

        resolved_url, extracted_name, place_id = await resolve_and_extract_place(target_url)
        raw_name = new_name_field.value.strip() or extracted_name
        final_name = safe_spreadsheet_text(raw_name)

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
            close_dialog(page, add_dialog)
            await reload_restaurants()
            show_snack(page, f"Added {final_name} to {current_list_code}!")
        except Exception as err:
            show_snack(page, f"Save error: {err}")

    def open_add_dialog(e) -> None:
        """Clear form inputs and open the restaurant addition dialog modal."""
        new_url_field.value = ""
        new_name_field.value = ""
        open_dialog(page, add_dialog)

    def close_add_dialog(e) -> None:
        """Dismiss the restaurant addition dialog without making changes."""
        close_dialog(page, add_dialog)

    add_dialog = ft.AlertDialog(
        title=ft.Text("Add Restaurant"),
        content=ft.Column([new_url_field, new_name_field], tight=True),
        actions=[
            ft.TextButton("Cancel", on_click=close_add_dialog),
            ButtonClass("Add to List", on_click=add_place_to_cloud),
        ],
    )
    if not hasattr(page, "show_dialog") and hasattr(page, "overlay"):
        page.overlay.append(add_dialog)

    # ---------------- Main Spin Button ----------------

    spin_button = ButtonClass(
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
            padding=make_padding(vertical=20, horizontal=24),
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
                    on_click=open_add_dialog,
                ),
                roadmap_btn,
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
                    prompt_label,
                    place_name_text,
                    location_subtext,
                    ft.Divider(height=12, color=ft.Colors.TRANSPARENT),
                    lets_go_btn,
                ],
                horizontal_alignment=ft.CrossAxisAlignment.CENTER,
            ),
            padding=24,
            border_radius=24,
            bgcolor=getattr(ft.Colors, "SURFACE_CONTAINER_HIGHEST", getattr(ft.Colors, "SURFACE_CONTAINER_HIGH", "#2A2A2A")),
            width=380,
            alignment=make_alignment_center(),
        ),
        ft.Divider(height=28, color=ft.Colors.TRANSPARENT),

        # Big Spin Action Button
        ft.Container(spin_button, width=340, alignment=make_alignment_center()),
    )

    page.run_task(reload_restaurants)


# ==============================================================================
# 7. ENTRY POINT
# ==============================================================================

if __name__ == "__main__":
    # Support Flet 1.1.x (ft.run) and legacy Flet 0.x (ft.app) entrypoints
    if hasattr(ft, "run"):
        ft.run(main)
    elif hasattr(ft, "app"):
        ft.app(target=main)
