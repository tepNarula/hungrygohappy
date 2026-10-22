import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Copy, Download, ListPlus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  loadRestaurants,
  normalizeListCode,
  restaurantsToCsv,
  saveRestaurants,
  type Restaurant,
} from "@/lib/restaurants";
import { upsertCloud } from "@/lib/cloud-sync";

type Mode = "share" | "copy" | "copied";

export function ShareDialog({
  open,
  onOpenChange,
  list,
  restaurants,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  list: string;
  restaurants: Restaurant[];
}) {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<Mode>("share");
  const [target, setTarget] = useState("");
  const [keepHistory, setKeepHistory] = useState<"keep" | "fresh">("keep");
  const [copyError, setCopyError] = useState<string | null>(null);
  const [copyResult, setCopyResult] = useState<{ list: string; added: number; skipped: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const path = `/${encodeURIComponent(list)}`;
    setUrl(`${window.location.origin}${path}?view=all`);
    setCopied(false);
    setMode("share");
    setTarget("");
    setKeepHistory("keep");
    setCopyError(null);
    setCopyResult(null);
  }, [open, list]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* ignore: user can select the field */
    }
    setCopied(true);
  };

  const download = () => {
    const blob = new Blob([restaurantsToCsv(restaurants)], { type: "text/csv;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const yyyymmdd = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
    const hhmmss = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    a.download = `HappyGoHungry_${list}_${yyyymmdd}_${hhmmss}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 30_000);
  };

  const copyToList = () => {
    const code = normalizeListCode(target);
    if (!target.trim()) {
      setCopyError("Enter a list name first.");
      return;
    }
    if (code === normalizeListCode(list)) {
      setCopyError("That's the current list — pick a different name.");
      return;
    }
    const existing = loadRestaurants(code);
    const existingIds = new Set(existing.map((r) => r.id));
    const fresh = restaurants.filter((r) => !existingIds.has(r.id));
    const toAdd: Restaurant[] = fresh.map((r) =>
      keepHistory === "keep"
        ? r
        : { id: r.id, googleMapsUrl: r.googleMapsUrl, name: r.name },
    );
    saveRestaurants([...existing, ...toAdd], code);
    upsertCloud(code, toAdd).catch(() => {});
    setCopyResult({ list: code, added: toAdd.length, skipped: restaurants.length - toAdd.length });
    setMode("copied");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[60]">
        {mode === "share" && (
          <>
            <DialogHeader>
              <DialogTitle>Share “{list}” list</DialogTitle>
              <DialogDescription>Anyone with this link opens the full restaurant list.</DialogDescription>
            </DialogHeader>
            <div className="flex gap-2">
              <Input readOnly value={url} aria-label="Share link" onFocus={(e) => e.currentTarget.select()} />
              <Button onClick={copy} variant="secondary">
                <Copy /> {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <Button onClick={download} disabled={restaurants.length === 0}>
              <Download /> Download CSV ({restaurants.length})
            </Button>
            <Button
              variant="outline"
              onClick={() => setMode("copy")}
              disabled={restaurants.length === 0}
            >
              <ListPlus /> Copy to another list
            </Button>
          </>
        )}

        {mode === "copy" && (
          <>
            <DialogHeader>
              <DialogTitle>Copy “{list}” to another list</DialogTitle>
              <DialogDescription>
                Enter an existing list name to merge into it, or a new name to create one.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="target-list">Target list name</Label>
              <Input
                id="target-list"
                value={target}
                onChange={(e) => {
                  setTarget(e.target.value);
                  setCopyError(null);
                }}
                placeholder="e.g. friday-lunch"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") copyToList();
                }}
              />
              {copyError && <p className="text-sm text-destructive">{copyError}</p>}
            </div>
            <RadioGroup
              value={keepHistory}
              onValueChange={(v) => setKeepHistory(v as "keep" | "fresh")}
              className="space-y-2"
            >
              <div className="flex items-start gap-2">
                <RadioGroupItem value="keep" id="keep" className="mt-1" />
                <Label htmlFor="keep" className="font-normal">
                  <span className="font-medium">Keep visit history</span>
                  <br />
                  <span className="text-muted-foreground text-sm">
                    Copied places keep their visit counts and dates.
                  </span>
                </Label>
              </div>
              <div className="flex items-start gap-2">
                <RadioGroupItem value="fresh" id="fresh" className="mt-1" />
                <Label htmlFor="fresh" className="font-normal">
                  <span className="font-medium">Start fresh</span>
                  <br />
                  <span className="text-muted-foreground text-sm">
                    Copied places start with zero visits.
                  </span>
                </Label>
              </div>
            </RadioGroup>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setMode("share")}>
                Back
              </Button>
              <Button onClick={copyToList} className="flex-1">
                Copy {restaurants.length} place{restaurants.length === 1 ? "" : "s"}
              </Button>
            </div>
          </>
        )}

        {mode === "copied" && copyResult && (
          <>
            <DialogHeader>
              <DialogTitle>Copied to “{copyResult.list}”</DialogTitle>
              <DialogDescription>
                Added {copyResult.added} place{copyResult.added === 1 ? "" : "s"}
                {copyResult.skipped > 0 &&
                  `, skipped ${copyResult.skipped} already there`}
                .
              </DialogDescription>
            </DialogHeader>
            <Button asChild>
              <Link to="/$list" params={{ list: copyResult.list }} onClick={() => onOpenChange(false)}>
                Open “{copyResult.list}”
              </Link>
            </Button>
            <Button variant="ghost" onClick={() => setMode("share")}>
              Back to sharing
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
