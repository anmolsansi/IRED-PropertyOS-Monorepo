import {
  PipeTransform,
  Injectable,
  BadRequestException,
  ArgumentMetadata,
} from "@nestjs/common";
import { ZodSchema } from "zod";

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    if (metadata.type !== "body" && metadata.type !== "query") {
      return value;
    }

    const result = this.schema.safeParse(value);

    if (!result.success) {
      const formattedErrors = result.error.format();
      throw new BadRequestException({
        message: "Validation failed",
        errors: formattedErrors,
      });
    }

    return result.data;
  }
}
