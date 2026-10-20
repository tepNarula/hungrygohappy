<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep the full sortable visit list in a dedicated component opened from the settings panel, so the gear menu remains compact.
- Store individual visit timestamps alongside existing restaurant totals in the existing browser storage; rolling counts use known dates only, since legacy totals cannot reconstruct historical visits.
- Each group-code list is stored in its own browser storage key, and "default" keeps the original key, so existing data carries over with no migration step.
- Restaurant lists sync through the Cloud `restaurants` table keyed by (list_code, google_maps_url) with open group-code RLS; localStorage stays as an offline cache and local-only rows are uploaded on first load, so legacy device data migrates automatically.
- `/` is an instructional FAQ page, not a list; lists live only at `/{code}` (old `/?view=…` links redirect to `/default`).
