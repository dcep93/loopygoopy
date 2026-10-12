import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Main from "./Main";
import getTab from "./LoopyGoopy/getTab";
import { CountInStyle, Field, MessageType } from "./LoopyGoopy/shared";
import { setStorageKey } from "./LoopyGoopy/storage";
import { getRefs, setConfig } from "./LoopyGoopy/utils";

jest.mock("./LoopyGoopy/getTab");

describe("Main bookmark controls", () => {
  let promptMock: jest.SpyInstance;
  let alertMock: jest.SpyInstance;
  let consoleLogMock: jest.SpyInstance;
  let consoleInfoMock: jest.SpyInstance;
  let consoleWarnMock: jest.SpyInstance;
  const localStorageKey = "loopy-goopy:media-123";
  const sharedStorageKey = "loopy-goopy:last-config";

  beforeEach(() => {
    consoleLogMock = jest.spyOn(console, "log").mockImplementation(() => undefined);
    consoleInfoMock = jest.spyOn(console, "info").mockImplementation(() => undefined);
    consoleWarnMock = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    (getTab as jest.MockedFunction<typeof getTab>).mockResolvedValue({
      mediaId: "media-123", sourceUrl: "https://example.com/video", title: "Practice",
    });
    setStorageKey(undefined as unknown as string);
    setConfig({ bookmarks: [], selected_bookmark: "" });
    (window as any).chrome = {
      runtime: {},
      tabs: {
        sendMessage: jest.fn(),
      },
    };
    window.localStorage.clear();
    promptMock = jest.spyOn(window, "prompt").mockImplementation(() => null);
    alertMock = jest.spyOn(window, "alert").mockImplementation(() => undefined);
  });

  afterEach(() => {
    promptMock.mockRestore();
    alertMock.mockRestore();
    consoleLogMock.mockRestore();
    consoleInfoMock.mockRestore();
    consoleWarnMock.mockRestore();
    delete (window as any).chrome;
    window.localStorage.clear();
  });

  function makeConfig(
    configSansBookmarks: Record<string, string> = {},
    bookmarks: Array<{ bookmark_name: string; config: Record<string, string> }> = [],
    selectedBookmark = ""
  ) {
    return {
      ...configSansBookmarks,
      bookmarks,
      selected_bookmark: selectedBookmark,
    };
  }

  function primeStoredConfig(
    configSansBookmarks: Record<string, string> = {},
    bookmarks: Array<{ bookmark_name: string; config: Record<string, string> }> = [],
    selectedBookmark = ""
  ) {
    window.localStorage.setItem(
      localStorageKey,
      JSON.stringify({
        version: "v0.0.2",
        media: { id: "media-123", sourceUrl: "https://example.com/video", title: "Practice" },
        config: makeConfig(configSansBookmarks, bookmarks, selectedBookmark),
      })
    );
  }

  async function renderMain() {
    const view = render(<Main />);
    await waitFor(() => expect(screen.getByText("media-123")).toBeInTheDocument());
    return view;
  }

  function getFieldElement(field: Field) {
    const input = getRefs()[field].current;
    if (!input) throw new Error(`Missing input for ${Field[field]}`);
    return input as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  }

  function getStoredConfig() {
    return JSON.parse(window.localStorage.getItem(localStorageKey) || "{}")
      .config as Record<string, any>;
  }

  it("renders bookmark controls under train loops", async () => {
    await renderMain();

    expect(screen.getByText("train loops:")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "bookmark" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "save bookmark" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "delete bookmark" })).toBeDisabled();
  });

  it("does not warn when no saved config exists yet", async () => {
    await renderMain();

    expect(consoleWarnMock).not.toHaveBeenCalled();
  });

  it("defaults count-in style to track", async () => {
    await renderMain();

    expect(getFieldElement(Field.count__in_style)).toHaveValue(CountInStyle.track.toString());
  });

  it("orders count-in style options with track first and includes metronome", async () => {
    await renderMain();

    const countInStyle = getFieldElement(Field.count__in_style) as HTMLSelectElement;
    expect(Array.from(countInStyle.options).map((option) => option.textContent)).toEqual([
      "track",
      "silent",
      "metronome",
    ]);
  });

  it("renders a load error instead of leaving a rejected init promise uncaught", async () => {
    (getTab as jest.MockedFunction<typeof getTab>).mockRejectedValueOnce(
      "Loopy Goopy could not read media from this tab yet."
    );

    render(<Main />);

    expect(
      await screen.findByText("Loopy Goopy could not read media from this tab yet.")
    ).toBeInTheDocument();
  });

  it("defaults a falsey start time to the video's current time when opening", async () => {
    (getTab as jest.MockedFunction<typeof getTab>).mockResolvedValueOnce({
      mediaId: "media-123", sourceUrl: "https://example.com/video", title: "Practice",
      currentTime: 42.346,
    });
    primeStoredConfig({
      [Field.start_time]: "",
      [Field.original_BPM]: "111",
    });

    await renderMain();

    expect(getFieldElement(Field.start_time)).toHaveValue("42.35");
    expect(getStoredConfig()[Field.start_time]).toBe("42.35");
    expect(getStoredConfig()[Field.original_BPM]).toBe("111");
  });

  it("keeps a saved start time of zero when opening", async () => {
    (getTab as jest.MockedFunction<typeof getTab>).mockResolvedValueOnce({
      mediaId: "media-123", sourceUrl: "https://example.com/video", title: "Practice",
      currentTime: 42.346,
    });
    primeStoredConfig({
      [Field.start_time]: "0",
      [Field.original_BPM]: "111",
    });

    await renderMain();

    expect(getFieldElement(Field.start_time)).toHaveValue("0");
    expect(getStoredConfig()[Field.start_time]).toBe("0");
  });

  it("saves edited fields to the current media key without pressing save bookmark", async () => {
    primeStoredConfig({
      [Field.original_BPM]: "120",
      [Field.beats_per_loop]: "4",
      [Field.start_time]: "0",
    });

    await renderMain();

    fireEvent.change(getFieldElement(Field.start_time), { target: { value: "12.5" } });

    expect(getStoredConfig()[Field.start_time]).toBe("12.5");
    expect(getStoredConfig()[Field.end_time]).toBe("14.50");
    expect(window.localStorage.getItem(sharedStorageKey)).toBeNull();
    expect(window.localStorage.length).toBe(1);
    expect(window.localStorage.key(0)).toBe(localStorageKey);
    expect(promptMock).not.toHaveBeenCalled();
  });

  it("keeps focus in the active input when clicking next and previous", async () => {
    primeStoredConfig({
      [Field.original_BPM]: "120",
      [Field.beats_per_loop]: "4",
      [Field.start_time]: "8",
      [Field.end_time]: "10",
    });

    await renderMain();
    const originalBpm = getFieldElement(Field.original_BPM);
    const nextButton = screen.getByRole("button", { name: "next" });
    const previousButton = screen.getByRole("button", { name: "prev" });

    originalBpm.focus();
    await userEvent.click(nextButton);

    expect(nextButton).toHaveAttribute("tabIndex", "-1");
    expect(document.activeElement).toBe(originalBpm);
    expect(getFieldElement(Field.start_time)).toHaveValue("10.00");
    expect(getFieldElement(Field.end_time)).toHaveValue("12.00");

    await userEvent.click(previousButton);

    expect(previousButton).toHaveAttribute("tabIndex", "-1");
    expect(document.activeElement).toBe(originalBpm);
    expect(getFieldElement(Field.start_time)).toHaveValue("8.00");
    expect(getFieldElement(Field.end_time)).toHaveValue("10.00");
  });

  it("loads the saved config for the current media", async () => {
    primeStoredConfig({
      [Field.original_BPM]: "98",
      [Field.start_time]: "5.5",
    });

    await renderMain();

    expect(getFieldElement(Field.original_BPM)).toHaveValue("98");
    expect(getFieldElement(Field.start_time)).toHaveValue("5.5");
  });

  it("can read an existing media-specific entry without modifying it on open", async () => {
    primeStoredConfig({
      [Field.original_BPM]: "97",
      [Field.start_time]: "4.5",
    });

    const saved = window.localStorage.getItem(localStorageKey);
    await renderMain();

    expect(getFieldElement(Field.original_BPM)).toHaveValue("97");
    expect(getFieldElement(Field.start_time)).toHaveValue("4.5");
    expect(window.localStorage.getItem(localStorageKey)).toBe(saved);
    expect(window.localStorage.getItem(sharedStorageKey)).toBeNull();
  });

  it("keeps each video's settings and bookmarks separate across popup opens", async () => {
    const goldenMediaId = "youtube:xzeGxm72GOo";
    const otherMediaId = "youtube:O_vU27GXPpk";
    const otherStorageKey = `loopy-goopy:${otherMediaId}`;
    const goldenStorageKey = `loopy-goopy:${goldenMediaId}`;
    const otherConfig = JSON.stringify({
      version: "v0.0.2",
        media: { id: otherMediaId, sourceUrl: "https://www.youtube.com/watch?v=O_vU27GXPpk", title: "Ozzy" },
      config: makeConfig(
        { [Field.original_BPM]: "98", [Field.start_time]: "5.5" },
        [{ bookmark_name: "other video preset", config: { [Field.start_time]: "5.5" } }],
        "0"
      ),
    });
    window.localStorage.setItem(otherStorageKey, otherConfig);
    window.localStorage.setItem(sharedStorageKey, otherConfig);
    (getTab as jest.MockedFunction<typeof getTab>).mockResolvedValue({
      mediaId: goldenMediaId, sourceUrl: "https://www.youtube.com/watch?v=xzeGxm72GOo", title: "Practice",
      currentTime: 42.346,
    });

    const view = render(<Main />);
    await screen.findByText(goldenMediaId);

    expect(getFieldElement(Field.start_time)).toHaveValue("42.35");
    expect(getFieldElement(Field.original_BPM)).toHaveValue("");
    expect(screen.queryByRole("option", { name: "other video preset" })).not.toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(goldenStorageKey)!).config.bookmarks).toEqual([]);
    fireEvent.change(getFieldElement(Field.start_time), { target: { value: "12.5" } });
    expect(JSON.parse(window.localStorage.getItem(goldenStorageKey)!).config[Field.start_time]).toBe("12.5");
    expect(window.localStorage.getItem(otherStorageKey)).toBe(otherConfig);
    expect(window.localStorage.getItem(sharedStorageKey)).toBe(otherConfig);

    view.unmount();
    (getTab as jest.MockedFunction<typeof getTab>).mockResolvedValue({
      mediaId: otherMediaId, sourceUrl: "https://www.youtube.com/watch?v=O_vU27GXPpk", title: "Ozzy",
      currentTime: 90,
    });
    render(<Main />);
    await screen.findByText(otherMediaId);

    expect(getFieldElement(Field.start_time)).toHaveValue("5.5");
    expect(getFieldElement(Field.original_BPM)).toHaveValue("98");
    expect(screen.getByRole("combobox", { name: "bookmark" })).toHaveValue("0");
    expect(screen.getByRole("option", { name: "other video preset" })).toBeInTheDocument();
  });

  it("restores the selected bookmark when reopening the popup", async () => {
    primeStoredConfig(
      {
        [Field.original_BPM]: "111",
      },
      [
        {
          bookmark_name: "verse",
          config: {
            [Field.original_BPM]: "120",
          },
        },
      ],
      "0"
    );

    const firstRender = await renderMain();
    expect(screen.getByRole("combobox", { name: "bookmark" })).toHaveValue("0");

    firstRender.unmount();
    setStorageKey(undefined as unknown as string);
    setConfig({ bookmarks: [], selected_bookmark: "" });

    await renderMain();
    expect(screen.getByRole("combobox", { name: "bookmark" })).toHaveValue("0");
  });

  it("loads a selected bookmark into the inputs and clears omitted fields", async () => {
    primeStoredConfig(
      {
        [Field.original_BPM]: "111",
        [Field.beats_per_loop]: "4",
        [Field.notes]: "keep me",
        [Field.count__in_style]: CountInStyle.track.toString(),
      },
      [
        {
          bookmark_name: "verse",
          config: {
            [Field.start_time]: "1.25",
          },
        },
      ]
    );

    const { container } = await renderMain();
    const bookmarkSelect = screen.getByRole("combobox", { name: "bookmark" });

    expect(getFieldElement(Field.original_BPM)).toHaveValue("111");
    expect(getFieldElement(Field.beats_per_loop)).toHaveValue("4");
    expect(container.querySelector("textarea")).toHaveValue("keep me");

    await userEvent.selectOptions(bookmarkSelect, "0");

    expect(getFieldElement(Field.start_time)).toHaveValue("1.25");
    expect(getFieldElement(Field.original_BPM)).toHaveValue("");
    expect(getFieldElement(Field.beats_per_loop)).toHaveValue("");
    expect(getFieldElement(Field.count__in_style)).toHaveValue(CountInStyle.track.toString());
    expect(container.querySelector("textarea")).toHaveValue("");
    expect(getStoredConfig()[Field.start_time]).toBe("1.25");
    expect(getStoredConfig().bookmarks).toHaveLength(1);
  });

  it("seeks to a selected bookmark start time when it changes", async () => {
    (getTab as jest.MockedFunction<typeof getTab>).mockResolvedValue({
      id: 123,
      mediaId: "media-123", sourceUrl: "https://example.com/video", title: "Practice",
    });
    primeStoredConfig(
      {
        [Field.original_BPM]: "111",
        [Field.start_time]: "1.25",
      },
      [
        {
          bookmark_name: "chorus",
          config: {
            [Field.start_time]: "9.5",
          },
        },
      ]
    );

    await renderMain();
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "bookmark" }), "0");

    await waitFor(() =>
      expect(window.chrome.tabs.sendMessage).toHaveBeenCalledWith(
        123,
        { mType: MessageType.seek, payload: { time: 9.5 } },
        expect.any(Function)
      )
    );
  });

  it("seeks to a selected bookmark start time even when it matches the current config", async () => {
    (getTab as jest.MockedFunction<typeof getTab>).mockResolvedValue({
      id: 123,
      mediaId: "media-123", sourceUrl: "https://example.com/video", title: "Practice",
    });
    primeStoredConfig(
      {
        [Field.original_BPM]: "111",
        [Field.start_time]: "9.5",
      },
      [
        {
          bookmark_name: "chorus",
          config: {
            [Field.start_time]: "9.5",
          },
        },
      ]
    );

    await renderMain();
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "bookmark" }), "0");

    await waitFor(() =>
      expect(window.chrome.tabs.sendMessage).toHaveBeenCalledWith(
        123,
        { mType: MessageType.seek, payload: { time: 9.5 } },
        expect.any(Function)
      )
    );
  });

  it("does nothing when switching the bookmark dropdown back to the empty option", async () => {
    primeStoredConfig(
      {
        [Field.original_BPM]: "111",
      },
      [
        {
          bookmark_name: "verse",
          config: {
            [Field.original_BPM]: "120",
          },
        },
      ]
    );

    await renderMain();
    const bookmarkSelect = screen.getByRole("combobox", { name: "bookmark" });
    const originalBpm = getFieldElement(Field.original_BPM);

    await userEvent.selectOptions(bookmarkSelect, "0");
    fireEvent.change(originalBpm, { target: { value: "130" } });
    await userEvent.selectOptions(bookmarkSelect, "");

    expect(originalBpm).toHaveValue("130");
  });

  it("overwrites the selected bookmark when saving", async () => {
    primeStoredConfig(
      {
        [Field.original_BPM]: "111",
      },
      [
        {
          bookmark_name: "verse",
          config: {
            [Field.original_BPM]: "120",
          },
        },
      ]
    );

    await renderMain();
    const bookmarkSelect = screen.getByRole("combobox", { name: "bookmark" });
    const originalBpm = getFieldElement(Field.original_BPM);

    await userEvent.selectOptions(bookmarkSelect, "0");
    fireEvent.change(originalBpm, { target: { value: "140" } });
    await userEvent.click(screen.getByRole("button", { name: "save bookmark" }));

    expect(getStoredConfig().bookmarks).toEqual([
      {
        bookmark_name: "verse",
        config: {
          [Field.original_BPM]: "140",
        },
      },
    ]);
  });

  it("creates a new bookmark via prompt, selects it, and allows duplicate names", async () => {
    primeStoredConfig({
      [Field.original_BPM]: "111",
    });
    promptMock
      .mockImplementationOnce(() => "verse")
      .mockImplementationOnce(() => "verse");

    await renderMain();
    const bookmarkSelect = screen.getByRole("combobox", { name: "bookmark" });
    const saveButton = screen.getByRole("button", { name: "save bookmark" });

    await userEvent.click(saveButton);

    expect(getStoredConfig().bookmarks).toEqual([
      {
        bookmark_name: "verse",
        config: {
          [Field.original_BPM]: "111",
        },
      },
    ]);
    expect(bookmarkSelect).toHaveValue("0");
    expect(screen.getByRole("button", { name: "delete bookmark" })).toBeEnabled();

    await userEvent.selectOptions(bookmarkSelect, "");
    await userEvent.click(saveButton);

    expect(getStoredConfig().bookmarks).toEqual([
      {
        bookmark_name: "verse",
        config: {
          [Field.original_BPM]: "111",
        },
      },
      {
        bookmark_name: "verse",
        config: {
          [Field.original_BPM]: "111",
        },
      },
    ]);
    expect(screen.getAllByRole("option", { name: "verse" })).toHaveLength(2);
    expect(bookmarkSelect).toHaveValue("1");
  });

  it("alerts and aborts save when the prompted name is blank", async () => {
    primeStoredConfig({
      [Field.original_BPM]: "111",
    });
    promptMock.mockImplementation(() => "   ");

    await renderMain();
    const storedBeforeSave = window.localStorage.getItem(localStorageKey);
    await userEvent.click(screen.getByRole("button", { name: "save bookmark" }));

    expect(alertMock).toHaveBeenCalledWith("bookmark name cannot be empty");
    expect(window.localStorage.getItem(localStorageKey)).toBe(storedBeforeSave);
    expect(screen.getByRole("combobox", { name: "bookmark" })).toHaveValue("");
  });

  it("deletes the selected bookmark and disables delete for the empty option", async () => {
    primeStoredConfig(
      {
        [Field.original_BPM]: "111",
      },
      [
        {
          bookmark_name: "verse",
          config: {
            [Field.original_BPM]: "120",
          },
        },
      ]
    );

    await renderMain();
    const bookmarkSelect = screen.getByRole("combobox", { name: "bookmark" });
    const deleteButton = screen.getByRole("button", { name: "delete bookmark" });

    expect(deleteButton).toBeDisabled();

    await userEvent.selectOptions(bookmarkSelect, "0");
    expect(deleteButton).toBeEnabled();

    await userEvent.click(deleteButton);

    expect(getStoredConfig().bookmarks).toEqual([]);
    expect(deleteButton).toBeDisabled();
    expect(bookmarkSelect).toHaveValue("");
  });
});
