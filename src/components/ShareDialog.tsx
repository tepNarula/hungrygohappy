import { useEffect, useState } from "react";
import { Copy, Download } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { restaurantsToCsv, type Restaurant } from "@/lib/restaurants";

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

  useEffect(() => {
    if (!open) return;
    const path = list === "default" ? "/" : `/${encodeURIComponent(list)}`;
    setUrl(`${window.location.origin}${path}?view=all`);
    setCopied(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[60]">
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
      </DialogContent>
    </Dialog>
  );
}
