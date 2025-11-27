import { TargetInfoMessage } from "@shared/messages";
import { registerHandler } from "src/core/types";

export const clearTargetHandler = registerHandler("CLEAR_TARGET", (ctx) => {
  const { session, world } = ctx;
  const { client } = session;

  if (!client.playerId) return;

  const clearTargetMessage: TargetInfoMessage = {
    type: "TARGET_INFO",
    timestamp: Date.now(),
    targetEntityId: "",
    targetInfo: {
      name: "",
      type: "player",
      position: { x: 0, y: 0, z: 0 },
    },
  };

  world.sendToSession(client.id, clearTargetMessage);
});
