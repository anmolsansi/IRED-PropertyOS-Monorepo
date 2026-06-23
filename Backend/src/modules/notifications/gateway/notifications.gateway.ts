import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from "@nestjs/websockets";
import { Logger, UseGuards } from "@nestjs/common";
import { Server, Socket } from "socket.io";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

@WebSocketGateway({
  cors: {
    origin: "*",
    credentials: true,
  },
  namespace: "/notifications",
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationsGateway.name);
  private readonly connectedUsers = new Map<string, AuthenticatedSocket>();

  @WebSocketServer()
  server: Server;

  constructor(
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth?.token || client.handshake.query?.token;
      if (!token) {
        this.logger.warn(`Client rejected: No token provided`);
        client.disconnect();
        return;
      }

      const secret = this.config.get<string>("app.jwt.accessSecret");
      const payload = this.jwtService.verify(token as string, { secret });
      client.userId = payload.sub;
      client.userRole = payload.role;

      this.connectedUsers.set(client.id, client);
      this.logger.log(
        `Client connected: ${client.id} (user: ${client.userId})`,
      );

      client.emit("connected", { message: "Connected to notifications" });
    } catch (error) {
      this.logger.warn(`Client rejected: Invalid token`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.connectedUsers.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage("join")
  handleJoin(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { room: string },
  ) {
    if (data.room) {
      client.join(data.room);
      this.logger.log(`Client ${client.id} joined room: ${data.room}`);
    }
  }

  @SubscribeMessage("leave")
  handleLeave(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { room: string },
  ) {
    if (data.room) {
      client.leave(data.room);
      this.logger.log(`Client ${client.id} left room: ${data.room}`);
    }
  }

  sendToUser(userId: string, event: string, data: any) {
    for (const [, client] of this.connectedUsers) {
      if (client.userId === userId) {
        client.emit(event, data);
      }
    }
  }

  sendToRoom(room: string, event: string, data: any) {
    this.server.to(room).emit(event, data);
  }

  broadcastToAdmins(event: string, data: any) {
    for (const [, client] of this.connectedUsers) {
      if (client.userRole === "ADMIN") {
        client.emit(event, data);
      }
    }
  }

  broadcast(event: string, data: any) {
    this.server.emit(event, data);
  }

  getConnectedUsers(): string[] {
    return Array.from(this.connectedUsers.values())
      .map((c) => c.userId)
      .filter((id): id is string => !!id);
  }
}
