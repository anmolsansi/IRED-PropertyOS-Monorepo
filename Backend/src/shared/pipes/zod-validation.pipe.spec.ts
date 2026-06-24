import { BadRequestException } from "@nestjs/common";
import { z } from "zod";
import { ZodValidationPipe } from "./zod-validation.pipe";

describe("ZodValidationPipe", () => {
  const pipe = new ZodValidationPipe(
    z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).default(20),
    }),
  );

  it("validates and coerces query values", () => {
    expect(
      pipe.transform(
        { page: "1", limit: "10" },
        { type: "query", metatype: undefined, data: undefined },
      ),
    ).toEqual({ page: 1, limit: 10 });
  });

  it("skips custom decorator values when used as a method-level pipe", () => {
    expect(
      pipe.transform(undefined, {
        type: "custom",
        metatype: undefined,
        data: "geographicScope",
      }),
    ).toBeUndefined();
  });

  it("skips route params when used as a method-level pipe", () => {
    expect(
      pipe.transform("building-id", {
        type: "param",
        metatype: undefined,
        data: "id",
      }),
    ).toBe("building-id");
  });

  it("throws for invalid query values", () => {
    expect(() =>
      pipe.transform(
        { page: "0", limit: "10" },
        { type: "query", metatype: undefined, data: undefined },
      ),
    ).toThrow(BadRequestException);
  });
});
