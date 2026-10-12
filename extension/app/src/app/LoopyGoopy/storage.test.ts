import { load, save, setStorageKey } from "./storage";
import { Field } from "./shared";

describe("media records", () => {
  const media = { id: "youtube:O_vU27GXPpk", sourceUrl: "https://www.youtube.com/watch?v=O_vU27GXPpk", title: "Ozzy" };
  const key = `loopy-goopy:${media.id}`;
  const config = { [Field.start_time]: "147.55", bookmarks: [{ bookmark_name: "solo 1.2", config: { [Field.start_time]: "147.55" } }], selected_bookmark: "0" };
  beforeEach(() => {
    localStorage.clear();
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    setStorageKey(media.id, media);
  });
  afterEach(() => jest.restoreAllMocks());

  it("persists an independently recoverable URL and title with all bookmarks", async () => {
    save(config);
    expect(JSON.parse(localStorage.getItem(key)!)).toEqual({ version: "v0.0.2", media, config });
    expect(await load()).toEqual(config);
  });

  it("refreshes the title without resetting saved settings", async () => {
    save(config);
    setStorageKey(media.id, { ...media, title: "Updated video title" });
    expect(await load()).toEqual(config);
    expect(JSON.parse(localStorage.getItem(key)!).media.title).toBe("Updated video title");
  });

  it("never falls back to the former shared or duration-based keys", async () => {
    const entry = JSON.stringify({ version: "v0.0.1", config });
    localStorage.setItem("loopy-goopy:last-config", entry);
    localStorage.setItem(`loopy-goopy:${media.sourceUrl}-252.421`, entry);
    expect(await load()).toEqual({ bookmarks: [], selected_bookmark: "" });
  });

  it("rejects a record whose embedded identity belongs to another video", async () => {
    localStorage.setItem(key, JSON.stringify({ version: "v0.0.2", media: { ...media, id: "youtube:xzeGxm72GOo" }, config }));
    expect(await load()).toEqual({ bookmarks: [], selected_bookmark: "" });
  });

  it("does not save records without a source URL", () => {
    setStorageKey(media.id, { ...media, sourceUrl: "" });
    save(config);
    expect(localStorage.getItem(key)).toBeNull();
  });
});
