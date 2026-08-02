import { io } from "socket.io-client";
import { socketio_port } from "../../../../sites/common_site_config.json";

// extend window object
declare global {
  interface Window {
    site_name: string;
  }
}

let _socket: ReturnType<typeof io> | null = null;

export function initSocket() {
  if (_socket) return _socket;

  let host = window.location.hostname;
  let siteName = window.site_name || host;
  let port = window.location.port ? `:${socketio_port}` : "";
  let protocol = port ? "http" : "https";
  let url = `${protocol}://${host}${port}/${siteName}`;

  _socket = io(url, {
    withCredentials: true,
  });

  // Nudge reconnect when tab becomes visible after a background sleep/wake.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && _socket && !_socket.connected) {
      _socket.connect();
    }
  });

  return _socket;
}

export const socket = initSocket();
