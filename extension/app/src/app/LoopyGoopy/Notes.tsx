import { storageKey } from "./storage";

export default function Notes() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div>notes: {storageKey}</div>
      <textarea style={{ flexGrow: 1 }}></textarea>
    </div>
  );
}
