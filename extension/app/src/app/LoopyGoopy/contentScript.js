export var MessageType;
(function (MessageType) {
    MessageType[MessageType["start"] = 0] = "start";
    MessageType[MessageType["stop"] = 1] = "stop";
    MessageType[MessageType["init"] = 2] = "init";
})(MessageType || (MessageType = {}));
