import { ChatMessage } from "@shared/messages";
import { registerHandler } from "../../../core/types";

export const chatMessageHandler = registerHandler(
  "CHAT_MESSAGE",
  (ctx, message: ChatMessage) => {
    const { session, world } = ctx;
    const { client } = session;
    const { playerManager } = world;

    console.log(
      `[CHAT] Received from ${client.playerId}: "${message.message}" (mode: ${message.mode})`
    );

    if (!client.playerId || !message.message.trim()) {
      console.log(
        `[CHAT] Invalid message - playerId: ${client.playerId}, message: "${message.message}"`
      );
      return;
    }

    const player = playerManager.getPlayer(client.playerId);
    if (!player) {
      console.log(`[CHAT] Player not found for playerId: ${client.playerId}`);
      return;
    }

    // Get sender's position for distance-based filtering
    const senderPosition = player.position;
    const playerData = { id: player.id, name: player.name };

    if (!senderPosition || !playerData) {
      console.log(
        `[CHAT] Missing position or player data for playerId: ${client.playerId}`
      );
      return;
    }

    // Create the chat message with sender info
    const chatMessage: ChatMessage = {
      type: "CHAT_MESSAGE",
      timestamp: Date.now(),
      playerId: client.playerId,
      playerName: player.name,
      message: message.message.trim(),
      mode: message.mode,
      position: {
        x: senderPosition.x,
        y: senderPosition.y,
        z: senderPosition.z || 0,
      },
    };

    // Broadcast based on chat mode
    switch (message.mode) {
      case "say":
        broadcastSayMessage(world, chatMessage, session);
        break;
      case "guild":
        // TODO: Implement guild-based broadcasting
        world.broadcast(chatMessage);
        break;
      case "party":
        // TODO: Implement party-based broadcasting
        world.broadcast(chatMessage);
        break;
      case "global":
      default:
        world.broadcast(chatMessage);
        break;
    }
  }
);

function broadcastSayMessage(
  world: any,
  chatMessage: ChatMessage,
  senderSession: any
) {
  if (!chatMessage.position) return;

  const sayRange = 200; // pixels - adjust as needed
  const { x: senderX, y: senderY } = chatMessage.position;

  // Get all players and check distance
  for (const [sessionId, session] of world.sessions) {
    if (!session.playerId) continue;

    // Don't send to sender (they'll get it below)
    if (sessionId === senderSession.id) continue;

    const playerPosition = world.playerManager.getPlayerPosition(
      session.playerId
    );
    if (playerPosition) {
      // Calculate distance
      const dx = playerPosition.x - senderX;
      const dy = playerPosition.y - senderY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Only send if within range
      if (distance <= sayRange) {
        world.sendToSession(sessionId, chatMessage);
      }
    }
  }

  // Also send to sender so they see their own message
  world.sendToSession(senderSession.id, chatMessage);

  console.log(
    `Player ${chatMessage.playerId} said: "${chatMessage.message}" (range: ${sayRange}px)`
  );
}
