import * as React from "react";
import * as ReactDOM from "react-dom";
import Room from "./components/Room";

const url = new URL(window.location.href);
const roomName = url.searchParams.get('roomName');
const twilioToken = url.searchParams.get('twilioToken');

console.log(url);
console.log(roomName);
console.log(twilioToken);

ReactDOM.render(
    <Room roomName={roomName} twilioToken={twilioToken} />,
    document.getElementById("root")
);