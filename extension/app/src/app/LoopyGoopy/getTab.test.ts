describe("getTab", () => {
  let alertMock: jest.SpyInstance;

  beforeEach(() => {
    jest.resetModules();
    alertMock = jest.spyOn(window, "alert").mockImplementation(() => undefined);
  });

  afterEach(() => {
    alertMock.mockRestore();
    delete (window as any).chrome;
  });

  async function importGetTab() {
    return (await import("./getTab")).default;
  }

  it("never falls back to another tab when the active content script is unavailable", async () => {
    (window as any).chrome = {
      tabs: {
        query: jest.fn((_query, callback) => callback([{ id: 42 }])),
        sendMessage: jest.fn((_tabId, _message, callback) => callback(undefined)),
      },
      runtime: { lastError: undefined, sendMessage: jest.fn() },
    };
    const getTab = await importGetTab();
    await expect(getTab({ suppressAlert: true })).rejects.toContain("Reload this page");
    expect(window.chrome.runtime.sendMessage).not.toHaveBeenCalled();
  });

  it("carries the active video's identity, URL, and title into the popup", async () => {
    const response = { success: true, mediaId: "youtube:O_vU27GXPpk", sourceUrl: "https://www.youtube.com/watch?v=O_vU27GXPpk", title: "Ozzy", currentTime: 147.55 };
    (window as any).chrome = {
      tabs: {
        query: jest.fn((_query, callback) => callback([{ id: 42 }])),
        sendMessage: jest.fn((_tabId, _message, callback) => callback(response)),
      },
      runtime: { sendMessage: jest.fn() },
    };
    const getTab = await importGetTab();
    await expect(getTab()).resolves.toEqual({ id: 42, ...response });
  });

  it("asks for a reload instead of saving an old content-script identity", async () => {
    (window as any).chrome = {
      tabs: {
        query: jest.fn((_query, callback) => callback([{ id: 42 }])),
        sendMessage: jest.fn((_tabId, _message, callback) => callback({ success: true, mediaId: "old-url-252.421" })),
      },
      runtime: { sendMessage: jest.fn() },
    };
    const getTab = await importGetTab();
    await expect(getTab({ suppressAlert: true })).rejects.toContain("reloaded");
    expect(window.chrome.runtime.sendMessage).not.toHaveBeenCalled();
  });

  it("rejects with a helpful message when the content script returns null", async () => {
    (window as any).chrome = {
      tabs: {
        query: jest.fn((_query, callback) => callback([{ id: 42 }])),
        sendMessage: jest.fn((_tabId, _message, callback) => callback(null)),
      },
      runtime: {
        lastError: undefined,
        sendMessage: jest.fn(),
      },
    };

    const getTab = await importGetTab();

    await expect(getTab()).rejects.toBe(
      "Loopy Goopy could not read media from this tab yet."
    );
    expect(alertMock).toHaveBeenCalledWith(
      "Loopy Goopy could not read media from this tab yet."
    );
  });
});

export {};
