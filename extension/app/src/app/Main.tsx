import { useEffect, useState } from "react";
import ActionButton, { Action } from "./LoopyGoopy/ActionButton";
import { Field } from "./LoopyGoopy/shared";
import getTab from "./LoopyGoopy/getTab";
import Input from "./LoopyGoopy/Input";
import Notes from "./LoopyGoopy/Notes";
import { save, setStorageKey, storageKey } from "./LoopyGoopy/storage";
import Tap from "./LoopyGoopy/Tap";
import {
  applyConfigSansBookmarks,
  getConfig,
  getConfigSansBookmarks,
  loadConfig,
  setConfig,
} from "./LoopyGoopy/utils";

const padding = <div style={{ width: "1em" }}></div>;

function isFalseyStartTime(startTime: string | undefined) {
  return !(parseFloat(startTime ?? "") > 0);
}

export default function Main() {
  const [_storageKey, updateStorageKey] = useState(storageKey);
  const [selectedBookmarkIndex, setSelectedBookmarkIndex] = useState("");
  const [loadError, setLoadError] = useState("");
  const [, setBookmarksVersion] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  useEffect(() => {
    getTab()
      .then((tab) => {
        const tabStorageKey = tab?.mediaId || "Main.tab.mediaId.empty";
        return Promise.resolve()
          .then(() => setStorageKey(tabStorageKey))
          .then(loadConfig)
          .then(() => {
            const currentTime = tab?.currentTime;
            if (
              currentTime !== undefined &&
              Number.isFinite(currentTime) &&
              isFalseyStartTime(getConfig()[Field.start_time])
            ) {
              const nextConfig = {
                ...getConfig(),
                [Field.start_time]: currentTime.toFixed(2),
              };
              setConfig(nextConfig);
              save(nextConfig);
            }
            setSelectedBookmarkIndex(getConfig().selected_bookmark);
            updateStorageKey(tabStorageKey);
          });
      })
      .catch((error) => {
        const message = String(error);
        setLoadError(message);
        updateStorageKey(message);
      });
  }, []);

  if (loadError) {
    return (
      <div
        style={{
          width: "420px",
          padding: "0.75em",
          backgroundColor: "#aaaaaa",
        }}
      >
        {loadError}
      </div>
    );
  }

  const bookmarks = getConfig().bookmarks;
  function persistConfig(selectedBookmark: string, nextBookmarks = getConfig().bookmarks) {
    const nextConfig = {
      ...getConfigSansBookmarks(),
      bookmarks: nextBookmarks,
      selected_bookmark: selectedBookmark,
    };
    setConfig(nextConfig);
    save(nextConfig);
    setSelectedBookmarkIndex(selectedBookmark);
  }

  function updateBookmarks(nextBookmarks: typeof bookmarks, selectedBookmark: string) {
    persistConfig(selectedBookmark, nextBookmarks);
    setBookmarksVersion((version) => version + 1);
  }

  function handleBookmarkSelection(bookmarkIndexStr: string) {
    setSelectedBookmarkIndex(bookmarkIndexStr);
    persistConfig(bookmarkIndexStr);
    if (bookmarkIndexStr === "") return;
    const bookmark = getConfig().bookmarks[parseInt(bookmarkIndexStr)];
    if (!bookmark) return;
    applyConfigSansBookmarks(bookmark.config);
    save(getConfig());
  }

  function handleBookmarkSave() {
    const currentConfig = getConfigSansBookmarks();
    if (selectedBookmarkIndex !== "") {
      const bookmarkIndex = parseInt(selectedBookmarkIndex);
      const nextBookmarks = getConfig().bookmarks.map((bookmark, index) =>
        index === bookmarkIndex ? { ...bookmark, config: { ...currentConfig } } : bookmark
      );
      updateBookmarks(nextBookmarks, selectedBookmarkIndex);
      return;
    }
    const bookmarkName = window.prompt("bookmark name");
    if (bookmarkName === null) return;
    if (bookmarkName.trim() === "") {
      window.alert("bookmark name cannot be empty");
      return;
    }
    const nextBookmarks = getConfig().bookmarks.concat({
      bookmark_name: bookmarkName,
      config: { ...currentConfig },
    });
    updateBookmarks(nextBookmarks, (nextBookmarks.length - 1).toString());
  }

  function handleBookmarkDelete() {
    if (selectedBookmarkIndex === "") return;
    const bookmarkIndex = parseInt(selectedBookmarkIndex);
    updateBookmarks(
      getConfig().bookmarks.filter((_, index) => index !== bookmarkIndex),
      ""
    );
  }

  return (
    <div
      style={{
        width: "800px", // popup.html width
        backgroundColor: "#aaaaaa",
      }}
    >
      <div
        style={{
          display: "flex",
          padding: "0.5em",
        }}
        key={_storageKey}
      >
        <div>
          <Input field={Field.original_BPM} />
          <Input field={Field.beats_per_loop} />
          <Input field={Field.count__in_beats} />
          <Input field={Field.count__in_style} />
        </div>
        {padding}
        <div>
          <Input field={Field.start_time} />
          <Input field={Field.end_time} />
          <Tap />
        </div>
        {padding}
        <div>
          <Input field={Field.tempo_change} />
          <Input field={Field.train_target} />
          <Input field={Field.train_loops} />
          <div
            style={{
              display: "flex",
              gap: "0.25em",
              marginTop: "0.25em",
            }}
          >
            <select
              aria-label="bookmark"
              style={{ flexGrow: 1, minWidth: 0 }}
              value={selectedBookmarkIndex}
              onChange={(e) => handleBookmarkSelection(e.target.value)}
            >
              <option value=""></option>
              {bookmarks.map((bookmark, index) => (
                <option key={`${bookmark.bookmark_name}-${index}`} value={index.toString()}>
                  {bookmark.bookmark_name}
                </option>
              ))}
            </select>
            <button aria-label="save bookmark" onClick={handleBookmarkSave}>
              💾
            </button>
            <button
              aria-label="delete bookmark"
              disabled={selectedBookmarkIndex === ""}
              onClick={handleBookmarkDelete}
            >
              🗑️
            </button>
          </div>
        </div>
        {padding}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <ActionButton action={Action.start} />
          <ActionButton action={Action.stop} />
          <ActionButton action={Action.next} />
          <ActionButton action={Action.previous} />
        </div>
        {padding}
        <div
          style={{
            flexGrow: 1,
          }}
        >
          <Notes />
        </div>
      </div>
    </div>
  );
}
