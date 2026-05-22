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
