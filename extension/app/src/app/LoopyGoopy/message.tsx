export enum MessageType {
  start,
  stop,
  init,
}

export function sendMessage(mType: MessageType, payload: any) {}
// todo

export function receiveMessage(mType: MessageType, payload: any) {}
