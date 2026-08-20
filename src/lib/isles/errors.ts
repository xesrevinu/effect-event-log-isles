import { Schema } from "effect";

export class IsleFull extends Schema.TaggedError<IsleFull>()("IsleFull", {}) {}
export class MissingPet extends Schema.TaggedError<MissingPet>()("MissingPet", {}) {}
export class Stuffed extends Schema.TaggedError<Stuffed>()("Stuffed", {}) {}
export class Hungry extends Schema.TaggedError<Hungry>()("Hungry", {}) {}
export class Sleepy extends Schema.TaggedError<Sleepy>()("Sleepy", {}) {}
export class EmptyName extends Schema.TaggedError<EmptyName>()("EmptyName", {}) {}

export type CritterHandlerError =
  | IsleFull
  | MissingPet
  | Stuffed
  | Hungry
  | Sleepy
  | EmptyName;

const TAG_TO_CODE: Record<string, string> = {
  IsleFull: "full",
  MissingPet: "missing",
  Stuffed: "stuffed",
  Hungry: "hungry",
  Sleepy: "sleepy",
  EmptyName: "noname",
};

export function handlerErrorCode(error: unknown): string {
  if (error && typeof error === "object" && "_tag" in error) {
    const code = TAG_TO_CODE[String((error as { _tag: string })._tag)];
    if (code) return code;
  }
  return "jam";
}
