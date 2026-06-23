import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../../prisma/prisma.service";

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  "jwt-refresh",
) {
  constructor(
    configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>("app.jwt.refreshSecret") || "fallback-secret",
    });
  }

  async validate(payload: { sub: string; email: string; jti: string }) {
    const storedToken = await this.prisma.refreshToken.findFirst({
      where: {
        userId: payload.sub,
        revoked: false,
      },
    });

    if (!storedToken) {
      throw new UnauthorizedException("Refresh token not found or revoked");
    }

    return {
      id: payload.sub,
      email: payload.email,
      family: payload.jti,
    };
  }
}
