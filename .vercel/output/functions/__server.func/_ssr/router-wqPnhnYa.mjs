import { r as __toESM } from "../_runtime.mjs";
import { F as redirect, R as require_react, _ as useRouter, f as createRouter, g as createRootRoute, h as createFileRoute, l as Scripts, m as lazyRouteComponent, p as Outlet, u as HeadContent, v as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { i as Volume2, l as CircleHelp, o as TriangleAlert, r as VolumeX } from "../_libs/lucide-react.mjs";
import { a as union, i as string, n as number, r as object, t as literal } from "../_libs/zod.mjs";
import { t as clsx } from "../_libs/clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/router-wqPnhnYa.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var __defProp = Object.defineProperty;
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
function AppErrorComponent({ error }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "flex min-h-screen flex-col items-center justify-center gap-3 bg-bg px-6 text-center text-fg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-danger",
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, {
					className: "size-10",
					strokeWidth: 2
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-2xl italic",
				children: "出了点问题"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "max-w-md text-sm break-words text-muted",
				children: error.message || "未知错误。刷新页面再试一次。"
			})
		]
	});
}
/**
* App-wide client provider mounted once near the root (in `src/routes/__root.tsx`):
*
*   <AuthProvider><Outlet /></AuthProvider>
*
* Better Auth's React client (`@/lib/auth/client`) needs NO context provider —
* its `useSession()` works standalone — so this is a passthrough today. It's
* kept as the single, stable mount point for any future client-side providers
* (e.g. a toast or theme provider) without churning the root shell.
*/
function AuthProvider({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children });
}
/**
* Guest side of the grok-web ↔ sandbox preview postMessage bridge.
*
* Activates only when this page is framed by an allowlisted Grok embedder.
* Top-level runs (download/export, local `npm run dev`, deployed sites) noop.
*/
var PREVIEW_BRIDGE_CHANNEL = "grok-preview-bridge";
var EnvelopeSchema = object({
	channel: literal(PREVIEW_BRIDGE_CHANNEL),
	version: number().int().positive(),
	type: string().min(1)
});
var HelloSchema = EnvelopeSchema.extend({ type: literal("hello") });
var NavigateSchema = EnvelopeSchema.extend({
	type: literal("navigate"),
	path: string().min(1)
});
var HistorySchema = EnvelopeSchema.extend({
	type: literal("history"),
	delta: union([literal(-1), literal(1)])
});
/**
* Whether `origin` is a known Grok embedder. Exported for tests.
* Do not list internal staging hosts here — this file ships in download/export.
*/
function isGrokEmbedderOrigin(origin) {
	try {
		const url = new URL(origin);
		if (url.protocol !== "https:" && url.protocol !== "http:") return false;
		const host = url.hostname.toLowerCase();
		if (host === "grok.com" || host.endsWith(".grok.com")) return true;
		if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") return true;
		return false;
	} catch {
		return false;
	}
}
/** Public preview zone. Staging embedders frame this host via the proxy CSP. */
function isSandboxPreviewGuestHost(hostname) {
	const host = hostname.toLowerCase();
	return host === "grok-sandbox.com" || host.endsWith(".grok-sandbox.com");
}
/** Resolve the parent origin to post to, or null when the bridge must noop. */
function resolveParentEmbedderOrigin(parentIsSelf, referrer, ancestorOrigin, guestHostname = "") {
	if (parentIsSelf) return null;
	const candidates = [referrer, ancestorOrigin ?? ""].filter(Boolean);
	for (const candidate of candidates) try {
		const origin = candidate.includes("://") ? new URL(candidate).origin : candidate;
		if (isGrokEmbedderOrigin(origin)) return origin;
		if (!isSandboxPreviewGuestHost(guestHostname)) continue;
		const parsed = new URL(origin.includes("://") ? origin : `https://${origin}`);
		if (parsed.protocol === "https:" || parsed.protocol === "http:") return parsed.origin;
	} catch {}
	return null;
}
function isSafeBridgePath(path) {
	if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return false;
	try {
		return new URL(path, "https://preview.invalid").origin === "https://preview.invalid";
	} catch {
		return false;
	}
}
/**
* Install host↔guest messaging. Returns a dispose function.
* Noops (returns a no-op dispose) when not embedded under a Grok parent.
*/
function installPreviewHostBridge(options = {}) {
	if (typeof window === "undefined") return () => {};
	const ancestorOrigin = typeof location.ancestorOrigins !== "undefined" && location.ancestorOrigins.length > 0 ? location.ancestorOrigins[0] : null;
	const parentOrigin = resolveParentEmbedderOrigin(window.parent === window, document.referrer, ancestorOrigin, window.location.hostname);
	if (parentOrigin === null) return () => {};
	const ROOT_STATE_KEY = "__grokPreviewBridgeRoot";
	const originalPushState = window.history.pushState.bind(window.history);
	const originalReplaceState = window.history.replaceState.bind(window.history);
	const isAtHistoryRoot = () => {
		const state = window.history.state;
		return Boolean(state && typeof state === "object" && state[ROOT_STATE_KEY] === true);
	};
	try {
		const current = window.history.state;
		if (!(current !== null && typeof current === "object" && Object.prototype.hasOwnProperty.call(current, ROOT_STATE_KEY))) {
			const isRoot = window.history.length <= 1;
			originalReplaceState(current && typeof current === "object" ? {
				...current,
				[ROOT_STATE_KEY]: isRoot
			} : { [ROOT_STATE_KEY]: isRoot }, "", window.location.href);
		}
	} catch {}
	const post = (message) => {
		window.parent.postMessage(message, parentOrigin);
	};
	const reportLocation = () => {
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "location",
			path: window.location.pathname || "/",
			search: window.location.search,
			hash: window.location.hash
		});
	};
	const reportRoutes = () => {
		const paths = options.getRoutePaths?.() ?? [];
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "routes",
			paths
		});
	};
	const defaultNavigate = (path) => {
		if (!isSafeBridgePath(path)) return;
		try {
			const url = new URL(path, window.location.origin);
			if (url.origin !== window.location.origin) return;
			const next = `${url.pathname}${url.search}${url.hash}`;
			window.history.pushState(window.history.state, "", next);
			window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
		} catch {}
	};
	const navigate = (path) => {
		if (!isSafeBridgePath(path)) return;
		if (options.navigate) {
			options.navigate(path);
			return;
		}
		defaultNavigate(path);
	};
	const announce = () => {
		reportLocation();
		reportRoutes();
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "ready"
		});
	};
	const onMessage = (event) => {
		if (event.source !== window.parent) return;
		if (event.origin !== parentOrigin) return;
		const envelope = EnvelopeSchema.safeParse(event.data);
		if (!envelope.success || envelope.data.version !== 1) return;
		if (envelope.data.type === "hello") {
			if (!HelloSchema.safeParse(event.data).success) return;
			announce();
			return;
		}
		if (envelope.data.type === "navigate") {
			const parsed = NavigateSchema.safeParse(event.data);
			if (!parsed.success) return;
			navigate(parsed.data.path);
			queueMicrotask(reportLocation);
			return;
		}
		if (envelope.data.type === "history") {
			const parsed = HistorySchema.safeParse(event.data);
			if (!parsed.success) return;
			if (parsed.data.delta === -1 && isAtHistoryRoot()) return;
			window.history.go(parsed.data.delta);
		}
	};
	const onPopState = () => {
		reportLocation();
	};
	const onHashChange = () => {
		reportLocation();
	};
	window.history.pushState = (data, unused, url) => {
		const next = data && typeof data === "object" ? {
			...data,
			[ROOT_STATE_KEY]: false
		} : data;
		originalPushState(next, unused, url);
		reportLocation();
	};
	window.history.replaceState = (data, unused, url) => {
		const next = isAtHistoryRoot() ? {
			...data && typeof data === "object" ? data : {},
			[ROOT_STATE_KEY]: true
		} : data;
		originalReplaceState(next, unused, url);
		reportLocation();
	};
	window.addEventListener("message", onMessage);
	window.addEventListener("popstate", onPopState);
	window.addEventListener("hashchange", onHashChange);
	announce();
	return () => {
		window.removeEventListener("message", onMessage);
		window.removeEventListener("popstate", onPopState);
		window.removeEventListener("hashchange", onHashChange);
		window.history.pushState = originalPushState;
		window.history.replaceState = originalReplaceState;
	};
}
/** Collect static path patterns from a TanStack route tree (best-effort). */
function collectRoutePathsFromTree(routeTree) {
	const paths = /* @__PURE__ */ new Set();
	const walk = (node) => {
		if (!node || typeof node !== "object") return;
		const record = node;
		const full = typeof record.fullPath === "string" ? record.fullPath : typeof record.path === "string" ? record.path : null;
		if (full !== null && full !== "") paths.add(full.startsWith("/") ? full : `/${full}`);
		else if (full === "") paths.add("/");
		const children = record.children;
		if (Array.isArray(children)) for (const child of children) walk(child);
		else if (children && typeof children === "object") for (const child of Object.values(children)) walk(child);
	};
	walk(routeTree);
	return [...paths];
}
/**
* Mount once in `__root.tsx` so the Grok preview chrome can drive navigation
* (and later receive registered routes). Noops when the app is not embedded.
*/
function PreviewHostBridge() {
	const router = useRouter();
	(0, import_react.useEffect)(() => {
		return installPreviewHostBridge({
			navigate: (path) => {
				router.history.push(path);
			},
			getRoutePaths: () => collectRoutePathsFromTree(router.routeTree)
		});
	}, [router]);
	return null;
}
var STORAGE_KEY = "eventlog-studio-locale";
function detectBrowserLocale() {
	if (typeof navigator === "undefined") return "en";
	return [navigator.language, ...navigator.languages ?? []].some((l) => l.toLowerCase().startsWith("zh")) ? "zh" : "en";
}
function readStoredLocale() {
	try {
		const v = localStorage.getItem(STORAGE_KEY);
		if (v === "zh" || v === "en") return v;
	} catch {}
	return null;
}
function writeStoredLocale(locale) {
	try {
		localStorage.setItem(STORAGE_KEY, locale);
	} catch {}
}
function interpolate(template, params) {
	if (!params) return template;
	return template.replace(/\{(\w+)\}/g, (_, key) => params[key] === void 0 ? `{${key}}` : String(params[key]));
}
var DICT = {
	zh: {
		"meta.desc": "两座岛，一本账。Effect EventLog 互动演示：养小生物，看事件账本怎么写。",
		"lang.label": "语言",
		"copy": "复制",
		"copied": "已复制",
		"boot.go": "开始养",
		"boot.title": "两座岛，一本账",
		"boot.body": "这是一个 Effect EventLog 互动演示：两座岛，各自一本只能追加的事件账本。",
		"boot.intro": "岛上的小生物是投影。只有写入成功，才会记进账本。",
		"boot.credit": "由 Ray 与 Grok 制作",
		"boot.site": "Effect 官网",
		"log.badge": "#{n}",
		"log.all": "全部事件",
		"ms.1.title": "孵一颗蛋",
		"ms.1.hint": "点下面一只小生物，放到太阳岛上。",
		"ms.1.win": "孵化会写成一条事件。岛上多了一只，账本里多了一条。",
		"ms.2.title": "喂到撑",
		"ms.2.hint": "对着它连续点「喂」。肚子满了，handler 会拒绝。",
		"ms.2.win": "handler 说不。账本没写。这件事等于没发生。",
		"ms.3.title": "风暴来了",
		"ms.3.hint": "点岛上的风暴，小生物会消失。再点回放，它们会按账本长回来。",
		"ms.3.win": "清掉的只是投影。账本还记得谁住在这儿。",
		"ms.4.title": "坐船过去",
		"ms.4.hint": "点两岛中间的同步，月亮岛会收到同一只。",
		"ms.4.win": "渡过去的是事件，不是把整座岛复制一份。",
		"ms.5.title": "两边起名",
		"ms.5.hint": "点它的名字，两边改成不一样的，再同步一次。",
		"ms.5.win": "同一个 primaryKey，两边各自写下了不同的事件。",
		"ms.6.title": "折成一条",
		"ms.6.hint": "多玩几次，让它长大，再点压缩账本。",
		"ms.6.win": "一长串事件收成一条快照。还是它，账本变短了。",
		"ms.free.title": "接下来随便玩",
		"ms.free.hint": "喂、玩、睡、改名、放生。也可以再让两边对不上。",
		"hud.next": "下一关",
		"hud.free": "自由玩",
		"hud.again": "再来一局",
		"hud.step": "{n}/6",
		"isle.sun": "太阳岛",
		"isle.moon": "月亮岛",
		"isle.locked": "船还没到",
		"isle.empty": "还没有小生物",
		"isle.storm": "风暴",
		"isle.replay": "回放",
		"isle.fold": "压缩",
		"isle.vault": "账本",
		"act.feed": "喂",
		"act.play": "玩",
		"act.sleep": "睡",
		"act.release": "放生",
		"act.hatch": "孵化",
		"act.ferry": "同步",
		"act.ferryBack": "回航",
		"tag.Hatched": "Hatched",
		"tag.Named": "Named",
		"tag.Fed": "Fed",
		"tag.Played": "Played",
		"tag.Slept": "Slept",
		"tag.Released": "Released",
		"tag.Snapshot": "Snapshot",
		"tool.wipe": "清空投影",
		"tool.replay": "回放",
		"tool.compact": "压缩",
		"log.title": "EventJournal",
		"log.append": "只能追加，不能改已经写下的事件",
		"log.empty": "还没有事件。只有写入成功，才会记下来。",
		"log.client": "client(\"{event}\", {payload})",
		"log.commit": "handler 成功 → journal.append  #{n}",
		"log.reject": "handler 拒绝 → 不写入",
		"log.pk": "primaryKey",
		"log.seq": "#{n}",
		"log.ghost": "没有进账本",
		"step.0": "client(\"{event}\", payload) 发出一次写入",
		"step.1": "EventGroup 找到对应的 handler",
		"step.2": "先跑 handler。失败的话，账本不动",
		"step.3": "成功后，EventJournal 才追加一条记录",
		"sp.pip": "Pip",
		"sp.nub": "Nub",
		"sp.bean": "豆豆",
		"st.egg": "蛋",
		"st.kid": "小朋友",
		"st.big": "大只",
		"stat.belly": "肚子",
		"stat.mood": "心情",
		"stat.energy": "精力",
		"err.stuffed": "吃撑了，不能再喂。",
		"err.hungry": "太饿了，不想玩。",
		"err.sleepy": "没精神了，先睡一会儿。",
		"err.full": "岛上住满了。",
		"err.missing": "这只不在岛上。",
		"err.noname": "名字不能空着。",
		"err.jam": "这会儿写不进去。",
		"cap.idle": "点一只小生物，写一条事件。",
		"cap.walk": "事件正在往账本走…",
		"cap.ok": "已经写进账本。",
		"cap.no": "{why}",
		"cap.sync": "同步过去 {n} 条",
		"cap.syncEmpty": "两边已经对齐。",
		"cap.storm": "岛被吹空了，账本还在。",
		"cap.replay": "正按账本一只只长回来。",
		"cap.fold": "压缩好了。回放结果一样。",
		"cap.conflict": "同一只，两边都改过。",
		"forge.1": "client()",
		"forge.2": "EventGroup",
		"forge.3": "handler",
		"forge.4": "journal",
		"help.title": "你刚做的事，对应这些概念",
		"help.close": "回去玩",
		"help.1.k": "孵化",
		"help.1.v": "client(\"Hatched\")：用 EventGroup 声明事件类型。",
		"help.2.k": "喂撑 / 拒绝",
		"help.2.v": "先跑 handler。失败就不会写入账本。",
		"help.3.k": "风暴 / 回放",
		"help.3.v": "投影只是缓存。按账本顺序再折一遍，世界就回来了。",
		"help.4.k": "同步",
		"help.4.v": "把对面已经写下的事件追加到本地账本，再折出投影。",
		"help.5.k": "两个名字",
		"help.5.v": "同一个 primaryKey，两边各自写下了不同的事件。",
		"help.6.k": "压缩",
		"help.6.v": "groupCompaction 把一串事件收成一条快照。"
	},
	en: {
		"meta.desc": "Two islands, one journal. A playable demo of Effect EventLog.",
		"lang.label": "Language",
		"copy": "Copy",
		"copied": "Copied",
		"boot.go": "Start playing",
		"boot.title": "Two islands. One journal.",
		"boot.body": "A playable demo of Effect EventLog — two islands, each with its own append-only journal.",
		"boot.intro": "Critters on the isle are a projection. Only a successful write is recorded.",
		"boot.credit": "Made by Ray and Grok",
		"boot.site": "effect.website",
		"log.badge": "#{n}",
		"log.all": "All events",
		"ms.1.title": "Hatch an egg",
		"ms.1.hint": "Tap a critter below to place it on Sun Isle.",
		"ms.1.win": "A hatch is an event. One critter on the isle, one entry in the journal.",
		"ms.2.title": "Feed it full",
		"ms.2.hint": "Keep tapping Feed. When it's full, the handler refuses.",
		"ms.2.win": "The handler said no. Nothing was written. It never happened.",
		"ms.3.title": "A storm hits",
		"ms.3.hint": "Tap wipe — they vanish. Tap replay — they grow back from the journal.",
		"ms.3.win": "You only cleared the projection. The journal still remembers who lives here.",
		"ms.4.title": "Cross the water",
		"ms.4.hint": "Tap sync between the isles. Moon Isle receives the same critter.",
		"ms.4.win": "You synced events, not a copy of the island.",
		"ms.5.title": "Two names",
		"ms.5.hint": "Tap the name, call it something different on each isle, then sync again.",
		"ms.5.win": "Same primaryKey — each side wrote a different entry.",
		"ms.6.title": "Fold the history",
		"ms.6.hint": "Play a few times so it grows, then tap compact.",
		"ms.6.win": "A long chain becomes one snapshot. Same critter, shorter journal.",
		"ms.free.title": "The isles are yours",
		"ms.free.hint": "Feed, play, sleep, rename, release. Or split the two sides again.",
		"hud.next": "Next",
		"hud.free": "Free play",
		"hud.again": "Play again",
		"hud.step": "{n}/6",
		"isle.sun": "Sun Isle",
		"isle.moon": "Moon Isle",
		"isle.locked": "No boat yet",
		"isle.empty": "No critters yet",
		"isle.storm": "Storm",
		"isle.replay": "Replay",
		"isle.fold": "Compact",
		"isle.vault": "Journal",
		"act.feed": "Feed",
		"act.play": "Play",
		"act.sleep": "Sleep",
		"act.release": "Release",
		"act.hatch": "Hatch",
		"act.ferry": "Sync",
		"act.ferryBack": "Return",
		"tag.Hatched": "Hatched",
		"tag.Named": "Named",
		"tag.Fed": "Fed",
		"tag.Played": "Played",
		"tag.Slept": "Slept",
		"tag.Released": "Released",
		"tag.Snapshot": "Snapshot",
		"tool.wipe": "wipe",
		"tool.replay": "replay",
		"tool.compact": "compact",
		"log.title": "EventJournal",
		"log.append": "Append-only — existing entries never change",
		"log.empty": "No events yet. Only a successful write is recorded.",
		"log.client": "client(\"{event}\", {payload})",
		"log.commit": "handler succeeded → journal.append  #{n}",
		"log.reject": "handler refused → nothing written",
		"log.pk": "primaryKey",
		"log.seq": "#{n}",
		"log.ghost": "not in the journal",
		"step.0": "client(\"{event}\", payload) submits a write",
		"step.1": "EventGroup finds the matching handler",
		"step.2": "The handler runs first. If it fails, the journal stays put",
		"step.3": "Only then EventJournal appends an entry",
		"sp.pip": "Pip",
		"sp.nub": "Nub",
		"sp.bean": "Bean",
		"st.egg": "egg",
		"st.kid": "kid",
		"st.big": "grown",
		"stat.belly": "belly",
		"stat.mood": "mood",
		"stat.energy": "energy",
		"err.stuffed": "It's full. Can't feed it more.",
		"err.hungry": "Too hungry to play.",
		"err.sleepy": "Too tired. Let it sleep.",
		"err.full": "The isle is full.",
		"err.missing": "That critter isn't on this isle.",
		"err.noname": "The name can't be empty.",
		"err.jam": "Couldn't write just now.",
		"cap.idle": "Tap a critter to write an event.",
		"cap.walk": "The event is moving toward the journal…",
		"cap.ok": "Written to the journal.",
		"cap.no": "{why}",
		"cap.sync": "Synced {n} events",
		"cap.syncEmpty": "Already in sync.",
		"cap.storm": "Isle cleared. The journal remains.",
		"cap.replay": "Growing them back from the journal.",
		"cap.fold": "Compacted. Replay matches.",
		"cap.conflict": "Same critter, both sides wrote.",
		"forge.1": "client()",
		"forge.2": "EventGroup",
		"forge.3": "handler",
		"forge.4": "journal",
		"help.title": "What you just did, in EventLog terms",
		"help.close": "Back to play",
		"help.1.k": "Hatch",
		"help.1.v": "client(\"Hatched\") — EventGroup defines the event type.",
		"help.2.k": "Full / refuse",
		"help.2.v": "The handler runs first. If it fails, nothing is written.",
		"help.3.k": "Storm / replay",
		"help.3.v": "The projection is a cache. Fold the journal in order and the world returns.",
		"help.4.k": "Sync",
		"help.4.v": "Append remote committed entries to the local journal, then fold the projection.",
		"help.5.k": "Two names",
		"help.5.v": "Each side wrote a different entry for the same primaryKey.",
		"help.6.k": "Compact",
		"help.6.v": "groupCompaction folds a chain of events into a snapshot."
	}
};
function translate(locale, key, params) {
	return interpolate(DICT[locale][key], params);
}
var I18nContext = (0, import_react.createContext)(null);
function I18nProvider({ hint, children }) {
	const [locale, setLocaleState] = (0, import_react.useState)(() => {
		if (typeof window === "undefined") return hint;
		return readStoredLocale() ?? detectBrowserLocale();
	});
	(0, import_react.useEffect)(() => {
		const next = readStoredLocale() ?? detectBrowserLocale();
		setLocaleState((prev) => prev === next ? prev : next);
	}, []);
	(0, import_react.useEffect)(() => {
		document.documentElement.lang = locale === "zh" ? "zh-Hans" : "en";
	}, [locale]);
	const setLocale = (0, import_react.useCallback)((next) => {
		writeStoredLocale(next);
		setLocaleState(next);
	}, []);
	const t = (0, import_react.useCallback)((key, params) => translate(locale, key, params), [locale]);
	const value = (0, import_react.useMemo)(() => ({
		locale,
		setLocale,
		t
	}), [
		locale,
		setLocale,
		t
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(I18nContext.Provider, {
		value,
		children
	});
}
function useI18n() {
	const ctx = (0, import_react.useContext)(I18nContext);
	if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
	return ctx;
}
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
function Button({ variant = "primary", size = "md", className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		"data-cuelume-press": "",
		"data-cuelume-release": "",
		className: cn("chunk inline-flex items-center justify-center gap-1.5 font-bold", "disabled:cursor-not-allowed disabled:opacity-40", size === "sm" && "h-10 rounded-xl px-3 text-sm", size === "md" && "h-12 rounded-2xl px-4 text-[15px]", size === "lg" && "h-14 rounded-2xl px-5 text-lg", variant === "primary" && "border-accent-deep bg-accent text-accent-fg", variant === "sky" && "border-sky-deep bg-sky text-accent-fg", variant === "sun" && "border-sun-deep bg-sun text-fg", variant === "grape" && "border-grape-deep bg-grape text-accent-fg", variant === "ghost" && "border-transparent bg-transparent text-fg", variant === "outline" && "border-faint bg-surface text-fg", variant === "danger" && "border-[#d93838] bg-danger text-accent-fg", variant === "quiet" && "border-faint bg-inset text-fg", className),
		...props
	});
}
/** Cuelume palette (MIT) — https://github.com/Danilaa1/cuelume */
/**
* The sound palette — layer/recipe types plus the seventeen built-in recipes.
* Each sound has its own distinct shape — a chime, an arpeggio, a pitch
* glide, a warm pad, a breath — rather than being a volume/EQ tweak on
* the same click. Add a new one here without touching any audio graph code.
*/
var RECIPES = {
	/** A soft two-note ascending bell, like an iOS/macOS confirmation tink. */
	chime: {
		masterGain: .5,
		layers: [{
			kind: "tone",
			waveform: "sine",
			frequency: 1046.5,
			attack: .006,
			decay: .22,
			peak: .09
		}, {
			kind: "tone",
			waveform: "sine",
			frequency: 1568,
			offset: .09,
			attack: .006,
			decay: .26,
			peak: .08
		}],
		shimmer: {
			delay: .12,
			feedback: .25,
			wet: .18,
			lowpass: 4e3
		}
	},
	/** A quick ascending twinkle of four notes — bright and playful. */
	sparkle: {
		masterGain: .5,
		layers: [
			{
				kind: "tone",
				waveform: "sine",
				frequency: 1760,
				offset: 0,
				attack: .003,
				decay: .09,
				peak: .045
			},
			{
				kind: "tone",
				waveform: "sine",
				frequency: 2217,
				offset: .045,
				attack: .003,
				decay: .09,
				peak: .04
			},
			{
				kind: "tone",
				waveform: "sine",
				frequency: 2637,
				offset: .09,
				attack: .003,
				decay: .1,
				peak: .038
			},
			{
				kind: "tone",
				waveform: "sine",
				frequency: 3520,
				offset: .135,
				attack: .003,
				decay: .12,
				peak: .032
			}
		],
		shimmer: {
			delay: .07,
			feedback: .35,
			wet: .22,
			lowpass: 6e3
		}
	},
	/** A single note gliding smoothly downward, like a drop of water. */
	droplet: {
		masterGain: .55,
		layers: [{
			kind: "tone",
			waveform: "sine",
			frequency: 1200,
			glideTo: 550,
			glideTime: .14,
			attack: .004,
			decay: .2,
			peak: .075
		}],
		shimmer: {
			delay: .09,
			feedback: .2,
			wet: .15,
			lowpass: 3e3
		}
	},
	/** A warm, slow-swelling pad from two gently detuned sines. */
	bloom: {
		masterGain: .5,
		layers: [{
			kind: "tone",
			waveform: "sine",
			frequency: 528,
			attack: .06,
			decay: .32,
			peak: .06
		}, {
			kind: "tone",
			waveform: "sine",
			frequency: 528,
			detune: 12,
			attack: .06,
			decay: .34,
			peak: .05
		}],
		shimmer: {
			delay: .15,
			feedback: .2,
			wet: .12,
			lowpass: 2500
		}
	},
	/** A soft hush with a falling tone — for tooltips and low-priority previews. */
	whisper: {
		masterGain: .48,
		layers: [{
			kind: "noise",
			filterType: "lowpass",
			filterFrequency: 1600,
			filterQ: .7,
			attack: .025,
			decay: .13,
			peak: .04
		}, {
			kind: "tone",
			waveform: "sine",
			frequency: 880,
			glideTo: 660,
			glideTime: .14,
			offset: .01,
			attack: .012,
			decay: .14,
			peak: .025
		}]
	},
	/** A focused, bandpass-filtered tick with a bright sine ping on top — crisp and instant. */
	tick: {
		masterGain: .4,
		layers: [{
			kind: "noise",
			filterType: "bandpass",
			filterFrequency: 5400,
			filterQ: 1.8,
			attack: .001,
			decay: .018,
			peak: .14
		}, {
			kind: "tone",
			waveform: "sine",
			frequency: 2600,
			attack: .001,
			decay: .012,
			peak: .018
		}]
	},
	/** A dull, muted knock — the "down" half of a press/release pair, like a key bottoming out. */
	press: {
		masterGain: .4,
		layers: [{
			kind: "noise",
			filterType: "bandpass",
			filterFrequency: 1700,
			filterQ: 1.4,
			attack: .001,
			decay: .02,
			peak: .13
		}]
	},
	/** A brighter, springier tick — the "up" half of a press/release pair, like a key returning. */
	release: {
		masterGain: .4,
		layers: [{
			kind: "noise",
			filterType: "bandpass",
			filterFrequency: 4600,
			filterQ: 1.8,
			attack: .001,
			decay: .016,
			peak: .12
		}, {
			kind: "tone",
			waveform: "sine",
			frequency: 3200,
			offset: .006,
			attack: .001,
			decay: .05,
			peak: .02
		}]
	},
	/** A two-part click-clack, like a mechanical switch flipping between states. */
	toggle: {
		masterGain: .4,
		layers: [{
			kind: "noise",
			filterType: "bandpass",
			filterFrequency: 2200,
			filterQ: 1.6,
			attack: .001,
			decay: .016,
			peak: .12
		}, {
			kind: "noise",
			filterType: "bandpass",
			filterFrequency: 3800,
			filterQ: 1.6,
			offset: .024,
			attack: .001,
			decay: .02,
			peak: .1
		}]
	},
	/** A short, warm three-note ascending confirmation — "done", not a fanfare. */
	success: {
		masterGain: .5,
		layers: [
			{
				kind: "tone",
				waveform: "sine",
				frequency: 880,
				attack: .004,
				decay: .09,
				peak: .06
			},
			{
				kind: "tone",
				waveform: "sine",
				frequency: 1108.73,
				offset: .06,
				attack: .004,
				decay: .1,
				peak: .06
			},
			{
				kind: "tone",
				waveform: "sine",
				frequency: 1318.51,
				offset: .12,
				attack: .004,
				decay: .18,
				peak: .07
			}
		],
		shimmer: {
			delay: .1,
			feedback: .22,
			wet: .16,
			lowpass: 4500
		}
	},
	/** A muted knock followed by two descending tones — a calm, recoverable refusal. */
	error: {
		masterGain: .42,
		layers: [
			{
				kind: "noise",
				filterType: "bandpass",
				filterFrequency: 850,
				filterQ: 1.1,
				attack: .001,
				decay: .035,
				peak: .13
			},
			{
				kind: "tone",
				waveform: "triangle",
				frequency: 440,
				offset: .025,
				attack: .004,
				decay: .09,
				peak: .045
			},
			{
				kind: "tone",
				waveform: "triangle",
				frequency: 349.23,
				offset: .1,
				attack: .004,
				decay: .14,
				peak: .04
			}
		]
	},
	/** A papery filtered flick with a tiny glass tick — for pages, galleries, and carousels. */
	page: {
		masterGain: .38,
		layers: [
			{
				kind: "noise",
				filterType: "lowpass",
				filterFrequency: 1800,
				filterQ: .7,
				attack: .006,
				decay: .08,
				peak: .11
			},
			{
				kind: "noise",
				filterType: "bandpass",
				filterFrequency: 4200,
				filterQ: 1.2,
				offset: .04,
				attack: .004,
				decay: .065,
				peak: .08
			},
			{
				kind: "tone",
				waveform: "sine",
				frequency: 2400,
				offset: .075,
				attack: .002,
				decay: .045,
				peak: .02
			}
		]
	},
	/** A brief unresolved lift — signals that user-initiated work has started. */
	loading: {
		masterGain: .42,
		layers: [{
			kind: "noise",
			filterType: "lowpass",
			filterFrequency: 1400,
			filterQ: .6,
			attack: .035,
			decay: .14,
			peak: .035
		}, {
			kind: "tone",
			waveform: "sine",
			frequency: 420,
			glideTo: 630,
			glideTime: .18,
			attack: .025,
			decay: .18,
			peak: .05
		}],
		shimmer: {
			delay: .11,
			feedback: .18,
			wet: .12,
			lowpass: 2800
		}
	},
	/** A quick lock-on sweep resolving to a clear tone — the system is ready. */
	ready: {
		masterGain: .48,
		layers: [
			{
				kind: "noise",
				filterType: "bandpass",
				filterFrequency: 3600,
				filterQ: 1.8,
				attack: .001,
				decay: .02,
				peak: .11
			},
			{
				kind: "tone",
				waveform: "triangle",
				frequency: 330,
				glideTo: 660,
				glideTime: .12,
				offset: .012,
				attack: .004,
				decay: .16,
				peak: .055
			},
			{
				kind: "tone",
				waveform: "sine",
				frequency: 990,
				offset: .13,
				attack: .004,
				decay: .22,
				peak: .06
			}
		],
		shimmer: {
			delay: .1,
			feedback: .16,
			wet: .1,
			lowpass: 4200
		}
	},
	/** A compact synthetic chirp — crisp feedback for primary buttons and controls. */
	pulse: {
		masterGain: .42,
		layers: [{
			kind: "noise",
			filterType: "bandpass",
			filterFrequency: 2600,
			filterQ: 2.4,
			attack: .001,
			decay: .022,
			peak: .08
		}, {
			kind: "tone",
			waveform: "triangle",
			frequency: 620,
			glideTo: 1240,
			glideTime: .07,
			attack: .002,
			decay: .085,
			peak: .055
		}]
	},
	/** A fast three-step locator signal — playful feedback for menus and secondary buttons. */
	scan: {
		masterGain: .4,
		layers: [
			{
				kind: "tone",
				waveform: "sine",
				frequency: 740,
				attack: .002,
				decay: .055,
				peak: .05
			},
			{
				kind: "tone",
				waveform: "sine",
				frequency: 1110,
				offset: .045,
				attack: .002,
				decay: .055,
				peak: .045
			},
			{
				kind: "tone",
				waveform: "sine",
				frequency: 1665,
				offset: .09,
				attack: .002,
				decay: .07,
				peak: .04
			}
		],
		shimmer: {
			delay: .065,
			feedback: .16,
			wet: .1,
			lowpass: 4200
		}
	},
	/** A rising harmonic portal with a soft tail — for client-side page arrivals. */
	arrival: {
		masterGain: .44,
		layers: [
			{
				kind: "noise",
				filterType: "lowpass",
				filterFrequency: 900,
				filterQ: .8,
				attack: .05,
				decay: .24,
				peak: .035
			},
			{
				kind: "tone",
				waveform: "sine",
				frequency: 220,
				glideTo: 440,
				glideTime: .32,
				attack: .04,
				decay: .34,
				peak: .055
			},
			{
				kind: "tone",
				waveform: "sine",
				frequency: 659.25,
				offset: .12,
				attack: .045,
				decay: .32,
				peak: .04
			},
			{
				kind: "tone",
				waveform: "sine",
				frequency: 987.77,
				offset: .19,
				attack: .045,
				decay: .34,
				peak: .032
			}
		],
		shimmer: {
			delay: .16,
			feedback: .28,
			wet: .18,
			lowpass: 3200
		}
	}
};
function isSoundName(value) {
	return typeof value === "string" && Object.prototype.hasOwnProperty.call(RECIPES, value);
}
Object.keys(RECIPES);
var ctx = null;
var output = null;
var enabled = true;
var started = false;
function ac() {
	if (typeof window === "undefined") return null;
	if (ctx) return ctx;
	const Ctor = window.AudioContext ?? window.webkitAudioContext;
	if (!Ctor) return null;
	try {
		ctx = new Ctor();
	} catch {
		return null;
	}
	return ctx;
}
function bus(audio) {
	if (output) return output;
	const gain = audio.createGain();
	gain.gain.value = 5;
	const limiter = audio.createDynamicsCompressor();
	limiter.threshold.value = -8;
	limiter.knee.value = 6;
	limiter.ratio.value = 12;
	limiter.attack.value = .002;
	limiter.release.value = .08;
	gain.connect(limiter).connect(audio.destination);
	output = gain;
	return output;
}
function render(audio, name, volume) {
	const recipe = RECIPES[name];
	const master = audio.createGain();
	master.gain.value = recipe.masterGain * Math.min(1, Math.max(0, volume));
	master.connect(bus(audio));
	const now = audio.currentTime;
	for (const raw of recipe.layers) {
		const layer = raw;
		const start = now + (layer.offset ?? 0);
		if (layer.kind === "tone") {
			const osc = audio.createOscillator();
			osc.type = layer.waveform ?? "sine";
			osc.frequency.setValueAtTime(layer.frequency ?? 440, start);
			if (layer.detune) osc.detune.value = layer.detune;
			if (layer.glideTo !== void 0) {
				const glide = layer.glideTime ?? layer.attack + layer.decay;
				osc.frequency.exponentialRampToValueAtTime(Math.max(1, layer.glideTo ?? 440), start + glide);
			}
			const g = audio.createGain();
			g.gain.setValueAtTime(1e-4, start);
			g.gain.exponentialRampToValueAtTime(layer.peak, start + layer.attack);
			g.gain.exponentialRampToValueAtTime(1e-4, start + layer.attack + layer.decay);
			osc.connect(g).connect(master);
			osc.start(start);
			osc.stop(start + layer.attack + layer.decay + .05);
		} else {
			const duration = layer.attack + layer.decay + .05;
			const length = Math.max(1, Math.floor(duration * audio.sampleRate));
			const buffer = audio.createBuffer(1, length, audio.sampleRate);
			const data = buffer.getChannelData(0);
			for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
			const source = audio.createBufferSource();
			source.buffer = buffer;
			const filter = audio.createBiquadFilter();
			filter.type = layer.filterType ?? "lowpass";
			filter.frequency.value = layer.filterFrequency ?? 1200;
			if (layer.filterQ !== void 0) filter.Q.value = layer.filterQ;
			const g = audio.createGain();
			g.gain.setValueAtTime(1e-4, start);
			g.gain.exponentialRampToValueAtTime(layer.peak, start + layer.attack);
			g.gain.exponentialRampToValueAtTime(1e-4, start + layer.attack + layer.decay);
			source.connect(filter).connect(g).connect(master);
			source.start(start);
			source.stop(start + duration);
		}
	}
	window.setTimeout(() => master.disconnect(), 1400);
}
function unlockAudio() {
	const audio = ac();
	if (!audio) return;
	if (audio.state === "suspended") audio.resume();
}
function playCue(name, volume = 1) {
	if (!enabled || !isSoundName(name)) return;
	const audio = ac();
	if (!audio) return;
	const kick = () => {
		if (enabled && audio.state === "running") render(audio, name, volume);
	};
	if (audio.state === "running") kick();
	else audio.resume().then(kick);
}
function setSfxEnabled(on) {
	enabled = on;
	if (on) {
		unlockAudio();
		playCue("ready", .95);
	}
}
function sfxEnabled() {
	return enabled;
}
function startCues() {
	if (typeof window === "undefined" || started) return;
	started = true;
	window.addEventListener("pointerdown", (event) => {
		unlockAudio();
		if (!(event.target instanceof Element)) return;
		const btn = event.target.closest("button, [data-cuelume-press]");
		if (!btn) return;
		if (btn instanceof HTMLButtonElement && btn.disabled) return;
		playCue("press", .8);
	}, true);
	window.addEventListener("click", () => unlockAudio(), true);
}
var sfx = {
	stamp: () => playCue("pulse", .95),
	step: () => playCue("tick", .8),
	commit: () => playCue("success", 1),
	reject: () => playCue("error", 1),
	ferry: () => playCue("page", .95),
	wipe: () => playCue("droplet", .95),
	rebuild: () => playCue("bloom", .95),
	win: () => playCue("sparkle", 1)
};
function prefersReducedMotion() {
	if (typeof window === "undefined") return false;
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function wait(ms) {
	if (prefersReducedMotion()) return Promise.resolve();
	return new Promise((resolve) => {
		window.setTimeout(resolve, ms);
	});
}
var HudContext = (0, import_react.createContext)({
	setNext: () => {},
	setLog: () => {},
	setSplash: () => {}
});
function useHud() {
	return (0, import_react.useContext)(HudContext);
}
function ChipIcon({ label, onClick, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		"aria-label": label,
		onClick,
		className: "chunk grid size-10 place-items-center rounded-2xl border-[#d7b56a] bg-surface text-fg shadow-[0_1px_0_rgba(255,255,255,0.7)]",
		children
	});
}
function LangSwitch() {
	const { locale, setLocale, t } = useI18n();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		role: "tablist",
		"aria-label": t("lang.label"),
		className: "chunk grid h-10 w-[7.75rem] shrink-0 grid-cols-2 rounded-2xl border-[#d7b56a] bg-surface p-0.5 shadow-[0_1px_0_rgba(255,255,255,0.7)]",
		children: [{
			id: "zh",
			label: "中文"
		}, {
			id: "en",
			label: "EN"
		}].map((opt) => {
			const on = locale === opt.id;
			return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				role: "tab",
				"aria-selected": on,
				onClick: () => setLocale(opt.id),
				className: cn("h-9 w-full rounded-xl px-1 text-sm font-extrabold", on ? "bg-sun text-fg" : "text-muted"),
				children: opt.label
			}, opt.id);
		})
	});
}
function Help({ onClose }) {
	const { t } = useI18n();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "absolute inset-0 z-40 flex flex-col bg-bg p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "font-display text-2xl font-semibold",
				children: t("help.title")
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-3 grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-auto sm:grid-cols-2",
				children: [
					{
						k: "help.1.k",
						v: "help.1.v"
					},
					{
						k: "help.2.k",
						v: "help.2.v"
					},
					{
						k: "help.3.k",
						v: "help.3.v"
					},
					{
						k: "help.4.k",
						v: "help.4.v"
					},
					{
						k: "help.5.k",
						v: "help.5.v"
					},
					{
						k: "help.6.k",
						v: "help.6.v"
					}
				].map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-2xl bg-surface p-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-black text-accent-deep",
						children: t(r.k)
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm font-semibold text-muted",
						children: t(r.v)
					})]
				}, r.k))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				className: "mt-3",
				onClick: onClose,
				children: t("help.close")
			})
		]
	});
}
function StudioShell({ children }) {
	const { t } = useI18n();
	const [help, setHelp] = (0, import_react.useState)(false);
	const [next, setNext] = (0, import_react.useState)(null);
	const [log, setLog] = (0, import_react.useState)(null);
	const [bumpOn, setBumpOn] = (0, import_react.useState)(false);
	const [soundOn, setSoundOn] = (0, import_react.useState)(true);
	const [splash, setSplash] = (0, import_react.useState)(true);
	const hud = (0, import_react.useMemo)(() => ({
		setNext,
		setLog,
		setSplash
	}), []);
	(0, import_react.useEffect)(() => {
		startCues();
	}, []);
	(0, import_react.useEffect)(() => {
		if (!log?.bump) return;
		setBumpOn(true);
		const id = window.setTimeout(() => setBumpOn(false), 720);
		return () => window.clearTimeout(id);
	}, [log?.bump]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HudContext.Provider, {
		value: hud,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "relative flex h-dvh flex-col overflow-hidden bg-bg text-fg",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: cn("relative mx-auto flex min-h-0 w-full flex-1 flex-col", !splash && "max-w-[760px]"),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
					className: cn("z-20 grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-2 sm:px-3", splash ? "pointer-events-none absolute inset-x-0 top-0 bg-transparent pt-[max(0.55rem,env(safe-area-inset-top))] pb-4 [&>*]:pointer-events-auto" : "relative shrink-0 bg-bg pt-[max(0.3rem,env(safe-area-inset-top))]"),
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-1",
							children: [
								log ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									"data-cuelume-press": "",
									"data-cuelume-release": "",
									onClick: log.onOpen,
									className: cn("flex items-center gap-1.5 rounded-xl bg-sun px-2 py-1", bumpOn && "anim-log-bump"),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-display text-[15px] font-semibold tracking-tight",
										children: "EventLog"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: cn("grid min-w-5 place-items-center rounded-full bg-fg px-1.5 text-[11px] font-black text-sun", bumpOn && "anim-pip"),
										children: log.count
									})]
								}) : splash ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "chunk rounded-2xl border-[#d7b56a] bg-surface px-2.5 py-1.5 font-display text-[15px] font-semibold tracking-tight shadow-[0_1px_0_rgba(255,255,255,0.7)]",
									children: "EventLog"
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "font-display text-[15px] font-semibold tracking-tight",
									children: "EventLog"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChipIcon, {
									label: t("help.title"),
									onClick: () => setHelp(true),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleHelp, { className: "size-5" })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChipIcon, {
									label: soundOn ? "mute" : "sound",
									onClick: () => {
										unlockAudio();
										const nextOn = !sfxEnabled();
										setSfxEnabled(nextOn);
										setSoundOn(nextOn);
									},
									children: soundOn ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Volume2, { className: "size-5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VolumeX, { className: "size-5" })
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "justify-self-center",
							children: next ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								size: "sm",
								onClick: next.onClick,
								className: "h-8 px-4 text-sm",
								children: next.label
							}) : null
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "justify-self-end",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LangSwitch, {})
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
					className: cn("min-h-0 flex-1 pb-[max(0.35rem,env(safe-area-inset-bottom))]", splash ? "px-0" : "px-2 sm:px-3"),
					children
				})]
			}), help ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Help, { onClose: () => setHelp(false) }) : null]
		})
	});
}
var styles_default = "/assets/styles-DjH4Ll0I.css";
var APP_NAME = "EventLog Isles";
var APP_DESC = "Two islands, one journal. A playable demo of Effect EventLog — raise critters and watch an append-only event journal.";
var Route$2 = createRootRoute({
	loader: () => ({ localeHint: "en" }),
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1, viewport-fit=cover"
			},
			{ title: APP_NAME },
			{
				name: "description",
				content: APP_DESC
			},
			{
				name: "apple-mobile-web-app-title",
				content: APP_NAME
			},
			{
				name: "application-name",
				content: APP_NAME
			},
			{
				name: "theme-color",
				content: "#fff3c4"
			},
			{
				name: "twitter:card",
				content: "summary_large_image"
			},
			{
				name: "twitter:title",
				content: APP_NAME
			},
			{
				name: "twitter:description",
				content: APP_DESC
			},
			{
				property: "og:title",
				content: APP_NAME
			},
			{
				property: "og:description",
				content: APP_DESC
			},
			{
				property: "og:site_name",
				content: APP_NAME
			},
			{
				property: "og:type",
				content: "x:game"
			},
			{
				property: "og:locale",
				content: "en_US"
			},
			{
				property: "og:locale:alternate",
				content: "zh_CN"
			},
			...[],
			...[]
		],
		links: [
			...[],
			{
				rel: "icon",
				type: "image/svg+xml",
				href: "/favicon.svg"
			},
			{
				rel: "stylesheet",
				href: styles_default
			},
			{
				rel: "manifest",
				href: "/__grok/manifest.webmanifest"
			},
			{
				rel: "apple-touch-icon",
				href: "/__grok/icon-180.png"
			},
			{
				rel: "preconnect",
				href: "https://fonts.googleapis.com"
			},
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous"
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&family=Nunito:wght@700;800&display=swap"
			}
		]
	}),
	component: RootComponent
});
function RootComponent() {
	const { localeHint } = Route$2.useLoaderData();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", {
		lang: localeHint === "zh" ? "zh-Hans" : "en",
		className: "antialiased",
		suppressHydrationWarning: true,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("head", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeadContent, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PreviewHostBridge, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(I18nProvider, {
				hint: localeHint,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StudioShell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {}) })
			}) }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scripts, {})
		] })]
	});
}
var $$splitComponentImporter = () => import("./routes-B4lcK-w-.mjs");
var Route$1 = createFileRoute("/")({ component: lazyRouteComponent($$splitComponentImporter, "component") });
var Route = createFileRoute("/api")({ beforeLoad: () => {
	throw redirect({ to: "/" });
} });
var rootRouteChildren = {
	IndexRoute: Route$1.update({
		id: "/",
		path: "/",
		getParentRoute: () => Route$2
	}),
	ApiRoute: Route.update({
		id: "/api",
		path: "/api",
		getParentRoute: () => Route$2
	})
};
var routeTree = Route$2._addFileChildren(rootRouteChildren)._addFileTypes();
var router_exports = /* @__PURE__ */ __exportAll({ getRouter: () => getRouter });
function getRouter() {
	return createRouter({
		routeTree,
		defaultErrorComponent: AppErrorComponent
	});
}
//#endregion
export { wait as a, useI18n as c, unlockAudio as i, useHud as n, Button as o, sfx as r, cn as s, router_exports as t };
