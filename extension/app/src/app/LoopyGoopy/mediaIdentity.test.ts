import fs from "fs";
import path from "path";
import vm from "vm";

describe("stable media identity", () => {
  let resolve: (page: string, source: string, title: string, driveId?: string) => any;
  beforeAll(() => {
    const frame = {};
    const context: any = {
      window: { self: frame, top: {}, addEventListener: jest.fn() },
      document: { title: "Practice" }, console: { log: jest.fn() }, URL,
    };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, "contentScript.js"), "utf8"), context);
    resolve = context.resolveMediaMetadata;
  });

  it.each([
    "https://www.youtube.com/watch?v=O_vU27GXPpk&t=45&loopygoopy",
    "https://m.youtube.com/watch?v=O_vU27GXPpk&list=playlist",
    "https://youtu.be/O_vU27GXPpk?si=tracking",
    "https://www.youtube.com/shorts/O_vU27GXPpk",
    "https://www.youtube.com/embed/O_vU27GXPpk?start=42",
    "https://www.youtube-nocookie.com/embed/O_vU27GXPpk",
    "https://youtube.googleapis.com/embed/O_vU27GXPpk",
  ])("identifies the same YouTube video across URL forms: %s", (url) => {
    expect(resolve(url, "https://cdn.example.com/expiring-stream?token=1", "Ozzy")).toEqual({
      mediaId: "youtube:O_vU27GXPpk", sourceUrl: "https://www.youtube.com/watch?v=O_vU27GXPpk", title: "Ozzy",
    });
  });

  it("separates videos and ignores title and blob changes", () => {
    const a = resolve("https://www.youtube.com/watch?v=O_vU27GXPpk", "blob:first", "old title");
    const b = resolve("https://www.youtube.com/watch?v=O_vU27GXPpk", "blob:second", "new title");
    const c = resolve("https://www.youtube.com/watch?v=xzeGxm72GOo", "blob:first", "old title");
    expect(a.mediaId).toBe(b.mediaId);
    expect(a.mediaId).not.toBe(c.mediaId);
  });

  it("normalizes Instagram post and reel links without using CDN URLs", () => {
    const a = resolve("https://www.instagram.com/reel/Example123/?tracking=1", "https://cdn.test/a", "Reel");
    const b = resolve("https://www.instagram.com/user/p/Example123/", "https://cdn.test/b", "Post");
    expect(a.mediaId).toBe("instagram:Example123");
    expect(b.mediaId).toBe(a.mediaId);
    expect(a.sourceUrl).toBe("https://www.instagram.com/p/Example123/");
    expect(resolve("https://www.instagram.com/", "https://cdn.test/a", "Feed")).toBeUndefined();
  });

  it("identifies Drive files independently of folders", () => {
    const id = "13qkHjFFcI8GEW34BcWlpnm4NYhC29GqL";
    const a = resolve("https://drive.google.com/drive/folders/folder-a", "", "File", id);
    const b = resolve("https://drive.google.com/drive/folders/folder-b", "", "File", id);
    const c = resolve(`https://drive.google.com/file/d/${id}/view`, "", "File");
    expect(a).toEqual(b);
    expect(c).toEqual(a);
    expect(a.mediaId).toBe(`drive:${id}`);
    expect(resolve("https://drive.google.com/drive/folders/folder-a", "", "Folder")).toBeUndefined();
  });

  it("keys local files by their full file URL", () => {
    const a = resolve("file:///videos/practice.mp4#t=2", "", "Practice");
    const b = resolve("file:///videos/player.html", "file:///videos/practice.mp4", "Player");
    expect(a.mediaId).toBe("file:file:///videos/practice.mp4");
    expect(b.mediaId).toBe(a.mediaId);
    expect(a.sourceUrl).toBe("file:///videos/practice.mp4");
  });

  it("does not mistake lookalike domains for YouTube", () => {
    expect(resolve("https://notyoutube.com/watch?v=O_vU27GXPpk", "", "Other").mediaId).toBe("url:https://notyoutube.com/watch?v=O_vU27GXPpk");
    expect(resolve("https://www.youtube.com/", "blob:test", "YouTube")).toBeUndefined();
  });
});
