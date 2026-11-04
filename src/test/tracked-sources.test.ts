/** Group-link management must never widen its queries or delete imported restaurants. */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const query: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of ["select", "eq", "order", "delete", "in"]) query[method] = vi.fn();
  return { query, from: vi.fn() };
});
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from } }));
import { fetchTrackedSources, removeTrackedSources } from "@/lib/cloud-sync";

/** A small query stub records the table and filters used by each real helper. */
beforeEach(() => {
  vi.clearAllMocks();
  mocks.from.mockReturnValue(mocks.query);
  for (const method of Object.values(mocks.query)) method.mockReturnValue(mocks.query);
  mocks.query["order"]?.mockResolvedValue({ data: [], error: null });
  mocks.query["in"]?.mockResolvedValue({ error: null });
});

describe("Tracked source management", () => {
  it("lists sources only for the normalized active group", async () => {
    await fetchTrackedSources(" Lunch ");
    expect(mocks.from).toHaveBeenCalledWith("gmaps_list_sources");
    expect(mocks.query["eq"]).toHaveBeenCalledWith("list_code", "lunch");
  });
  it("removes only selected tracking records and preserves restaurant data", async () => {
    await removeTrackedSources(" Lunch ", ["source-a", "source-b"]);
    expect(mocks.from.mock.calls).toEqual([["gmaps_list_sources"]]);
    expect(mocks.query["eq"]).toHaveBeenCalledWith("list_code", "lunch");
    expect(mocks.query["in"]).toHaveBeenCalledWith("id", ["source-a", "source-b"]);
  });
});