import { useState } from "react";
import { updateInput } from "./Input";
import { Field } from "./shared";
import { getConfig, getRefs } from "./utils";

function getPitchSemitones() {
  const pitchShift = parseInt(getConfig()[Field.pitch_shift] || "0", 10);
  return Number.isNaN(pitchShift) ? 0 : pitchShift;
}

function formatPitchSemitones(semitones: number) {
  return semitones > 0 ? `+${semitones}` : semitones.toString();
}

export default function Tap() {
  const [pitchSemitones, setPitchSemitones] = useState(getPitchSemitones);

  function changePitch(diff: -1 | 1) {
    const nextPitchSemitones = pitchSemitones + diff;
    setPitchSemitones(nextPitchSemitones);
    updateInput(Field.pitch_shift, nextPitchSemitones.toString(), false);
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <div>determine BPM:</div>
        <button
          onClick={() =>
            Promise.resolve(tapAndGetBpm()).then((bpm) =>
              !bpm
                ? null
                : Promise.resolve(bpm.toFixed(2)).then((bpmStr) =>
                    Promise.resolve()
                      .then(() => updateInput(Field.original_BPM, bpmStr, false))
                      .then(
                        () =>
                          (getRefs()[Field.original_BPM].current.value = bpmStr)
                      )
                  )
            )
          }
        >
          tap
        </button>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ position: "relative" }}>
          change pitch
          <span
            style={{
              position: "absolute",
              left: "100%",
              paddingLeft: "0.25em",
              whiteSpace: "nowrap",
            }}
          >
            ({formatPitchSemitones(pitchSemitones)})
          </span>
        </div>
        <div>
          <button style={{ paddingLeft: "0.25em", paddingRight: "0.25em" }} onClick={() => changePitch(-1)}>-</button>
          <button style={{ paddingLeft: "0.25em", paddingRight: "0.25em" }} onClick={() => changePitch(1)}>+</button>
        </div>
      </div>
    </div>
  );
}

const max_taps = 32;
const taps: number[] = [];

function tapAndGetBpm(): number {
  taps.unshift(Date.now());
  if (taps.length > max_taps) taps.pop();
  const distances = taps.slice(1).map((t, i) => taps[i] - t);
  const avg_distance = distances.reduce((a, b) => a + b, 0) / distances.length;
  const stddev = Math.pow(
    distances
      .map((d) => Math.pow(d - avg_distance, 2))
      .reduce((a, b) => a + b, 0) / distances.length,
    0.5
  );
  if (Math.abs((distances[0] - avg_distance) / stddev) > 4) {
    taps.splice(1);
    return Number.POSITIVE_INFINITY;
  }
  return (60 * 1000) / avg_distance;
}
