import { Context, Effect, Exit, Layer, SubscriptionRef, Tracer } from "effect";

export type TraceSpan = {
  readonly spanId: string;
  readonly name: string;
  readonly attributes: Readonly<Record<string, unknown>>;
  readonly status: "Started" | "Ended";
  readonly ok: boolean | null;
};

export function traceBeatLabel(span: TraceSpan): string {
  const event = span.attributes.event;
  if (typeof event === "string") return event;
  const name = span.name.replace(/^isles\./, "");
  if (name === "setOnline") return span.attributes.online === true ? "online" : "offline";
  if (name === "setServer") return span.attributes.up === true ? "server" : "down";
  return name;
}

export function traceBeatFailed(span: TraceSpan): boolean {
  return span.attributes.ok === false;
}

const MAX_SPANS = 100;

export function snapshotSpan(span: Tracer.NativeSpan): TraceSpan {
  const attributes = Object.fromEntries(span.attributes);
  const status = span.status;
  return {
    spanId: span.spanId,
    name: span.name,
    attributes,
    status: status._tag,
    ok: status._tag === "Ended" ? Exit.isSuccess(status.exit) : null,
  };
}

export function collectingTracer() {
  const spans: Tracer.NativeSpan[] = [];
  const tracer = Tracer.make({
    span(options) {
      const span = new Tracer.NativeSpan(options);
      spans.push(span);
      return span;
    },
  });
  return { tracer, spans };
}

function makeServiceTracer(
  spans: SubscriptionRef.SubscriptionRef<ReadonlyArray<TraceSpan>>,
): Tracer.Tracer {
  const publish = (native: Tracer.NativeSpan) => {
    Effect.runFork(
      SubscriptionRef.update(spans, (list) => {
        const snap = snapshotSpan(native);
        const index = list.findIndex((row) => row.spanId === snap.spanId);
        if (index === -1) return [...list, snap].slice(-MAX_SPANS);
        return list.map((row, i) => (i === index ? snap : row));
      }),
    );
  };
  return Tracer.make({
    span(options) {
      const native = new Tracer.NativeSpan(options);
      publish(native);
      const end = native.end.bind(native);
      native.end = (endTime, exit) => {
        end(endTime, exit);
        publish(native);
      };
      return native;
    },
  });
}

export class IsleTrace extends Context.Service<
  IsleTrace,
  {
    readonly spans: SubscriptionRef.SubscriptionRef<ReadonlyArray<TraceSpan>>;
    readonly clear: Effect.Effect<void>;
  }
>()("isles/IsleTrace") {}

export const layerTracing = Layer.unwrap(
  Effect.gen(function* () {
    const spans = yield* SubscriptionRef.make<ReadonlyArray<TraceSpan>>([]);
    const service = IsleTrace.of({
      spans,
      clear: SubscriptionRef.set(spans, []),
    });
    return Layer.merge(
      Layer.succeed(IsleTrace, service),
      Layer.succeed(Tracer.Tracer, makeServiceTracer(spans)),
    );
  }),
);
