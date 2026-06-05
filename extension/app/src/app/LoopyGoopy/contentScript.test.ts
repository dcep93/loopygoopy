const MessageType = {
  start: 0,
  stop: 1,
  init: 2,
  debug: 3,
  seek: 4,
};

type RuntimeListener = (
  data: unknown,
  sender: unknown,
  sendResponse: (response: any) => void
) => boolean;

describe("contentScript media rediscovery", () => {
  let runtimeListener: RuntimeListener;
  let alertMock: jest.SpyInstance;
  let consoleInfoMock: jest.SpyInstance;
  let consoleLogMock: jest.SpyInstance;

  beforeEach(async () => {
    jest.resetModules();
    document.body.innerHTML = "";
    document.title = "Practice";
    alertMock = jest.spyOn(window, "alert").mockImplementation(() => undefined);
    consoleInfoMock = jest.spyOn(console, "info").mockImplementation(() => undefined);
    consoleLogMock = jest.spyOn(console, "log").mockImplementation(() => undefined);
    (window as any).chrome = {
      runtime: {
        onMessage: {
          addListener: jest.fn((listener: RuntimeListener) => {
            runtimeListener = listener;
          }),
        },
        getURL: jest.fn((path: string) => path),
      },
    };
  });

  afterEach(() => {
    alertMock.mockRestore();
    consoleInfoMock.mockRestore();
    consoleLogMock.mockRestore();
    delete (window as any).chrome;
    jest.useRealTimers();
  });

  async function loadContentScript() {
    require("./contentScript.js");
    await Promise.resolve();
  }

  function makeVideo(duration: number, currentTime: number, area = 0) {
    const video = document.createElement("video");
    Object.defineProperty(video, "duration", {
      configurable: true,
      value: duration,
    });
    let isPaused = true;
    Object.defineProperty(video, "paused", {
      configurable: true,
      get: () => isPaused,
    });
    video.currentTime = currentTime;
    video.play = jest.fn().mockImplementation(() => {
      isPaused = false;
      return Promise.resolve(undefined);
    });
    video.pause = jest.fn().mockImplementation(() => {
      isPaused = true;
    });
    video.getBoundingClientRect = jest.fn(
      () =>
        ({
          width: area,
          height: 1,
          top: 0,
          right: area,
          bottom: 1,
          left: 0,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        } as DOMRect)
    );
    document.body.appendChild(video);
    return video;
  }

  function setPageUrl(url: string) {
    window.history.replaceState({}, "", url);
  }

  function sendRuntimeMessage(data: unknown) {
    return new Promise<any>((resolve) => {
      runtimeListener(data, {}, resolve);
    });
  }

  async function flushPromises(times = 8) {
    for (let i = 0; i < times; i += 1) {
      await Promise.resolve();
    }
  }

  function capturePlaybackRates(video: HTMLVideoElement) {
    const playbackRates: number[] = [];
    let playbackRate = 1;
    Object.defineProperty(video, "playbackRate", {
      configurable: true,
      get: () => playbackRate,
      set: (value: number) => {
        playbackRate = value;
        playbackRates.push(value);
      },
    });
    return playbackRates;
  }

  async function collectTrainingPlaybackRates(
    config: Record<number, number>,
    loopCount: number
  ) {
    jest.useFakeTimers();
    const video = makeVideo(30, 0, 640);
    const playbackRates = capturePlaybackRates(video);
    await loadContentScript();

    runtimeListener(
      {
        mType: MessageType.start,
        payload: { config },
      },
      {},
      jest.fn()
    );

    await flushPromises(30);
    for (let i = 0; i < loopCount * 3 && playbackRates.length < loopCount; i += 1) {
      jest.runOnlyPendingTimers();
      await flushPromises(30);
    }
    expect(playbackRates.length).toBeGreaterThanOrEqual(loopCount);
    await sendRuntimeMessage({
      mType: MessageType.stop,
      payload: {},
    });
    return playbackRates.slice(0, loopCount);
  }

  function formatRates(playbackRates: number[]) {
    return playbackRates.map((rate) => rate.toFixed(2));
  }

  it("returns the newly loaded video after the old video is removed", async () => {
    const firstVideo = makeVideo(10, 1.25);
    await loadContentScript();

    const firstResponse = await sendRuntimeMessage({
      mType: MessageType.init,
      payload: {},
    });

    firstVideo.remove();
    makeVideo(20, 4.5);

    const secondResponse = await sendRuntimeMessage({
      mType: MessageType.init,
      payload: {},
    });

    expect(firstResponse).toMatchObject({
      success: true,
      currentTime: 1.25,
    });
    expect(secondResponse).toMatchObject({
      success: true,
      currentTime: 4.5,
    });
    expect(secondResponse.mediaId).not.toBe(firstResponse.mediaId);
  });

  it("prints forwarded popup debug messages in the page console", async () => {
    makeVideo(10, 1.25);
    await loadContentScript();

    await sendRuntimeMessage({
      mType: MessageType.debug,
      payload: {
        level: "log",
        source: "storage",
        message: "save ok",
        details: "{\"storageKey\":\"media-123\"}",
      },
    });

    expect(consoleLogMock).toHaveBeenCalledWith(
      "[LoopyGoopy storage]",
      "save ok",
      "{\"storageKey\":\"media-123\"}"
    );
  });

  it("seeks the current paused video to a requested start time", async () => {
    const video = makeVideo(10, 1.25);
    await loadContentScript();

    const response = await sendRuntimeMessage({
      mType: MessageType.seek,
      payload: { time: 7.5 },
    });

    expect(response).toMatchObject({ success: true });
    expect(video.currentTime).toBe(7.5);
  });

  it("does not seek the current playing video to a requested start time", async () => {
    const video = makeVideo(10, 1.25);
    await video.play();
    await loadContentScript();

    const response = await sendRuntimeMessage({
      mType: MessageType.seek,
      payload: { time: 7.5 },
    });

    expect(response).toMatchObject({ success: true, skipped: true });
    expect(video.currentTime).toBe(1.25);
  });

  it("uses the stable page URL instead of changing blob video URLs for media id", async () => {
    setPageUrl("/watch?v=video-123&t=12s");
    const firstVideo = makeVideo(252.421, 1.25);
    firstVideo.src = "blob:https://www.youtube.com/first-blob-id";
    await loadContentScript();

    const firstResponse = await sendRuntimeMessage({
      mType: MessageType.init,
      payload: {},
    });

    firstVideo.remove();
    const secondVideo = makeVideo(252.421, 4.5);
    secondVideo.src = "blob:https://www.youtube.com/second-blob-id";

    const secondResponse = await sendRuntimeMessage({
      mType: MessageType.init,
      payload: {},
    });

    expect(firstResponse.mediaId).toBe("http://localhost/watch?v=video-123&t=12s-252.421");
    expect(secondResponse.mediaId).toBe(firstResponse.mediaId);
  });

  it("starts playback against the newly loaded video after the old video is removed", async () => {
    jest.useFakeTimers();
    const firstVideo = makeVideo(10, 1.25);
    await loadContentScript();
    firstVideo.remove();
    const secondVideo = makeVideo(20, 4.5);

    runtimeListener(
      {
        mType: MessageType.start,
        payload: {
          config: {
            0: 60,
            7: 3,
            8: 6,
          },
        },
      },
      {},
      jest.fn()
    );

    await flushPromises(30);
    expect(jest.getTimerCount()).toBe(1);
    jest.advanceTimersByTime(1000);
    await flushPromises(30);

    expect(secondVideo.currentTime).toBe(3);
    expect(secondVideo.play).toHaveBeenCalled();
    expect(firstVideo.play).not.toHaveBeenCalled();
  });

  it("does not alert when play is interrupted by a pause request", async () => {
    jest.useFakeTimers();
    const video = makeVideo(20, 0, 640);
    video.play = jest.fn().mockRejectedValue(
      new DOMException(
        "The play() request was interrupted by a call to pause().",
        "AbortError"
      )
    );
    const sendResponse = jest.fn();
    await loadContentScript();

    runtimeListener(
      {
        mType: MessageType.start,
        payload: {
          config: {
            0: 60,
            7: 3,
            8: 6,
          },
        },
      },
      {},
      sendResponse
    );

    await flushPromises(30);
    jest.advanceTimersByTime(1000);
    await flushPromises(30);

    expect(video.play).toHaveBeenCalled();
    expect(alertMock).not.toHaveBeenCalled();
    expect(sendResponse).toHaveBeenCalledWith({
      success: false,
      suppressed: true,
    });
  });

  it("keeps track count-in source length independent of tempo change by default", async () => {
    jest.useFakeTimers();
    const video = makeVideo(30, 0, 640);
    await loadContentScript();

    runtimeListener(
      {
        mType: MessageType.start,
        payload: {
          config: {
            0: 120,
            2: 4,
            4: 0.5,
            7: 10,
            8: 12,
          },
        },
      },
      {},
      jest.fn()
    );

    await flushPromises(30);
    jest.advanceTimersByTime(1000);
    await flushPromises(30);

    expect(video.currentTime).toBe(8);
    expect(video.playbackRate).toBe(0.5);
    expect(video.play).toHaveBeenCalled();
  });

  it("preserves positive train loop linear acceleration", async () => {
    const playbackRates = await collectTrainingPlaybackRates(
      {
        4: 0.6,
        5: 1.0,
        6: 10,
        7: 0,
        8: 0.01,
      },
      12
    );

    expect(formatRates(playbackRates)).toEqual([
      "0.60",
      "0.64",
      "0.68",
      "0.72",
      "0.76",
      "0.80",
      "0.84",
      "0.88",
      "0.92",
      "0.96",
      "1.00",
      "1.00",
    ]);
  });

  it("uses loopback acceleration for negative train loops", async () => {
    const playbackRates = await collectTrainingPlaybackRates(
      {
        4: 0.6,
        5: 1.0,
        6: -10,
        7: 0,
        8: 0.01,
      },
      43
    );

    expect(formatRates(playbackRates.slice(0, 8))).toEqual([
      "0.60",
      "0.64",
      "0.62",
      "0.66",
      "0.64",
      "0.68",
      "0.66",
      "0.70",
    ]);
    expect(formatRates(playbackRates.slice(33, 43))).toEqual([
      "0.96",
      "0.94",
      "0.98",
      "0.96",
      "1.00",
      "0.98",
      "1.02",
      "1.00",
      "1.00",
      "1.00",
    ]);
  });

  it("uses loopback acceleration symmetrically when slowing down", async () => {
    const playbackRates = await collectTrainingPlaybackRates(
      {
        4: 1.0,
        5: 0.6,
        6: -10,
        7: 0,
        8: 0.01,
      },
      43
    );

    expect(formatRates(playbackRates.slice(0, 8))).toEqual([
      "1.00",
      "0.96",
      "0.98",
      "0.94",
      "0.96",
      "0.92",
      "0.94",
      "0.90",
    ]);
    expect(formatRates(playbackRates.slice(33, 43))).toEqual([
      "0.64",
      "0.66",
      "0.62",
      "0.64",
      "0.60",
      "0.62",
      "0.58",
      "0.60",
      "0.60",
      "0.60",
    ]);
  });

  it("plays after a metronome count-in without rewinding the track", async () => {
    jest.useFakeTimers();
    const video = makeVideo(30, 0, 640);
    await loadContentScript();

    runtimeListener(
      {
        mType: MessageType.start,
        payload: {
          config: {
            0: 60,
            2: 2,
            3: 2,
            7: 10,
            8: 12,
          },
        },
      },
      {},
      jest.fn()
    );

    await flushPromises(30);
    jest.advanceTimersByTime(1000);
    await flushPromises(30);

    expect(video.currentTime).toBe(10);
    expect(video.play).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1000);
    await flushPromises(30);

    expect(video.play).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1000);
    await flushPromises(30);

    expect(video.play).toHaveBeenCalled();
  });

  it("switches to the visible current video when the old video remains connected", async () => {
    makeVideo(10, 1.25, 0);
    await loadContentScript();

    const firstResponse = await sendRuntimeMessage({
      mType: MessageType.init,
      payload: {},
    });

    makeVideo(20, 4.5, 640);

    const secondResponse = await sendRuntimeMessage({
      mType: MessageType.init,
      payload: {},
    });

    expect(firstResponse).toMatchObject({
      success: true,
      currentTime: 1.25,
    });
    expect(secondResponse).toMatchObject({
      success: true,
      currentTime: 4.5,
    });
    expect(secondResponse.mediaId).not.toBe(firstResponse.mediaId);
    expect(consoleInfoMock).toHaveBeenCalledWith(
      "[LoopyGoopy]",
      "target refresh",
      expect.objectContaining({
        reason: "init",
      })
    );
  });
});

export {};
