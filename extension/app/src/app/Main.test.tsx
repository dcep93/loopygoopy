import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Main from "./Main";
import getTab from "./LoopyGoopy/getTab";
import { CountInStyle, Field } from "./LoopyGoopy/shared";
import { setStorageKey } from "./LoopyGoopy/storage";
import { getRefs, setConfig } from "./LoopyGoopy/utils";

jest.mock("./LoopyGoopy/getTab");

type StoredEntry = {
  version: string;
  config: Record<string, unknown>;
};

describe("Main bookmark controls", () => {
  let storedEntries: Record<string, StoredEntry>;
  let setMock: jest.Mock;
  let getMock: jest.Mock;
  let promptMock: jest.SpyInstance;
  let alertMock: jest.SpyInstance;

  beforeEach(() => {
    (getTab as jest.MockedFunction<typeof getTab>).mockResolvedValue({
      mediaId: "media-123",
    });
    setStorageKey(undefined as unknown as string);
    setConfig({ bookmarks: [], selected_bookmark: "" });
    storedEntries = {};
    setMock = jest.fn((value: Record<string, StoredEntry>) => {
      storedEntries = { ...storedEntries, ...value };
    });
    getMock = jest.fn((key: string, callback: (value: Record<string, StoredEntry>) => void) =>
      callback({ [key]: storedEntries[key] })
    );
    (window as any).chrome = {
      storage: {
        sync: {
          get: getMock,
          set: setMock,
        },
      },
      runtime: {},
      tabs: {},
    };
    promptMock = jest.spyOn(window, "prompt").mockImplementation(() => null);
    alertMock = jest.spyOn(window, "alert").mockImplementation(() => undefined);
  });

  afterEach(() => {
    promptMock.mockRestore();
    alertMock.mockRestore();
    delete (window as any).chrome;
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
    storedEntries["media-123"] = {
      version: "v0.0.1",
      config: makeConfig(configSansBookmarks, bookmarks, selectedBookmark),
    };
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
    return storedEntries["media-123"]?.config as Record<string, any>;
  }

  it("renders bookmark controls under train loops", async () => {
    await renderMain();

    expect(screen.getByText("train loops:")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "bookmark" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "save bookmark" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "delete bookmark" })).toBeDisabled();
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
      mediaId: "media-123",
      currentTime: 42.346,
    });
    primeStoredConfig({
      [Field.start_time]: "0",
      [Field.original_BPM]: "111",
    });

    await renderMain();

    expect(getFieldElement(Field.start_time)).toHaveValue("42.35");
    expect(getStoredConfig()[Field.start_time]).toBe("42.35");
    expect(getStoredConfig()[Field.original_BPM]).toBe("111");
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
    expect(container.querySelector("textarea")).toHaveValue("");
    expect(getStoredConfig()[Field.start_time]).toBe("1.25");
    expect(getStoredConfig().bookmarks).toHaveLength(1);
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
    await userEvent.click(screen.getByRole("button", { name: "save bookmark" }));

    expect(alertMock).toHaveBeenCalledWith("bookmark name cannot be empty");
    expect(setMock).not.toHaveBeenCalled();
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
