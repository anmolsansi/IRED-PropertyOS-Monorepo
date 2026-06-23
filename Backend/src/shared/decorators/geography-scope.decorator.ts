import { SetMetadata } from "@nestjs/common";
import { GEOGRAPHY_SCOPE_KEY } from "../guards/geography.guard";

export const GeographyScope = () => SetMetadata(GEOGRAPHY_SCOPE_KEY, true);
