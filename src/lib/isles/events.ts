import { Schema } from "effect";
import * as EventGroup from "effect/unstable/eventlog/EventGroup";
import * as EventLog from "effect/unstable/eventlog/EventLog";
import { EmptyName, Hungry, IsleFull, MissingPet, Sleepy, Stuffed } from "@/lib/isles/errors";

const SpeciesSchema = Schema.Literals(["pip", "nub", "bean"]);

const CritterId = Schema.Struct({
  id: Schema.String,
});

const HatchedPayload = Schema.Struct({
  id: Schema.String,
  species: SpeciesSchema,
  name: Schema.String,
});

const NamedPayload = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
});

const SnapshotPayload = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  species: SpeciesSchema,
  belly: Schema.Number,
  mood: Schema.Number,
  energy: Schema.Number,
  xp: Schema.Number,
});

export const CritterEvents = EventGroup.empty
  .add({
    tag: "Hatched",
    primaryKey: (payload) => payload.id,
    payload: HatchedPayload,
    error: IsleFull,
  })
  .add({
    tag: "Named",
    primaryKey: (payload) => payload.id,
    payload: NamedPayload,
    error: Schema.Union([MissingPet, EmptyName]),
  })
  .add({
    tag: "Fed",
    primaryKey: (payload) => payload.id,
    payload: CritterId,
    error: Schema.Union([MissingPet, Stuffed]),
  })
  .add({
    tag: "Played",
    primaryKey: (payload) => payload.id,
    payload: CritterId,
    error: Schema.Union([MissingPet, Hungry, Sleepy]),
  })
  .add({
    tag: "Slept",
    primaryKey: (payload) => payload.id,
    payload: CritterId,
    error: MissingPet,
  })
  .add({
    tag: "Released",
    primaryKey: (payload) => payload.id,
    payload: CritterId,
    error: MissingPet,
  })
  .add({
    tag: "Snapshot",
    primaryKey: (payload) => payload.id,
    payload: SnapshotPayload,
  });

export const critterLogSchema = EventLog.schema(CritterEvents);
