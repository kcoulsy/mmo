// Session management utilities
import { ConnectedClient } from "./network";
import { Session } from "./types";

export function createSession(client: ConnectedClient): Session {
  return {
    id: client.id,
    client,
    send: (_message: any) => {
      // This will be set when WebSocketServer is initialized
    },
  };
}

export function associatePlayerWithSession(
  session: Session,
  playerId: string
): void {
  session.playerId = playerId;
}

export function dissociatePlayerFromSession(session: Session): void {
  session.playerId = undefined;
}
