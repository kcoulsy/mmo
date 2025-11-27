// WebSocket server for handling client connections and message routing
import WebSocket from "ws";
import { pack, unpack } from "msgpackr";
import {
  Message,
  MessageType,
  PingMessage,
  PongMessage,
  ConnectionState,
} from "@shared/messages";

export interface ConnectedClient {
  ws: WebSocket;
  id: string;
  playerId?: string;
  state: ConnectionState;
  lastActivity: number;
}

export class WebSocketServer {
  private wss: WebSocket.Server;
  private clients: Map<string, ConnectedClient> = new Map();
  private messageHandlers: Map<
    MessageType,
    (client: ConnectedClient, message: Message) => void
  > = new Map();
  private nextClientId = 1;
  private playerManager?: any; // PlayerManager - set externally
  private onConnectionCallback?: (client: ConnectedClient) => void;
  private onDisconnectionCallback?: (client: ConnectedClient) => void;

  constructor(port: number = 8080) {
    this.wss = new WebSocket.Server({ port });
    console.log(`WebSocket server started on port ${port}`);

    this.wss.on("connection", this.handleConnection.bind(this));
    this.wss.on("error", (error) => {
      console.error("WebSocket server error:", error);
    });

    // Set up default message handlers
    this.setupDefaultHandlers();
  }

  private handleConnection(ws: WebSocket, request: any) {
    const clientId = `client_${this.nextClientId++}`;
    const client: ConnectedClient = {
      ws,
      id: clientId,
      state: {
        connected: true,
        latency: 0,
      },
      lastActivity: Date.now(),
    };

    this.clients.set(clientId, client);
    console.log(
      `Client ${clientId} connected. Total clients: ${this.clients.size}`
    );

    // Call connection callback
    if (this.onConnectionCallback) {
      this.onConnectionCallback(client);
    }

    ws.on("message", (data) => {
      try {
        const message = unpack(data as Buffer) as Message;
        this.handleMessage(client, message);
        client.lastActivity = Date.now();
      } catch (error) {
        console.error(`Error parsing message from ${clientId}:`, error);
      }
    });

    ws.on("close", async () => {
      console.log(`Client ${clientId} disconnected`);
      this.clients.delete(clientId);

      // Call disconnection callback
      if (this.onDisconnectionCallback) {
        this.onDisconnectionCallback(client);
      }

      // Remove player from game world if they had one
      if (client.playerId && this.playerManager) {
        await this.playerManager.removePlayer(client.playerId);
        console.log(`Removed player ${client.playerId} due to disconnection`);
      }
    });

    ws.on("error", async (error) => {
      console.error(`Client ${clientId} error:`, error);
      this.clients.delete(clientId);

      // Remove player from game world if they had one
      if (client.playerId && this.playerManager) {
        await this.playerManager.removePlayer(client.playerId);
        console.log(
          `Removed player ${client.playerId} due to connection error`
        );
      }
    });

    // Send initial connection acknowledgment
    this.sendToClient(client, {
      type: "PONG",
      timestamp: Date.now(),
      clientTime: 0,
      serverTime: Date.now(),
    });
  }

  private handleMessage(client: ConnectedClient, message: Message) {
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      handler(client, message);
    } else {
      console.warn(`No handler for message type: ${message.type}`);
    }
  }

  private setupDefaultHandlers() {
    // Handle ping messages for latency measurement
    this.onMessage("PING", (client, message: PingMessage) => {
      const response: PongMessage = {
        type: "PONG",
        timestamp: Date.now(),
        clientTime: message.clientTime,
        serverTime: Date.now(),
      };
      this.sendToClient(client, response);
    });
  }

  // Register message handlers
  onMessage<T extends Message>(
    type: MessageType,
    handler: (client: ConnectedClient, message: T) => void
  ) {
    this.messageHandlers.set(type, handler as any);
  }

  // Send message to specific client
  sendToClient(client: ConnectedClient, message: Message) {
    if (client.ws.readyState === WebSocket.OPEN) {
      try {
        const data = pack(message);
        client.ws.send(data);
      } catch (error) {
        console.error(`Error sending message to client ${client.id}:`, error);
      }
    }
  }

  // Send message to specific client by ID
  sendToClientId(clientId: string, message: Message) {
    const client = this.clients.get(clientId);
    if (client) {
      this.sendToClient(client, message);
    }
  }

  // Broadcast message to all connected clients
  broadcast(message: Message, excludeClientId?: string) {
    const data = pack(message);
    for (const [clientId, client] of this.clients) {
      if (excludeClientId && clientId === excludeClientId) continue;

      if (client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(data);
        } catch (error) {
          console.error(`Error broadcasting to client ${clientId}:`, error);
        }
      }
    }
  }

  // Broadcast message to all clients except the sender
  broadcastExcept(client: ConnectedClient, message: Message) {
    this.broadcast(message, client.id);
  }

  // Get all connected clients
  getClients(): ConnectedClient[] {
    return Array.from(this.clients.values());
  }

  // Get client by ID
  getClient(clientId: string): ConnectedClient | undefined {
    return this.clients.get(clientId);
  }

  // Get client by player ID
  getClientByPlayerId(playerId: string): ConnectedClient | undefined {
    for (const client of this.clients.values()) {
      if (client.playerId === playerId) {
        return client;
      }
    }
    return undefined;
  }

  // Associate a player with a client
  setPlayerForClient(clientId: string, playerId: string) {
    const client = this.clients.get(clientId);
    if (client) {
      client.playerId = playerId;
    }
  }

  // Set the player manager for cleanup callbacks
  setPlayerManager(playerManager: any) {
    this.playerManager = playerManager;
  }

  // Clean up inactive connections
  async cleanupInactiveConnections(maxAge: number = 30000) {
    // 30 seconds default
    const now = Date.now();
    const toRemove: string[] = [];

    for (const [clientId, client] of this.clients) {
      if (now - client.lastActivity > maxAge) {
        toRemove.push(clientId);
        client.ws.close();
      }
    }

    for (const clientId of toRemove) {
      const client = this.clients.get(clientId);
      if (client) {
        this.clients.delete(clientId);

        // Remove player from game world if they had one
        if (client.playerId && this.playerManager) {
          await this.playerManager.removePlayer(client.playerId);
          console.log(
            `Removed inactive player ${client.playerId} (${clientId})`
          );
        } else {
          console.log(`Cleaned up inactive client: ${clientId}`);
        }
      }
    }
  }

  // Register connection callback
  onConnection(callback: (client: ConnectedClient) => void) {
    this.onConnectionCallback = callback;
  }

  // Register disconnection callback
  onDisconnection(callback: (client: ConnectedClient) => void) {
    this.onDisconnectionCallback = callback;
  }

  // Graceful shutdown
  close() {
    console.log("Shutting down WebSocket server...");

    // Close all client connections
    for (const client of this.clients.values()) {
      client.ws.close();
    }
    this.clients.clear();

    // Close server
    this.wss.close();
  }
}
