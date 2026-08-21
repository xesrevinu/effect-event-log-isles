import { Cause, Schema } from "effect";

export class IsleFull extends Schema.TaggedError<IsleFull>()("IsleFull", {}) {}
export class MissingPet extends Schema.TaggedError<MissingPet>()("MissingPet", {}) {}
export class Stuffed extends Schema.TaggedError<Stuffed>()("Stuffed", {}) {}
export class Hungry extends Schema.TaggedError<Hungry>()("Hungry", {}) {}
export class Sleepy extends Schema.TaggedError<Sleepy>()("Sleepy", {}) {}
export class EmptyName extends Schema.TaggedError<EmptyName>()("EmptyName", {}) {}

const TAG_TO_CODE: Record<string, string> = {
  IsleFull: "full",
  MissingPet: "missing",
  Stuffed: "stuffed",
  Hungry: "hungry",
  Sleepy: "sleepy",
  EmptyName: "noname",
};

export function handlerErrorCode(error: unknown): string {
  return formatWriteError(error).code;
}

export function formatWriteError(error: unknown): { code: string; detail?: string } {
  if (error && typeof error === "object" && "_tag" in error) {
    const code = TAG_TO_CODE[String((error as { _tag: string })._tag)];
    if (code) return { code };
  }
  return { code: "jam", detail: errorDetail(error) };
}

export function formatWriteCause(cause: Cause.Cause<unknown>): { code: string; detail?: string } {
  const formatted = formatWriteError(Cause.squash(cause));
  if (formatted.code !== "jam") return formatted;
  return { code: "jam", detail: Cause.pretty(cause) };
}

function errorDetail(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
