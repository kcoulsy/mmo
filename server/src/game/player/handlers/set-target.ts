import { SetTargetMessage, TargetInfoMessage } from "@shared/messages";
import { registerHandler } from "../../../core/types";

export const setTargetHandler = registerHandler(
  "SET_TARGET",
  (ctx, message: SetTargetMessage) => {
    const { session, world } = ctx;
    const { client } = session;

    if (!client.playerId) return;

    console.log(
      `Player ${client.playerId} targeting entity ${message.targetEntityId}`
    );

    const targetInfo = world.playerManager.getTargetInfo(
      message.targetEntityId
    );
    console.log(`Target info result:`, targetInfo);
    if (targetInfo) {
      const targetMessage: TargetInfoMessage = {
        type: "TARGET_INFO",
        timestamp: Date.now(),
        targetEntityId: message.targetEntityId,
        targetInfo,
      };
      console.log(`Sending target info:`, targetMessage);
      session.send(targetMessage);
    } else {
      console.log(`No target info found for entity ${message.targetEntityId}`);
    }
  }
);
