import { PipeTransform, Injectable, BadRequestException } from "@nestjs/common";
import { ZodSchema } from "zod";

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown) {
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
