import { PlayerMoveMessage } from "@shared/messages";
import { registerHandler } from "../../../core/types";

export const playerMoveHandler = registerHandler(
  "PLAYER_MOVE",
  (ctx, message: PlayerMoveMessage) => {
    const { session, world } = ctx;
    const { client } = session;
    const { playerManager } = world;

    playerManager.handlePlayerMove(client, message);
  }
);
