// WebSocket client for connecting to the game server
import { pack, unpack } from "msgpackr";
import {
  Message,
  MessageType,
  ConnectionState,
  PingMessage,
  PongMessage,
} from "@shared/messages";

export class GameClient {
  private ws: WebSocket | null = null;
  private connectionState: ConnectionState = { connected: false };
  private messageHandlers: Map<MessageType, (message: Message) => void> =
    new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private pingInterval: NodeJS.Timeout | null = null;
  private lastPingTime = 0;
  private messageQueue: Message[] = [];
  private onDisconnect?: () => void;

  constructor(private serverUrl: string = "ws://localhost:8080") {
    this.setupDefaultHandlers();
  }

  // Connect to the server
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      console.log(`Connecting to ${this.serverUrl}...`);
      this.ws = new WebSocket(this.serverUrl);

      this.ws.onopen = () => {
        console.log("[CLIENT] Connected to server successfully");
        this.connectionState.connected = true;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.startPingInterval();
        this.flushMessageQueue();
        resolve();
      };

      this.ws.onmessage = async (event) => {
        try {
          let data: Uint8Array;
          if (event.data instanceof Blob) {
            // Convert Blob to Uint8Array
            const arrayBuffer = await event.data.arrayBuffer();
            data = new Uint8Array(arrayBuffer);
          } else if (event.data instanceof ArrayBuffer) {
            data = new Uint8Array(event.data);
          } else {
            data = event.data;
          }

          const message = unpack(data) as Message;
          this.handleMessage(message);
        } catch (error) {
          console.error("Error parsing message:", error);
        }
      };

      this.ws.onclose = (event) => {
        console.log(`Disconnected from server (code: ${event.code})`);
        this.connectionState.connected = false;
        this.stopPingInterval();

        // Call disconnect callback
        if (this.onDisconnect) {
          this.onDisconnect();
        }

        if (
          !event.wasClean &&
          this.reconnectAttempts < this.maxReconnectAttempts
        ) {
          this.attemptReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error("[CLIENT] WebSocket error:", error);
        reject(error);
      };
    });
  }

  // Disconnect from the server
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connectionState.connected = false;
    this.stopPingInterval();
  }

  // Send a message to the server
  send(message: Message) {
    console.log(
      `[CLIENT] Attempting to send message type: ${message.type}, WebSocket state: ${this.ws?.readyState}, connected: ${this.connectionState.connected}`
    );
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        const data = pack(message);
        console.log(`[CLIENT] Packed message, sending ${data.length} bytes`);
        this.ws.send(data);
        console.log(`[CLIENT] Message sent successfully`);
      } catch (error) {
        console.error("[CLIENT] Error sending message:", error);
        // Queue the message for later if connection is temporarily lost
        this.messageQueue.push(message);
      }
    } else {
      // Queue messages if not connected
      this.messageQueue.push(message);
    }
  }

  // Register message handlers
  onMessage<T extends Message>(
    type: MessageType,
    handler: (message: T) => void
  ) {
    this.messageHandlers.set(type, handler as any);
  }

  // Remove message handler
  offMessage(type: MessageType) {
    this.messageHandlers.delete(type);
  }

  // Get current connection state
  getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  // Set player ID for this connection
  setPlayerId(playerId: string) {
    this.connectionState.playerId = playerId;
  }

  // Set disconnect callback
  setDisconnectCallback(callback: () => void) {
    this.onDisconnect = callback;
  }

  private handleMessage(message: Message) {
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      handler(message);
    } else {
      console.warn(`No handler for message type: ${message.type}`);
    }
  }

  private setupDefaultHandlers() {
    // Handle pong messages for latency calculation
    this.onMessage("PONG", (message: PongMessage) => {
      if (this.lastPingTime > 0) {
        const latency = Date.now() - this.lastPingTime;
        this.connectionState.latency = latency;
      }
    });
  }

  private startPingInterval() {
    this.pingInterval = setInterval(() => {
      if (this.connectionState.connected) {
        this.lastPingTime = Date.now();
        const pingMessage: PingMessage = {
          type: "PING",
          timestamp: Date.now(),
          clientTime: Date.now(),
        };
        this.send(pingMessage);
      }
    }, 60000); // Ping every minute
  }

  private stopPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private attemptReconnect() {
    this.reconnectAttempts++;
    console.log(
      `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${this.reconnectDelay}ms...`
    );

    setTimeout(() => {
      this.connect().catch(() => {
        // Reconnection failed, will try again if attempts remain
      });
    }, this.reconnectDelay);

    // Exponential backoff
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000); // Max 30 seconds
  }

  private flushMessageQueue() {
    while (
      this.messageQueue.length > 0 &&
      this.ws?.readyState === WebSocket.OPEN
    ) {
      const message = this.messageQueue.shift()!;
      this.send(message);
    }
  }

  // Clean up resources
  destroy() {
    this.disconnect();
    this.messageHandlers.clear();
    this.messageQueue.length = 0;
  }
}
