import { format, transports } from "winston";
import { WinstonModuleOptions, utilities } from "nest-winston";

const isProduction = process.env.NODE_ENV === "production";

export const winstonConfig: WinstonModuleOptions = {
  transports: [
    new transports.Console({
      format: isProduction
        ? format.combine(format.timestamp(), format.json())
        : format.combine(
            format.timestamp(),
            format.ms(),
            utilities.format.nestLike("IRED", {
              colors: true,
              prettyPrint: true,
            }),
          ),
    }),
  ],
};
