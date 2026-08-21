import { Context, Effect, Layer, Ref, Scope } from "effect";
import * as EventLog from "effect/unstable/eventlog/EventLog";
import {
  EventLogAuthentication,
  EventLogRemoteRpcs,
  StoreId,
} from "effect/unstable/eventlog/EventLogMessage";
import * as EventLogRemote from "effect/unstable/eventlog/EventLogRemote";
import * as EventLogServerUnencrypted from "effect/unstable/eventlog/EventLogServerUnencrypted";
import type * as Rpc from "effect/unstable/rpc/Rpc";
import * as RpcClient from "effect/unstable/rpc/RpcClient";
import type * as RpcGroup from "effect/unstable/rpc/RpcGroup";
import type { FromServer } from "effect/unstable/rpc/RpcMessage";
import * as RpcServer from "effect/unstable/rpc/RpcServer";
import { CritterEvents, critterLogSchema } from "@/lib/isles/events";

const storeId = StoreId.make("default");

const layerAcceptAll = EventLog.group(CritterEvents, (handlers) =>
  handlers
    .handle("Hatched", () => Effect.void)
    .handle("Named", () => Effect.void)
    .handle("Fed", () => Effect.void)
    .handle("Played", () => Effect.void)
    .handle("Slept", () => Effect.void)
    .handle("Released", () => Effect.void)
    .handle("Snapshot", () => Effect.void),
);

const layerAllowAll = Layer.succeed(EventLogServerUnencrypted.EventLogServerAuthorization, {
  authorizeWrite: () => Effect.void,
  authorizeRead: () => Effect.void,
  authorizeIdentity: () => Effect.void,
});

type RemoteRpcs = RpcGroup.Rpcs<typeof EventLogRemoteRpcs>;
type ServerRpc = Rpc.ToHandler<RemoteRpcs> | EventLogAuthentication;

export class ServerDown extends Error {
  readonly _tag = "ServerDown";
  constructor() {
    super("EventLog server is down");
  }
}

/**
 * One in-process EventLog server. Each `connectClient` is a distinct RPC
 * session against the same memory store. `setUp(false)` drops every session so
 * the hub can go down without wiping journals.
 */
export class IsleServer extends Context.Service<
  IsleServer,
  {
    readonly storeId: typeof storeId;
    readonly up: Effect.Effect<boolean>;
    readonly setUp: (up: boolean) => Effect.Effect<void>;
    readonly connectClient: Effect.Effect<
      EventLogRemote.EventLogRemoteClient["Service"],
      ServerDown,
      Scope.Scope
    >;
  }
>()("isles/IsleServer") {}

export const layerIsleServer = Layer.effect(
  IsleServer,
  Effect.gen(function* () {
    const services = yield* Effect.context<ServerRpc>();
    const writers = new Map<number, (response: FromServer<RemoteRpcs>) => Effect.Effect<void>>();
    const available = yield* Ref.make(true);
    let nextId = 1;

    const rpcServer = yield* RpcServer.makeNoSerialization(EventLogRemoteRpcs, {
      disableTracing: true,
      onFromServer(response) {
        const write = writers.get(response.clientId);
        return write ? write(response) : Effect.void;
      },
    }).pipe(Effect.provideContext(services));

    const dropClients = Effect.gen(function* () {
      const ids = [...writers.keys()];
      writers.clear();
      yield* Effect.forEach(ids, (id) => rpcServer.disconnect(id), { discard: true });
    });

    return IsleServer.of({
      storeId,
      up: Ref.get(available),
      setUp: (up) =>
        Effect.gen(function* () {
          const current = yield* Ref.get(available);
          if (current === up) return;
          yield* Ref.set(available, up);
          if (!up) yield* dropClients;
        }),
      connectClient: Effect.gen(function* () {
        if (!(yield* Ref.get(available))) {
          return yield* Effect.fail(new ServerDown());
        }
        const clientId = nextId++;
        const rpc = yield* RpcClient.makeNoSerialization(EventLogRemoteRpcs, {
          supportsAck: true,
          disableTracing: true,
          onFromClient({ message }) {
            return rpcServer.write(clientId, message);
          },
        });
        writers.set(clientId, rpc.write);
        yield* Effect.addFinalizer(() =>
          Effect.sync(() => {
            writers.delete(clientId);
          }).pipe(Effect.andThen(rpcServer.disconnect(clientId))),
        );
        return rpc.client;
      }),
    });
  }),
).pipe(
  Layer.provide(EventLogServerUnencrypted.layerNoRpcServer(critterLogSchema, layerAcceptAll)),
  Layer.provide(EventLogServerUnencrypted.layerStorageMemory),
  Layer.provide(EventLogServerUnencrypted.layerStoreMappingStatic({ storeId })),
  Layer.provide(layerAllowAll),
);
