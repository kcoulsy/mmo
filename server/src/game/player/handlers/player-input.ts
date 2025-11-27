import { PlayerInputMessage } from "@shared/messages";
import { registerHandler } from "src/core/types";

export const playerInputHandler = registerHandler(
  "PLAYER_INPUT",
  (ctx, message: PlayerInputMessage) => {
    const { session, world } = ctx;
    const { client } = session;
    const { playerManager } = world;

    playerManager.handlePlayerInput(client, message);
  }
);
