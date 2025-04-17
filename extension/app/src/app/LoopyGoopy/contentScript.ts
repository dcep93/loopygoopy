export enum MessageType {
  start,
  stop,
  init,
}

function activate() {
  alert("activated");
}

if (window.exports) activate();
