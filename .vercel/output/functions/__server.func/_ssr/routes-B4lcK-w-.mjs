import { r as __toESM } from "../_runtime.mjs";
import { R as require_react, v as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as Undo2, c as Cookie, n as Wind, s as Sparkles, t as X } from "../_libs/lucide-react.mjs";
import { a as wait, c as useI18n, i as unlockAudio, n as useHud, o as Button, r as sfx, s as cn } from "./router-wqPnhnYa.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-B4lcK-w-.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var LABELS = {
	sun: "Sun",
	moon: "Moon"
};
var SPECIES = [
	"pip",
	"nub",
	"bean"
];
function uid(prefix) {
	return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}
function newCritterId() {
	return `c_${Math.random().toString(36).slice(2, 7)}`;
}
function stageFor(xp) {
	if (xp >= 7) return "big";
	if (xp >= 3) return "kid";
	return "egg";
}
function defaultName(species) {
	if (species === "pip") return "Pip";
	if (species === "nub") return "Nub";
	return "Bean";
}
function clamp(n, max) {
	return Math.max(0, Math.min(max, n));
}
function finish(c) {
	return {
		...c,
		stage: stageFor(c.xp),
		belly: clamp(c.belly, 3),
		mood: clamp(c.mood, 3),
		energy: clamp(c.energy, 3)
	};
}
function applyEvent(projection, event, payload, at) {
	const next = { ...projection };
	const id = String(payload.id ?? "");
	if (!id && event !== "Hatched") return next;
	switch (event) {
		case "Hatched": {
			const species = payload.species || "pip";
			next[id] = finish({
				id,
				name: String(payload.name ?? defaultName(species)),
				species,
				belly: 2,
				mood: 2,
				energy: 2,
				xp: 0,
				stage: "egg",
				updatedAt: at
			});
			break;
		}
		case "Named":
			if (next[id]) next[id] = {
				...next[id],
				name: String(payload.name ?? next[id].name),
				updatedAt: at
			};
			break;
		case "Fed":
			if (next[id]) next[id] = finish({
				...next[id],
				belly: next[id].belly + 1,
				xp: next[id].xp + 1,
				updatedAt: at
			});
			break;
		case "Played":
			if (next[id]) next[id] = finish({
				...next[id],
				mood: next[id].mood + 1,
				energy: next[id].energy - 1,
				xp: next[id].xp + 1,
				updatedAt: at
			});
			break;
		case "Slept":
			if (next[id]) next[id] = finish({
				...next[id],
				energy: 3,
				belly: next[id].belly - 1,
				mood: next[id].mood + 1,
				updatedAt: at
			});
			break;
		case "Released":
			delete next[id];
			break;
		case "Snapshot": next[id] = finish({
			id,
			name: String(payload.name ?? "Pip"),
			species: payload.species || "pip",
			belly: Number(payload.belly ?? 0),
			mood: Number(payload.mood ?? 0),
			energy: Number(payload.energy ?? 0),
			xp: Number(payload.xp ?? 0),
			stage: "egg",
			updatedAt: at
		});
	}
	return next;
}
function replay(entries) {
	return entries.reduce((acc, e) => applyEvent(acc, e.event, e.payload, e.createdAt), {});
}
function makeReplica(id) {
	return {
		id,
		label: LABELS[id],
		journal: [],
		projection: {},
		remoteCursor: {},
		seq: 0
	};
}
function handlerError(replica, event, payload) {
	const id = String(payload.id ?? "");
	const pet = replica.projection[id];
	const herd = Object.keys(replica.projection).length;
	switch (event) {
		case "Hatched":
			if (herd >= 2) return "full";
			return null;
		case "Named":
			if (!pet) return "missing";
			if (!String(payload.name ?? "").trim()) return "noname";
			return null;
		case "Fed":
			if (!pet) return "missing";
			if (pet.belly >= 3) return "stuffed";
			return null;
		case "Played":
			if (!pet) return "missing";
			if (pet.belly <= 0) return "hungry";
			if (pet.energy <= 0) return "sleepy";
			return null;
		case "Slept":
			if (!pet) return "missing";
			return null;
		case "Released":
			if (!pet) return "missing";
			return null;
		default: return null;
	}
}
function writeLocal(replica, event, payload, jam = false) {
	const at = Date.now();
	const fail = jam ? "jam" : handlerError(replica, event, payload);
	if (fail) return {
		replica,
		result: {
			ok: false,
			error: fail
		}
	};
	const id = String(payload.id ?? newCritterId());
	const nextPayload = {
		...payload,
		id
	};
	const seq = replica.seq + 1;
	const entry = {
		id: uid("e"),
		event,
		primaryKey: id,
		payload: nextPayload,
		createdAt: at,
		replicaId: replica.id,
		seq
	};
	return {
		replica: {
			...replica,
			seq,
			journal: [...replica.journal, entry],
			projection: applyEvent(replica.projection, event, nextPayload, at)
		},
		result: {
			ok: true,
			entry
		}
	};
}
function syncFrom(source, target) {
	const cursor = target.remoteCursor[source.id] ?? 0;
	const incoming = source.journal.filter((e) => e.seq > cursor);
	const imported = [];
	let conflicts = 0;
	let journal = [...target.journal];
	let projection = target.projection;
	let maxSeq = cursor;
	for (const remote of incoming) {
		if (journal.some((e) => e.id === remote.id)) continue;
		const localHits = journal.filter((e) => e.primaryKey === remote.primaryKey && e.id !== remote.id);
		if (localHits.length) conflicts += localHits.length;
		projection = applyEvent(projection, remote.event, remote.payload, remote.createdAt);
		journal = [...journal, remote];
		imported.push(remote);
		maxSeq = Math.max(maxSeq, remote.seq);
	}
	return {
		target: {
			...target,
			journal,
			projection,
			remoteCursor: {
				...target.remoteCursor,
				[source.id]: maxSeq
			}
		},
		imported,
		conflicts
	};
}
function compactReplica(replica) {
	const keys = [...new Set(replica.journal.map((e) => e.primaryKey))];
	let journal = [...replica.journal];
	let seq = replica.seq;
	let projection = replica.projection;
	let folded = 0;
	for (const key of keys) {
		const related = journal.filter((e) => e.primaryKey === key);
		if (related.length <= 1) continue;
		const pet = projection[key];
		journal = journal.filter((e) => e.primaryKey !== key);
		folded += related.length;
		if (!pet) continue;
		seq += 1;
		const snap = {
			id: uid("e"),
			event: "Snapshot",
			primaryKey: key,
			payload: {
				id: pet.id,
				name: pet.name,
				species: pet.species,
				belly: pet.belly,
				mood: pet.mood,
				energy: pet.energy,
				xp: pet.xp
			},
			createdAt: Date.now(),
			replicaId: replica.id,
			seq
		};
		journal.push(snap);
		projection = applyEvent(projection, "Snapshot", snap.payload, snap.createdAt);
	}
	return {
		replica: {
			...replica,
			journal,
			projection,
			seq
		},
		folded,
		shorter: journal.length < replica.journal.length
	};
}
function wipeProjection(replica) {
	return {
		...replica,
		projection: {}
	};
}
function rebuildProjection(replica) {
	return {
		...replica,
		projection: replay(replica.journal)
	};
}
function herd(replica) {
	return Object.values(replica.projection).sort((a, b) => b.updatedAt - a.updatedAt);
}
function emptyFlags() {
	return {
		rejected: false,
		wiped: false,
		rebuilt: false,
		conflicted: false,
		compacted: false,
		played: false,
		slept: false
	};
}
function sharedIds(a, b) {
	const left = new Set(Object.keys(a.projection));
	return Object.keys(b.projection).filter((k) => left.has(k));
}
function checkMission(id, sun, moon, flags) {
	switch (id) {
		case 1: return herd(sun).length + herd(moon).length > 0;
		case 2: return flags.rejected;
		case 3: return flags.wiped && flags.rebuilt && herd(sun).length + herd(moon).length > 0;
		case 4: return sharedIds(sun, moon).length > 0;
		case 5: return flags.conflicted;
		case 6: return flags.compacted;
	}
}
function spotlightFor(id, flags) {
	switch (id) {
		case 1: return "hatch";
		case 2: return "feed";
		case 3: return flags.wiped ? "replay" : "storm";
		case 4: return "ferry";
		case 5: return "name";
		case 6: return flags.played ? "fold" : "play";
	}
}
function fresh() {
	return {
		sun: makeReplica("sun"),
		moon: makeReplica("moon")
	};
}
var FILL = {
	pip: "#ffc800",
	nub: "#1cb0f6",
	bean: "#58cc02"
};
var STEPS = [
	"client()",
	"EventGroup",
	"handler",
	"journal"
];
function Face({ pet, size = 64 }) {
	const stuffed = pet.belly >= 3;
	const sleepy = pet.energy <= 0;
	const play = pet.mood >= 3 && pet.energy > 0 && !sleepy;
	const sad = pet.mood <= 0 && !play;
	const h = pet.stage === "egg" ? size * .78 : pet.stage === "kid" ? size * .92 : size;
	const w = pet.species === "bean" ? size * .74 : pet.species === "nub" ? size * .9 : size;
	const cx = size / 2;
	const cy = size / 2;
	const eyeY = sleepy || pet.stage === "egg" ? h * .46 : h * .4;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: `0 0 ${size} ${size}`,
		"aria-hidden": true,
		className: "size-full",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ellipse", {
				cx,
				cy: cy + 3,
				rx: w * .44,
				ry: h * .42,
				fill: "rgba(59,42,20,0.12)"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ellipse", {
				cx,
				cy,
				rx: w * .44,
				ry: h * .44,
				fill: FILL[pet.species],
				stroke: "#3b2a14",
				strokeWidth: "3"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ellipse", {
				cx: cx - w * .12,
				cy: cy - h * .14,
				rx: w * .16,
				ry: h * .1,
				fill: "rgba(255,255,255,0.35)"
			}),
			pet.species === "nub" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ellipse", {
				cx: cx - w * .28,
				cy: cy - h * .38,
				rx: size * .09,
				ry: size * .12,
				fill: FILL.nub,
				stroke: "#3b2a14",
				strokeWidth: "2.5"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ellipse", {
				cx: cx + w * .28,
				cy: cy - h * .38,
				rx: size * .09,
				ry: size * .12,
				fill: FILL.nub,
				stroke: "#3b2a14",
				strokeWidth: "2.5"
			})] }) : null,
			pet.species === "bean" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: `M ${cx} ${cy - h * .46} q ${size * .08} ${-size * .16} ${size * .18} ${-size * .04}`,
				fill: "none",
				stroke: "#3b2a14",
				strokeWidth: "3",
				strokeLinecap: "round"
			}) : null,
			pet.stage === "egg" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: `M ${size * .32} ${h * .4} L ${size * .4} ${h * .32} L ${size * .48} ${h * .42} L ${size * .58} ${h * .3} L ${size * .68} ${h * .4}`,
				fill: "none",
				stroke: "#3b2a14",
				strokeWidth: "3"
			}) : sleepy ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: `M ${cx - size * .16} ${eyeY} q ${size * .06} ${size * .05} ${size * .12} 0`,
				fill: "none",
				stroke: "#3b2a14",
				strokeWidth: "3",
				strokeLinecap: "round"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: `M ${cx + size * .04} ${eyeY} q ${size * .06} ${size * .05} ${size * .12} 0`,
				fill: "none",
				stroke: "#3b2a14",
				strokeWidth: "3",
				strokeLinecap: "round"
			})] }) : play ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: `M ${cx - size * .2} ${eyeY} l ${size * .06} ${-size * .05} l ${size * .06} ${size * .05} l ${size * .06} ${-size * .05}`,
				fill: "none",
				stroke: "#3b2a14",
				strokeWidth: "2.6",
				strokeLinejoin: "round"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: `M ${cx + size * .02} ${eyeY} l ${size * .06} ${-size * .05} l ${size * .06} ${size * .05} l ${size * .06} ${-size * .05}`,
				fill: "none",
				stroke: "#3b2a14",
				strokeWidth: "2.6",
				strokeLinejoin: "round"
			})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: cx - size * .12,
					cy: eyeY,
					r: sad ? 2.1 : 3.3,
					fill: "#3b2a14"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: cx + size * .12,
					cy: eyeY,
					r: sad ? 2.1 : 3.3,
					fill: "#3b2a14"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: cx - size * .1,
					cy: eyeY - 1,
					r: 1,
					fill: "#fff"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: cx + size * .14,
					cy: eyeY - 1,
					r: 1,
					fill: "#fff"
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ellipse", {
				cx: cx - w * .22,
				cy: h * .58,
				rx: size * .07,
				ry: size * .045,
				fill: stuffed || play ? "#ff8aa0" : "transparent"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ellipse", {
				cx: cx + w * .22,
				cy: h * .58,
				rx: size * .07,
				ry: size * .045,
				fill: stuffed || play ? "#ff8aa0" : "transparent"
			}),
			stuffed ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ellipse", {
				cx,
				cy: h * .68,
				rx: size * .1,
				ry: size * .07,
				fill: "#3b2a14"
			}) : sad ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: `M ${cx - size * .1} ${h * .7} q ${size * .1} ${-size * .08} ${size * .2} 0`,
				fill: "none",
				stroke: "#3b2a14",
				strokeWidth: "3",
				strokeLinecap: "round"
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: `M ${cx - size * .1} ${h * .64} q ${size * .1} ${size * .12} ${size * .2} 0`,
				fill: "none",
				stroke: "#3b2a14",
				strokeWidth: "3",
				strokeLinecap: "round"
			})
		]
	});
}
function tiltOf(seed, i) {
	return (seed.charCodeAt(i % seed.length) + i * 19) % 17 - 8;
}
function Marks({ n, mark, pulse, seed, tone }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: cn("inline-flex h-8 shrink-0 items-center rounded-full px-1.5", tone),
		children: Array.from({ length: 3 }, (_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: cn("anim-tilt inline-block text-[18px] leading-none", pulse && i < n && "anim-pip"),
			style: {
				["--tilt"]: `${tiltOf(seed + mark, i)}deg`,
				opacity: i < n ? 1 : .2,
				animationDelay: `${i * 90}ms`
			},
			children: mark
		}, i))
	});
}
var EVENT_TONE = {
	Hatched: "bg-sun",
	Named: "bg-grape",
	Fed: "bg-sun",
	Played: "bg-sky",
	Slept: "bg-grape",
	Released: "bg-danger",
	Snapshot: "bg-ok-dim"
};
function payloadLine(payload) {
	return JSON.stringify(payload);
}
function CritterCard({ pet, spot, busy, pulse, pending, onAct }) {
	const [editing, setEditing] = (0, import_react.useState)(false);
	const [draft, setDraft] = (0, import_react.useState)(pet.name);
	const mine = pulse?.petId === pet.id && pulse.ok;
	const waiting = pending?.petId === pet.id;
	const fx = mine ? pulse?.event : void 0;
	const actions = [
		[
			"Fed",
			"sun",
			"feed",
			Cookie
		],
		[
			"Played",
			"sky",
			"play",
			Sparkles
		],
		[
			"Slept",
			"grape",
			null,
			"sleep"
		],
		[
			"Released",
			"danger",
			null,
			X
		]
	];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("relative flex shrink-0 flex-col rounded-[18px] bg-surface px-2.5 py-2", waiting && "ring-2 ring-dashed ring-sky", mine && "anim-flash", pulse?.petId === pet.id && !pulse.ok && "anim-shake"),
		children: [
			fx === "Slept" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "anim-zzz pointer-events-none absolute top-0 right-6 text-[11px] font-black text-grape",
				children: "z"
			}) : null,
			fx === "Played" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "pointer-events-none absolute top-0.5 right-8 text-[11px]",
				children: "✨"
			}) : null,
			fx === "Fed" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "pointer-events-none absolute top-0.5 right-8 text-[12px]",
				children: "🍪"
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: cn("size-14 shrink-0", mine && (fx === "Played" ? "anim-wiggle" : "anim-pop")),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Face, {
						pet,
						size: 64
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0 flex-1",
					children: [editing ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						autoFocus: true,
						value: draft,
						onChange: (e) => setDraft(e.target.value),
						onBlur: () => {
							setEditing(false);
							if (draft.trim() && draft.trim() !== pet.name) onAct("Named", pet, draft.trim());
						},
						onKeyDown: (e) => {
							if (e.key === "Enter") e.target.blur();
						},
						className: cn("h-7 w-full rounded-lg bg-inset px-2 text-sm font-black text-fg", spot === "name" && "ring-2 ring-accent")
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => {
							setDraft(pet.name);
							setEditing(true);
						},
						className: cn("block max-w-full truncate text-left text-base font-black", spot === "name" && "rounded-lg ring-2 ring-accent"),
						children: pet.name
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-1 flex flex-nowrap items-center gap-1.5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Marks, {
								n: pet.belly,
								pulse: mine && fx === "Fed",
								mark: "🍪",
								seed: pet.id,
								tone: "bg-warn-dim"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Marks, {
								n: pet.mood,
								pulse: mine && fx === "Played",
								mark: "✨",
								seed: pet.id,
								tone: "bg-[#f3e2ff]"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Marks, {
								n: pet.energy,
								pulse: mine && fx === "Slept",
								mark: "😴",
								seed: pet.id,
								tone: "bg-info-dim"
							})
						]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-1.5 grid grid-cols-4 gap-1",
				children: actions.map(([event, variant, key, Icon]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					size: "sm",
					variant,
					disabled: busy,
					onClick: () => onAct(event, pet),
					className: cn("h-9 flex-col gap-0 px-0 py-1", key && spot === key && "ring-2 ring-fg", waiting && pending?.event === event && "ring-2 ring-sky", mine && fx === event && "anim-pop ring-2 ring-fg"),
					"aria-label": event,
					children: [Icon === "sleep" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-[16px] leading-none",
						children: "😴"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "size-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-[10px] leading-none font-black",
						children: event
					})]
				}, event))
			})
		]
	});
}
function Isle({ replica, locked, lit, spot, busy, pulse, pending, onAct, onStorm, onReplay, onFold, onPick, onOpenLog }) {
	const { t } = useI18n();
	const pets = herd(replica);
	const sun = replica.id === "sun";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		onClick: onPick,
		className: cn("flex h-full w-full min-h-0 min-w-0 flex-col overflow-hidden rounded-[20px]", sun ? "bg-sun/50" : "bg-sky/30", lit && "anim-flash"),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between gap-2 px-2 py-1",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex min-w-0 items-center gap-1.5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "min-w-0 truncate text-sm font-black",
					children: t(sun ? "isle.sun" : "isle.moon")
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: (e) => {
						e.stopPropagation();
						onOpenLog();
					},
					className: "shrink-0 rounded-full bg-surface px-2 py-0.5 text-[11px] font-black",
					children: ["#", replica.journal.length]
				})]
			}), locked ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex shrink-0 gap-1",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						size: "sm",
						variant: "quiet",
						disabled: busy || replica.journal.length === 0,
						onClick: (e) => {
							e.stopPropagation();
							onStorm();
						},
						className: cn("h-7 px-2", spot === "storm" && "ring-2 ring-fg"),
						"aria-label": "wipe",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wind, { className: "size-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-[10px] font-black",
							children: "wipe"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						size: "sm",
						variant: "quiet",
						disabled: busy || replica.journal.length === 0,
						onClick: (e) => {
							e.stopPropagation();
							onReplay();
						},
						className: cn("h-7 px-2", spot === "replay" && "ring-2 ring-fg"),
						"aria-label": "replay",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Undo2, { className: "size-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-[10px] font-black",
							children: "replay"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "sm",
						variant: "quiet",
						disabled: busy || replica.journal.length < 2,
						onClick: (e) => {
							e.stopPropagation();
							onFold();
						},
						className: cn("h-7 px-2", spot === "fold" && "ring-2 ring-fg"),
						"aria-label": "compact",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-[10px] font-black",
							children: "compact"
						})
					})
				]
			})]
		}), locked ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mx-1.5 mb-1.5 flex flex-1 items-center justify-center rounded-[14px] bg-surface/80",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm font-extrabold text-subtle",
				children: t("isle.locked")
			})
		}) : pets.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mx-1.5 mb-1.5 flex flex-1 items-center justify-center rounded-[14px] bg-surface/80",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm font-extrabold text-subtle",
				children: t("isle.empty")
			})
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mx-1.5 mb-1.5 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto",
			children: pets.map((pet) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CritterCard, {
				pet,
				spot,
				busy,
				pulse,
				pending,
				onAct
			}, pet.id))
		})]
	});
}
function TimelineBar({ forge, failing }) {
	const fill = forge < 0 ? 0 : Math.min(forge, failing ? 2 : forge) / 3;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "shrink-0 px-4 pt-1 pb-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "relative flex items-start justify-between",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "pointer-events-none absolute top-[7px] right-3 left-3 h-[3px] rounded-full bg-faint" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "pointer-events-none absolute top-[7px] left-3 h-[3px] rounded-full bg-accent transition-[width] duration-500",
					style: { width: `calc(${fill} * (100% - 1.5rem))` }
				}),
				STEPS.map((label, i) => {
					const on = forge === i;
					const done = forge > i && !(failing && i >= 2);
					const dead = failing && i === 2;
					const locked = failing && i === 3;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative z-10 flex w-14 flex-col items-center gap-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: cn("size-4 rounded-full", dead && "anim-shake bg-danger", locked && "bg-faint", on && !dead && "anim-pop bg-accent ring-4 ring-ok-dim", done && "bg-accent", !on && !done && !dead && !locked && "bg-surface shadow-[0_0_0_3px_#e8c96a]") }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: cn("text-[11px] font-extrabold", on || dead ? "text-fg" : "text-subtle"),
							children: label.replace("()", "")
						})]
					}, label);
				})
			]
		})
	});
}
function StepToast({ show, failing, text }) {
	const [paint, setPaint] = (0, import_react.useState)(show);
	const [leaving, setLeaving] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		if (show) {
			setPaint(true);
			setLeaving(false);
			return;
		}
		if (!paint) return;
		setLeaving(true);
		const id = window.setTimeout(() => {
			setPaint(false);
			setLeaving(false);
		}, 240);
		return () => window.clearTimeout(id);
	}, [show, paint]);
	if (!paint) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("pointer-events-none absolute inset-x-4 z-20", leaving ? "anim-toast-out" : "anim-toast-in"),
		style: { bottom: "22%" },
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: cn("rounded-2xl px-4 py-3 shadow-[0_10px_28px_rgba(59,42,20,0.16)]", failing ? "bg-danger-dim" : "bg-surface"),
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: cn("anim-copy text-[15px] font-black leading-snug", failing ? "text-danger" : "text-fg"),
				children: text
			}, text)
		})
	});
}
function EventsDialog({ title, sources, attempt, selectedId, onSelect, onClose }) {
	const { t } = useI18n();
	const list = (0, import_react.useRef)(null);
	const len = sources.reduce((n, s) => n + s.replica.journal.length, 0);
	(0, import_react.useEffect)(() => {
		const el = list.current;
		if (el) el.scrollTop = el.scrollHeight;
	}, [len, attempt?.entryId]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "absolute inset-0 z-30",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			className: "absolute inset-0 bg-[rgba(59,42,20,0.46)]",
			onClick: onClose,
			"aria-label": "close events"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "absolute top-[10%] left-1/2 flex max-h-[78%] w-[min(94%,420px)] -translate-x-1/2 flex-col overflow-hidden rounded-[28px] bg-raised shadow-[0_20px_50px_rgba(59,42,20,0.28)] ring-4 ring-fg/10",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between px-4 pt-4 pb-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-base font-black",
					children: title
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: onClose,
					className: "grid size-9 place-items-center rounded-xl bg-surface",
					"aria-label": "close",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-4" })
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				ref: list,
				className: "min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pt-1 pb-5",
				children: [
					len === 0 && !attempt ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "rounded-2xl bg-surface px-3 py-4 text-sm font-bold text-subtle",
						children: t("log.empty")
					}) : null,
					sources.map((src) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-2",
						children: [sources.length > 1 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-[11px] font-black text-muted",
							children: [
								src.label,
								" · #",
								src.replica.journal.length
							]
						}) : null, src.replica.journal.map((e, i) => {
							const on = selectedId === e.id;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => onSelect(on ? null : e.id),
								className: cn("w-full rounded-2xl px-3 py-2.5 text-left", EVENT_TONE[e.event], on && "ring-2 ring-fg"),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "font-mono text-[12px] font-black",
									children: [
										"#",
										i + 1,
										" ",
										e.event
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "break-all font-mono text-[11px] font-bold text-fg/80",
									children: payloadLine(e.payload)
								})]
							}, e.id);
						})]
					}, src.replica.id)),
					attempt && !attempt.ok ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "w-full rounded-2xl bg-danger-dim px-3 py-2.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "font-mono text-[12px] font-black text-danger",
							children: [
								attempt.event,
								" · ",
								t("log.ghost")
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "break-all font-mono text-[11px] font-bold text-fg/70",
							children: payloadLine(attempt.payload)
						})]
					}) : null
				]
			})]
		})]
	});
}
function Workshop() {
	const { t } = useI18n();
	const { setNext, setLog, setSplash } = useHud();
	const [seated, setSeated] = (0, import_react.useState)(false);
	const [world, setWorld] = (0, import_react.useState)(fresh);
	const [active, setActive] = (0, import_react.useState)("sun");
	const [mission, setMission] = (0, import_react.useState)(1);
	const [flags, setFlags] = (0, import_react.useState)(emptyFlags);
	const [won, setWon] = (0, import_react.useState)(false);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [forge, setForge] = (0, import_react.useState)(-1);
	const [failing, setFailing] = (0, import_react.useState)(false);
	const [caption, setCaption] = (0, import_react.useState)("cap.idle");
	const [capParams, setCapParams] = (0, import_react.useState)({});
	const [lit, setLit] = (0, import_react.useState)(null);
	const [attempt, setAttempt] = (0, import_react.useState)(null);
	const [picked, setPicked] = (0, import_react.useState)(null);
	const [logView, setLogView] = (0, import_react.useState)(null);
	const [pulse, setPulse] = (0, import_react.useState)(null);
	const [pending, setPending] = (0, import_react.useState)(null);
	const run = (0, import_react.useRef)(0);
	const moonOpen = mission === 0 || mission >= 4;
	const spot = mission !== 0 && !won ? spotlightFor(mission, flags) : null;
	const logCount = world.sun.journal.length + world.moon.journal.length;
	const prevLog = (0, import_react.useRef)(0);
	const logBump = (0, import_react.useRef)(0);
	(0, import_react.useEffect)(() => {
		setSplash(!seated);
		return () => setSplash(false);
	}, [seated, setSplash]);
	(0, import_react.useEffect)(() => {
		if (!seated) {
			setLog(null);
			return;
		}
		if (logCount > prevLog.current) logBump.current = Date.now();
		prevLog.current = logCount;
		setLog({
			count: logCount,
			bump: logBump.current,
			onOpen: () => setLogView("all")
		});
		return () => setLog(null);
	}, [
		seated,
		logCount,
		setLog
	]);
	const check = (0, import_react.useCallback)((next, nextFlags, id) => {
		if (id === 0) return;
		if (checkMission(id, next.sun, next.moon, nextFlags)) {
			setWon(true);
			sfx.win();
		}
	}, []);
	(0, import_react.useEffect)(() => () => {
		run.current += 1;
	}, []);
	async function walk(ok, apply) {
		const token = ++run.current;
		setBusy(true);
		setFailing(false);
		const last = ok ? 3 : 2;
		for (let i = 0; i <= last; i++) {
			if (run.current !== token) return false;
			setForge(i);
			if (!ok && i === 2) {
				setFailing(true);
				sfx.reject();
				apply?.();
			} else sfx.step();
			if (ok && i === 3) apply?.();
			await wait(!ok && i === 2 ? 1700 : i === 0 ? 950 : i === 3 ? 1200 : 1100);
		}
		return run.current === token;
	}
	async function act(isle, event, payload) {
		if (busy) return;
		const replica = world[isle];
		sfx.stamp();
		const { replica: nextRep, result } = writeLocal(replica, event, payload);
		const petId = String((result.ok ? result.entry.payload.id : payload.id) ?? "");
		setAttempt({
			event,
			payload: result.ok ? result.entry.payload : payload,
			ok: result.ok,
			error: result.ok ? void 0 : result.error,
			entryId: result.ok ? result.entry.id : void 0,
			isle
		});
		setPending({
			petId,
			event
		});
		setPulse(null);
		setCaption("cap.walk");
		const nextFlags = {
			...flags,
			rejected: flags.rejected || !result.ok,
			played: flags.played || result.ok && event === "Played",
			slept: flags.slept || result.ok && event === "Slept"
		};
		const next = {
			...world,
			[isle]: nextRep
		};
		const ok = await walk(result.ok, () => {
			if (result.ok) {
				setWorld(next);
				setFlags(nextFlags);
				setActive(isle);
				setLit(isle);
				sfx.commit();
				setCaption("cap.ok");
				setPending(null);
				setPicked(result.entry.id);
				setPulse({
					petId,
					event,
					ok: true,
					nonce: Date.now()
				});
			} else {
				setPending(null);
				setPulse({
					petId,
					event,
					ok: false,
					nonce: Date.now()
				});
			}
		});
		const token = run.current;
		if (!ok) return;
		if (!result.ok) {
			setForge(2);
			setFailing(true);
			setCaption("cap.no");
			setCapParams({ why: t(`err.${result.error}`) });
		}
		setPending(null);
		setBusy(false);
		check(next, nextFlags, mission);
		window.setTimeout(() => {
			if (run.current === token) {
				setForge(-1);
				setFailing(false);
				setLit(null);
			}
		}, 1100);
	}
	function onCardAct(isle) {
		return (event, pet, name) => {
			act(isle, event, event === "Named" ? {
				id: pet.id,
				name
			} : { id: pet.id });
		};
	}
	async function hatch(species) {
		act(moonOpen ? active : "sun", "Hatched", {
			id: newCritterId(),
			species,
			name: defaultName(species)
		});
	}
	async function ferry(from, to) {
		if (busy || !moonOpen) return;
		setBusy(true);
		sfx.ferry();
		const result = syncFrom(world[from], world[to]);
		setCaption(result.imported.length ? "cap.sync" : "cap.syncEmpty");
		setCapParams({ n: result.imported.length });
		await wait(1200);
		const nextFlags = {
			...flags,
			conflicted: flags.conflicted || result.conflicts > 0
		};
		if (result.conflicts > 0) setCaption("cap.conflict");
		const next = {
			...world,
			[to]: result.target
		};
		setWorld(next);
		setFlags(nextFlags);
		setActive(to);
		setLit(to);
		const token = run.current;
		window.setTimeout(() => {
			if (run.current === token) setLit(null);
		}, 480);
		setBusy(false);
		check(next, nextFlags, mission);
	}
	async function storm(id) {
		if (busy || world[id].journal.length === 0) return;
		setBusy(true);
		sfx.wipe();
		setCaption("cap.storm");
		setWorld({
			...world,
			[id]: wipeProjection(world[id])
		});
		setFlags({
			...flags,
			wiped: true,
			rebuilt: false
		});
		setPulse({
			ok: false,
			nonce: Date.now()
		});
		await wait(900);
		setBusy(false);
	}
	async function doReplay(id) {
		if (busy || world[id].journal.length === 0) return;
		setBusy(true);
		setCaption("cap.replay");
		const replica = world[id];
		setWorld((w) => ({
			...w,
			[id]: {
				...w[id],
				projection: {}
			}
		}));
		for (let i = 0; i < replica.journal.length; i++) {
			const entry = replica.journal[i];
			setPicked(entry.id);
			setPulse({
				petId: entry.primaryKey,
				event: entry.event,
				ok: true,
				nonce: Date.now()
			});
			setWorld((w) => ({
				...w,
				[id]: {
					...w[id],
					projection: replay(replica.journal.slice(0, i + 1))
				}
			}));
			sfx.rebuild();
			await wait(750);
		}
		const nextRep = rebuildProjection(replica);
		const next = {
			...world,
			[id]: nextRep
		};
		const nextFlags = {
			...flags,
			rebuilt: herd(nextRep).length > 0
		};
		setWorld(next);
		setFlags(nextFlags);
		setBusy(false);
		check(next, nextFlags, mission);
	}
	function fold(id) {
		if (busy) return;
		const { replica, shorter } = compactReplica(world[id]);
		if (!shorter) return;
		sfx.commit();
		setCaption("cap.fold");
		const next = {
			...world,
			[id]: replica
		};
		const nextFlags = {
			...flags,
			compacted: true
		};
		setWorld(next);
		setFlags(nextFlags);
		check(next, nextFlags, mission);
	}
	function advance() {
		if (mission === 0 || mission === 6) {
			setMission(0);
			setWon(false);
			return;
		}
		setMission((m) => m === 0 ? 0 : m + 1);
		setWon(false);
	}
	function reset() {
		run.current += 1;
		setWorld(fresh());
		setActive("sun");
		setMission(1);
		setFlags(emptyFlags());
		setWon(false);
		setForge(-1);
		setFailing(false);
		setCaption("cap.idle");
		setBusy(false);
		setLogView(null);
		setAttempt(null);
		setPulse(null);
		setPending(null);
	}
	(0, import_react.useEffect)(() => {
		if (!won) {
			setNext(null);
			return;
		}
		setNext({
			label: mission === 6 ? t("hud.free") : t("hud.next"),
			onClick: advance
		});
		return () => setNext(null);
	}, [
		won,
		mission,
		t,
		setNext
	]);
	const title = mission === 0 ? t("ms.free.title") : t(`ms.${mission}.title`);
	const hint = mission === 0 ? t("ms.free.hint") : t(`ms.${mission}.hint`);
	const win = mission === 0 ? "" : t(`ms.${mission}.win`);
	const stepHint = failing ? t(caption, capParams) : forge < 0 ? t("log.append") : t(`step.${forge}`, { event: attempt?.event ?? "Event" });
	const toastOn = forge >= 0 || failing;
	if (!seated) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full min-h-0 flex-col",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
			src: "/hero.jpg",
			alt: "EventLog Isles",
			width: 1792,
			height: 1008,
			fetchPriority: "high",
			decoding: "async",
			className: "aspect-16/9 block h-auto w-full max-h-[min(58vh,58vw)] object-cover object-[center_18%] [mask-image:linear-gradient(to_bottom,#000_74%,transparent)]"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "relative z-10 -mt-8 flex shrink-0 flex-col gap-3 px-4 pb-2 sm:px-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "min-h-[2.2em] font-display text-[36px] leading-[0.95] font-semibold tracking-tight sm:min-h-[1.1em] sm:text-5xl",
					children: t("boot.title")
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "min-h-[3.25em] max-w-md text-base leading-snug font-semibold text-muted",
					children: t("boot.body")
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "relative left-1/2 w-[90vw] -translate-x-1/2",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "lg",
						className: "h-14 w-full text-lg",
						onClick: () => {
							unlockAudio();
							setSeated(true);
							sfx.stamp();
						},
						children: t("boot.go")
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-1 text-sm font-bold text-muted",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
						t("boot.credit"),
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							href: "https://x.com/xesrevinu",
							target: "_blank",
							rel: "noreferrer",
							className: "text-fg underline decoration-2 underline-offset-2",
							children: "@xesrevinu"
						})
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: "https://effect.website",
						target: "_blank",
						rel: "noreferrer",
						className: "text-fg underline decoration-2 underline-offset-2",
						children: t("boot.site")
					}) })]
				})
			]
		})]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative flex h-full min-h-0 flex-col gap-1",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "shrink-0",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative flex h-8 items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex min-w-0 flex-1 gap-1",
						children: [
							1,
							2,
							3,
							4,
							5,
							6
						].map((n) => {
							const filled = mission === 0 || n < mission || n === mission && won;
							const here = mission !== 0 && n === mission && !won;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: cn("h-3 flex-1 rounded-full", filled && "bg-accent", here && "bg-fg", !filled && !here && "bg-faint") }, n);
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "shrink-0 rounded-full bg-surface px-2 py-0.5 text-[11px] font-black text-subtle",
						children: mission === 0 ? t("hud.free") : t("hud.step", { n: mission })
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-1 min-w-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "truncate text-sm font-black leading-tight",
						children: won ? win : title
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "truncate text-[11px] leading-tight font-semibold text-muted",
						children: won ? title : hint
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative min-h-0 flex-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex h-full min-h-0 flex-col gap-1.5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Isle, {
							replica: world.sun,
							locked: false,
							lit: lit === "sun",
							spot: active === "sun" ? spot : null,
							busy,
							pulse,
							pending,
							onAct: onCardAct("sun"),
							onStorm: () => void storm("sun"),
							onReplay: () => void doReplay("sun"),
							onFold: () => fold("sun"),
							onPick: () => setActive("sun"),
							onOpenLog: () => setLogView("sun")
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex shrink-0 gap-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								size: "sm",
								className: cn("h-8 flex-1 text-xs", spot === "ferry" && "ring-2 ring-fg"),
								disabled: busy || !moonOpen,
								onClick: () => void ferry("sun", "moon"),
								children: "sync ↓"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								size: "sm",
								variant: "sky",
								className: "h-8 flex-1 text-xs",
								disabled: busy || !moonOpen,
								onClick: () => void ferry("moon", "sun"),
								children: "sync ↑"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Isle, {
							replica: world.moon,
							locked: !moonOpen,
							lit: lit === "moon",
							spot: active === "moon" ? spot : null,
							busy,
							pulse,
							pending,
							onAct: onCardAct("moon"),
							onStorm: () => void storm("moon"),
							onReplay: () => void doReplay("moon"),
							onFold: () => fold("moon"),
							onPick: () => setActive("moon"),
							onOpenLog: () => setLogView("moon")
						})
					]
				}), logView ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EventsDialog, {
					title: logView === "all" ? t("log.all") : t(logView === "sun" ? "isle.sun" : "isle.moon"),
					sources: logView === "all" ? [{
						label: t("isle.sun"),
						replica: world.sun
					}, {
						label: t("isle.moon"),
						replica: world.moon
					}] : [{
						label: t(logView === "sun" ? "isle.sun" : "isle.moon"),
						replica: world[logView]
					}],
					attempt: attempt && (logView === "all" || attempt.isle === logView) ? attempt : null,
					selectedId: picked,
					onSelect: setPicked,
					onClose: () => setLogView(null)
				}) : null]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TimelineBar, {
				forge,
				failing
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StepToast, {
				show: toastOn,
				failing,
				text: stepHint
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid shrink-0 grid-cols-4 gap-1.5",
				children: [SPECIES.map((sp) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					variant: sp === "pip" ? "sun" : sp === "nub" ? "sky" : "primary",
					disabled: busy || herd(world[active]).length >= 2,
					onClick: () => void hatch(sp),
					className: cn("h-11 gap-1 px-1 text-xs", spot === "hatch" && "ring-2 ring-fg"),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "size-6",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Face, {
							pet: {
								species: sp,
								stage: "kid",
								belly: 2,
								mood: 2,
								energy: 2
							},
							size: 28
						})
					}), sp === "pip" ? "Pip" : sp === "nub" ? "Nub" : "Bean"]
				}, sp)), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "quiet",
					disabled: busy,
					onClick: reset,
					className: "h-11 text-xs",
					children: "reset"
				})]
			})
		]
	});
}
var SplitComponent = Workshop;
//#endregion
export { SplitComponent as component };
