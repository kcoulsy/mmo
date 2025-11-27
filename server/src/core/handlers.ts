// Central handler registration
import { WebSocketServer } from "./network";
import { World } from "./types";

// Import all handlers
import { playerJoinHandler } from "../game/player/handlers/player-join-request";
import { setTargetHandler } from "../game/player/handlers/set-target";
import { clearTargetHandler } from "../game/player/handlers/clear-target";
import { playerMoveHandler } from "../game/player/handlers/player-move";
import { chatMessageHandler } from "../game/player/handlers/chat-message";
import { harvestHandler } from "../game/skills/handlers/harvestHandler";
import { playerInputHandler } from "src/game/player/handlers/player-input";
import { castSpellHandler } from "../game/spells/handlers/cast-spell";
import { MessageType } from "@shared/messages";

export function registerAllHandlers(
  wsServer: WebSocketServer,
  world: World
): void {
  // Collect all handlers
  const handlers = [
    playerJoinHandler,
    clearTargetHandler,
    setTargetHandler,
    playerMoveHandler,
    playerInputHandler,
    chatMessageHandler,
    harvestHandler,
    castSpellHandler,
  ];

  // Register each handler
  for (const handler of handlers) {
    wsServer.onMessage(
      handler.messageType as MessageType,
      (client, message: any) => {
        const session = world.getSession(client.id);
        if (session) {
          handler.handler({ session, world }, message);
        }
      }
    );
  }

  console.log(`Registered ${handlers.length} handlers`);
}
