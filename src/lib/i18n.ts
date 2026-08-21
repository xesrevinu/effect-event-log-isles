export type Locale = "zh" | "en";

export const STORAGE_KEY = "eventlog-studio-locale";

export function parseLocale(value: string | null | undefined): Locale | null {
  return value === "zh" || value === "en" ? value : null;
}

/** Pick zh / en from an Accept-Language header, honoring q-values. */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale | null {
  if (!header) return null;
  const tags: { range: string; q: number }[] = [];
  for (const raw of header.split(",")) {
    const [rangeRaw, ...params] = raw.trim().split(";");
    const range = rangeRaw?.trim().toLowerCase();
    if (!range) continue;
    let q = 1;
    for (const param of params) {
      const [key, value] = param.trim().split("=");
      if (key === "q") {
        const next = Number(value);
        if (Number.isFinite(next)) q = next;
      }
    }
    if (q <= 0) continue;
    tags.push({ range, q });
  }
  tags.sort((a, b) => b.q - a.q);
  for (const { range } of tags) {
    if (range === "*") continue;
    if (range === "zh" || range.startsWith("zh-")) return "zh";
    if (range === "en" || range.startsWith("en-")) return "en";
  }
  return null;
}

export function readStoredLocale(): Locale | null {
  try {
    return parseLocale(localStorage.getItem(STORAGE_KEY));
  } catch {
    /* private */
  }
  return null;
}

export function writeStoredLocale(locale: Locale) {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
  if (typeof document === "undefined") return;
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${STORAGE_KEY}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
}

function interpolate(template: string, params?: Record<string, string | number>) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    params[key] === undefined ? `{${key}}` : String(params[key]),
  );
}

const zh = {
  "lang.label": "语言",
  "boot.go": "开始养",
  "boot.title": "两座小岛，等你养点什么",
  "boot.body": "太阳岛、月亮岛。先养两只，再连上改名，然后关一次服务器。",
  "boot.credit": "由 Ray 和 {grok} Grok 制作",
  "boot.github": "开源仓库",
  "boot.made":
    "{phone} 在 iPhone 上，用 {grok} Grok Build 捏出第一版(太顶了)。导出后丢进 Cursor，让 {spark} Grok 4.6 抛光(狠狠蹬)，发现效果不错。",
  "boot.art": "{pic} 每个样式、每张图、每段视频，都是 {grok} Grok 一个 token 一个 token 算出来的。",
  "boot.effect":
    "Effect 是一套 TypeScript 工具箱，专门写靠得住的程序。成功、失败、路上要什么，都记在类型里。",
  "boot.site": "去 Effect 官网看看",
  "boot.lift": "正在打开账本",
  "boot.ready": "欢迎上岸",
  "boot.chip.pip": "Pip 醒来",
  "boot.chip.nub": "Nub 去玩",
  "boot.chip.bean": "豆豆发芽",
  "boot.chip.ashore": "上岛啦",
  "log.all": "全部事件",

  "ms.1.title": "先在太阳岛养两只",
  "ms.1.hint": "放到岛上，喂到撑，再放一只别的，然后风暴、回放。",
  "ms.1.win": "写进账本的才算发生。撑了 handler 会拒绝；风暴清的是画面，回放两只都会长回来。",

  "ms.2.title": "连上再改名",
  "ms.2.hint": "把两座岛都点成在线，再改个名字。对岸会一起变。",
  "ms.2.win": "两边都连着服务器时，改名会自己同步过去。",

  "ms.3.title": "服务器挂了",
  "ms.3.hint": "关掉服务器，玩一下，再打开。",
  "ms.3.win": "服务器不在，岛上仍能写。连回来，对岸会追上。",

  "ms.free.title": "接下来随便玩",
  "ms.free.hint": "喂、玩、睡、改名、放生。也可以把岛点离线，或者再关一次服务器。",

  "hud.next": "下一关",
  "hud.free": "自由玩",
  "hud.again": "再来一局",
  "hud.step": "{n}/3",
  "guide.tap": "点这里",
  "guide.hatch": "放到岛上",
  "guide.feed": "喂到撑",
  "guide.play": "玩一下",
  "guide.storm": "吹走",
  "guide.replay": "长回来",
  "guide.ferry": "点成在线",
  "guide.rename": "改名字",
  "guide.fold": "账本只追加",
  "guide.online": "点成在线",
  "guide.server": "开关服务器",
  "guide.offline": "先掉线",

  "isle.sun": "太阳岛",
  "isle.moon": "月亮岛",
  "isle.locked": "月亮岛还没开",
  "isle.empty": "还没有小生物",
  "isle.full": "住满了",
  "isle.storm": "风暴",
  "isle.replay": "回放",
  "isle.fold": "账本",
  "isle.vault": "账本",

  "act.feed": "喂",
  "act.play": "玩",
  "act.sleep": "睡",
  "act.release": "放生",
  "act.ferry": "点成在线",
  "act.ferryBack": "留在这座岛",
  "isle.online": "在线",
  "isle.offline": "离线",
  "isle.unreachable": "连不上",
  "net.server": "服务器",
  "net.serverDown": "服务器挂了",
  "log.append": "只能追加，不能改已经写下的事件",
  "log.empty": "还没有事件。只有写入成功，才会记下来。",
  "log.ghost": "没有进账本",
  "step.0": 'client("{event}", payload) 发出一次写入',
  "step.1": "EventGroup 找到对应的 handler",
  "step.2": "先跑 handler。失败的话，账本不动",
  "step.3": "成功后，EventJournal 才追加一条记录",

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
  "cap.online": "{isle} 连上了。落下的进度会自动补回来。",
  "cap.offline": "{isle} 掉线了。新事件先记在本机。",
  "cap.serverUp": "服务器开了。在线的岛会重新连上。",
  "cap.serverDown": "服务器挂了。两边都连不上，事件先记在本机。",
  "cap.unreachable": "服务器挂了，{isle} 连不上。开起来就会自动追上。",
  "cap.storm": "岛被吹空了，账本还在。",
  "cap.replay": "正按账本一只只长回来。",
  "cap.fold": "账本只追加。已经写下的一行都不会改。",
  "cap.conflict": "同一只，两边都改过。",

  "forge.1": "client",
  "forge.2": "EventGroup",
  "forge.3": "handler",
  "forge.4": "journal",

  "help.title": "这是在学什么",
  "help.lead": "岛上已经在玩了。这里只把两个名字讲清楚：Effect，和它的 EventLog。",
  "help.close": "回去玩",
  "help.tab.effect": "Effect",
  "help.tab.log": "EventLog",
  "help.fx.1.k": "先写清楚，再去做",
  "help.fx.1.v":
    "Effect 不是一跑起来就停不下来的脚本。它先是一份说明：做成什么样、可能哪里不行、路上需要什么。你组合好，最后才真的去做。",
  "help.fx.2.k": "成败写在类型上",
  "help.fx.2.v":
    "三个空位：成功、失败、需要什么。失败也有名字，不会被悄悄吃掉。喂撑了、岛住满了，都是这种「说不」。",
  "help.fx.3.k": "这岛在教什么",
  "help.fx.3.v":
    "这座岛就是用 Effect EventLog 写的。handler 先说行不行，行了才记进账本。刷新就是新的一局。Atom 把账本绑到岛上。",
  "help.ray.k": "本来只想讲给她听",
  "help.ray.v":
    "Ray 做这座岛，是为了跟老婆把 Effect 讲明白。本来只想简单抛光一下，不小心做得太好，变成了你现在玩的这个。还想看他再做更多好玩的？去推特催更。",
  "help.ray.cta": "去催 Ray",
  "help.fx.slot.success": "做成了",
  "help.fx.slot.error": "说不",
  "help.fx.slot.needs": "路上要什么",
  "help.path.title": "同一次写入，两边对照",
  "help.path.hint": "拨成功或吃撑，看岛和账本怎么分叉。",
  "help.path.ok": "孵成功",
  "help.path.no": "吃撑了",
  "help.path.play": "走一遍",
  "help.path.isle": "岛上",
  "help.path.book": "账本",
  "help.path.isle.ok": "多了一只 Pip",
  "help.path.isle.no": "还是原来那只",
  "help.path.book.ok": "+ Hatched",
  "help.path.book.no": "一条都没写",
  "help.path.0.k": "client",
  "help.path.0.v": "先发出一次写入。这时候账本还没动。",
  "help.path.1.k": "EventGroup",
  "help.path.1.v": "目录只说明这件事叫什么、钥匙是谁。它自己不写也不跑。",
  "help.path.2.k": "handler",
  "help.path.2.ok": "先问一声成不成。成了，才往下走。",
  "help.path.2.no": "问了一声：不行。后面那一笔就不会发生。",
  "help.path.3.k": "journal",
  "help.path.3.ok": "问过了，才记进账本。这件事才算发生过。",
  "help.path.3.no": "账本纹丝不动。那口粮等于没喂。",
  "help.beats": "同一条规则，岛上还会这样",
  "help.1.k": "本地账本",
  "help.1.v": "写入、拒绝、风暴、回放：写进账本的才算发生，画面只是读出来的样子。",
  "help.2.k": "在线",
  "help.2.v": "两座岛都连着服务器时，改名会自己同步过去。钥匙仍是同一个 id。",
  "help.3.k": "服务器",
  "help.3.v": "服务器挂了，岛上仍能写。连回来，对岸会追上。",
} as const;

const en: Record<keyof typeof zh, string> = {
  "lang.label": "Language",
  "boot.go": "Start playing",
  "boot.title": "Two little isles, waiting for someone to raise.",
  "boot.body":
    "Sun Isle and Moon Isle. Raise two, go online and rename, then drop the server once.",
  "boot.credit": "Made by Ray and {grok} Grok",
  "boot.github": "Open source",
  "boot.made":
    "{phone} On an iPhone, {grok} Grok Build pinched out v1 (unreal). Exported it, tossed it into Cursor, and let {spark} Grok 4.6 polish it (we mashed the pedals). Turned out pretty good.",
  "boot.art":
    "{pic} Every style, picture, and clip was counted out by {grok} Grok, token by token.",
  "boot.effect":
    "Effect is a TypeScript toolkit for programs you can trust. Success, failure, and what it needs all live in the type.",
  "boot.site": "Visit effect.website",
  "boot.lift": "Opening the journal",
  "boot.ready": "Welcome ashore",
  "boot.chip.pip": "Pip wakes",
  "boot.chip.nub": "Nub plays",
  "boot.chip.bean": "Bean sprouts",
  "boot.chip.ashore": "Ashore!",
  "log.all": "All events",

  "ms.1.title": "Raise two on Sun Isle",
  "ms.1.hint": "Put one on the isle, feed it full, put a different one on, then Storm and Replay.",
  "ms.1.win":
    "Only journal writes happened. A stuffed feed is refused; storm clears the picture; replay grows both back.",

  "ms.2.title": "Go online, then rename",
  "ms.2.hint": "Put both isles online, then rename one. The other side changes too.",
  "ms.2.win": "When both are on the server, a rename merges by itself.",

  "ms.3.title": "The server drops",
  "ms.3.hint": "Turn the server off, play, then turn it back on.",
  "ms.3.win":
    "The isle can still write while the server is down. Coming back, the other side catches up.",

  "ms.free.title": "The isles are yours",
  "ms.free.hint":
    "Feed, play, sleep, rename, release. Or take an isle offline, or drop the server again.",

  "hud.next": "Next",
  "hud.free": "Free play",
  "hud.again": "Play again",
  "hud.step": "{n}/3",
  "guide.tap": "Tap here",
  "guide.hatch": "Put it on the isle",
  "guide.feed": "Feed it full",
  "guide.play": "Play",
  "guide.storm": "Blow them away",
  "guide.replay": "Grow them back",
  "guide.ferry": "Go online",
  "guide.rename": "Rename",
  "guide.fold": "The journal only appends",
  "guide.online": "Go online",
  "guide.server": "Toggle the server",
  "guide.offline": "Go offline",

  "isle.sun": "Sun Isle",
  "isle.moon": "Moon Isle",
  "isle.locked": "Moon Isle isn't open yet",
  "isle.empty": "No critters yet",
  "isle.full": "Full",
  "isle.storm": "Storm",
  "isle.replay": "Replay",
  "isle.fold": "Journal",
  "isle.vault": "Journal",

  "act.feed": "Feed",
  "act.play": "Play",
  "act.sleep": "Sleep",
  "act.release": "Release",
  "act.ferry": "Go online",
  "act.ferryBack": "Stay on this isle",
  "isle.online": "Online",
  "isle.offline": "Offline",
  "isle.unreachable": "No server",
  "net.server": "Server",
  "net.serverDown": "Server down",
  "log.append": "Append-only — existing entries never change",
  "log.empty": "No events yet. Only a successful write is recorded.",
  "log.ghost": "not in the journal",
  "step.0": 'client("{event}", payload) submits a write',
  "step.1": "EventGroup finds the matching handler",
  "step.2": "The handler runs first. If it fails, the journal stays put",
  "step.3": "Only then EventJournal appends an entry",

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
  "cap.online": "{isle} is online. It will catch up anything it missed.",
  "cap.offline": "{isle} dropped offline. New events stay on this device.",
  "cap.serverUp": "Server is up. Online isles will reconnect.",
  "cap.serverDown": "Server is down. Both isles write locally.",
  "cap.unreachable": "Server is down, so {isle} can't connect. Turn it back on to catch up.",
  "cap.storm": "Isle cleared. The journal remains.",
  "cap.replay": "Growing them back from the journal.",
  "cap.fold": "The journal only appends. Existing lines never change.",
  "cap.conflict": "Same critter, both sides wrote.",

  "forge.1": "client",
  "forge.2": "EventGroup",
  "forge.3": "handler",
  "forge.4": "journal",

  "help.title": "What is this teaching?",
  "help.lead":
    "The isles already play it out. Here we just name two things: Effect, and its EventLog.",
  "help.close": "Back to play",
  "help.tab.effect": "Effect",
  "help.tab.log": "EventLog",
  "help.fx.1.k": "Write it down, then do it",
  "help.fx.1.v":
    "An Effect is not a script that starts and never stops. It is a description first: what success looks like, how it can fail, and what it needs. You put it together, then you run it.",
  "help.fx.2.k": "Success and failure live in the type",
  "help.fx.2.v":
    "Three slots: success, error, and what it needs. Failures have names — they are not swallowed. Stuffed, isle-full: those are a typed “no”.",
  "help.fx.3.k": "What this isle is for",
  "help.fx.3.v":
    "This isle is written with Effect EventLog. The handler decides first; only a yes is committed to the journal. A refresh is a new run. Atom binds that journal to the view.",
  "help.ray.k": "Built to explain it to her",
  "help.ray.v":
    "Ray made this isle so he could walk his wife through Effect. He only meant a light polish, then accidentally made it too good — and it became the game you’re playing. Want more fun like this? Go poke him on X.",
  "help.ray.cta": "Nudge Ray",
  "help.fx.slot.success": "what you get",
  "help.fx.slot.error": "how it fails",
  "help.fx.slot.needs": "what it needs",
  "help.path.title": "The same write, both sides",
  "help.path.hint": "Flip hatch / stuffed and watch the isle and the journal split.",
  "help.path.ok": "Hatch ok",
  "help.path.no": "Stuffed",
  "help.path.play": "Play the write",
  "help.path.isle": "Isle",
  "help.path.book": "Journal",
  "help.path.isle.ok": "Pip is here",
  "help.path.isle.no": "Same critter as before",
  "help.path.book.ok": "+ Hatched",
  "help.path.book.no": "Nothing written",
  "help.path.0.k": "client",
  "help.path.0.v": "A write is submitted. The journal has not moved yet.",
  "help.path.1.k": "EventGroup",
  "help.path.1.v": "The catalog only names the event and its key. It does not write or run.",
  "help.path.2.k": "handler",
  "help.path.2.ok": "Ask first. If yes, we continue.",
  "help.path.2.no": "The answer is no. The next step never happens.",
  "help.path.3.k": "journal",
  "help.path.3.ok": "Only then is it written down. Now it happened.",
  "help.path.3.no": "The journal stays put. That feed never happened.",
  "help.beats": "Same rule, later on the isles",
  "help.1.k": "The local journal",
  "help.1.v":
    "Write, refuse, storm, replay: only journal writes happened. The picture is just a read.",
  "help.2.k": "Online",
  "help.2.v":
    "When both isles are on the server, a rename merges by itself. The key is still the same id.",
  "help.3.k": "Server",
  "help.3.v":
    "The isle can still write while the server is down. Coming back, the other side catches up.",
};

const DICT = { zh, en };
export type MessageKey = keyof typeof zh;

export function translate(
  locale: Locale,
  key: MessageKey,
  params?: Record<string, string | number>,
) {
  return interpolate(DICT[locale][key], params);
}
