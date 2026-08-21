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
  "boot.body": "太阳岛和月亮岛。喂饱饱、陪玩耍、起个可爱的名字，看看小生物们在两座岛上会发生什么。",
  "boot.credit": "由 Ray 和 {grok} Grok 制作",
  "boot.github": "开源仓库",
  "boot.made":
    "{phone} 在 iPhone 上，用 {grok} Grok Build 捏出第一版（太顶了）。导出后丢进 Cursor，让 {spark} Grok 4.6 深度抛光（狠狠地蹬），发现效果真不错。",
  "boot.art": "{pic} 每个样式、每张图、每段视频，都是 {grok} Grok 一个 token 一个 token 算出来的。",
  "boot.effect":
    "Effect 是一套 TypeScript 工具箱，专门写靠得住的程序。成功、失败、路上要什么，都写在类型里。",
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
  "ms.free.hint": "喂食、玩耍、睡觉、改名、放生。也可以把岛设为离线，或者再关一次服务器。",

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
  "help.lead": "在岛上玩得开心吗？这里顺便把背后的两个主角聊清楚：Effect，和它的 EventLog。",
  "help.close": "回去玩",
  "help.tab.effect": "Effect",
  "help.tab.log": "EventLog",
  "help.fx.1.k": "先写清楚，再去做",
  "help.fx.1.v":
    "Effect 不是一跑起来就停不下来的脚本，而是一份清晰的蓝图：期望什么结果、可能遇到什么异常、需要哪些环境依赖。把步骤组装好，最后才真正执行。",
  "help.fx.2.k": "成败写在类型里",
  "help.fx.2.v":
    "三个核心位置：成功、失败、所需环境。失败也是一等公民，绝不会被静默吞掉。不管是小生物吃撑了还是小岛住满了，都是明确有名字的类型。",
  "help.fx.3.k": "像搭积木一样组合",
  "help.fx.3.v":
    "整座小岛的交互都被拆解成纯粹、可复用的小积木。喂食、玩耍、状态同步自然串联在一起，随时可重试、可取消，编写复杂系统也安心从容。",
  "help.ray.k": "本来只想讲给她听",
  "help.ray.v":
    "Ray 做这座小岛，最初只是为了给老婆讲清楚 Effect。没想到做着做着彻底做嗨了，变成了你现在玩的这个小天地。想看更多好玩的？去 X 上催更他吧！",
  "help.ray.cta": "去 X 催更 Ray",
  "help.fx.slot.success": "期望结果",
  "help.fx.slot.error": "明确失败",
  "help.fx.slot.needs": "所需环境",
  "help.path.title": "一次事件写入，两边如何响应？",
  "help.path.hint": "切换成功或拒绝，看小岛画面与底层账本的对应变化。",
  "help.path.ok": "成功孵化",
  "help.path.no": "吃撑拒绝",
  "help.path.play": "演示流程",
  "help.path.isle": "小岛画面",
  "help.path.book": "事件账本",
  "help.path.isle.ok": "多了一只 Pip",
  "help.path.isle.no": "画面保持原样",
  "help.path.book.ok": "+ Hatched 事件落盘",
  "help.path.book.no": "账本完全不变",
  "help.path.0.k": "client",
  "help.path.0.v": "客户端发起一次动作意图。此时底层账本尚未发生任何改变。",
  "help.path.1.k": "EventGroup",
  "help.path.1.v": "定义事件类型与唯一主键，将动作精准路由到对应的校验处理器。",
  "help.path.2.k": "handler",
  "help.path.2.ok": "执行业务校验：条件满足，校验通过，允许继续执行。",
  "help.path.2.no": "校验失败：条件不满足（如吃撑），Handler 明确拒绝，流程提前终止。",
  "help.path.3.k": "journal",
  "help.path.3.ok": "校验通过后追加一条不可篡改的事件记录，小岛状态正式更新生效。",
  "help.path.3.no": "账本纹丝不动，不产生任何脏数据，如同本次无效操作从未发生。",
  "help.beats": "EventLog 的三大核心特性",
  "help.1.k": "不可篡改的单向账本",
  "help.1.v": "只追加不修改。画面只是账本的投影，哪怕遭遇风暴清空，通过回放账本也能完整复原。",
  "help.2.k": "多端协同与自动对齐",
  "help.2.v": "两座小岛在线时，事件基于同一主键自动同步合并，数据最终保持一致。",
  "help.3.k": "离线优先与故障自愈",
  "help.3.v": "服务器挂了，本地依然可以持续写入；重新连线后会自动无缝补齐缺失事件。",
} as const;

const en: Record<keyof typeof zh, string> = {
  "lang.label": "Language",
  "boot.go": "Start raising",
  "boot.title": "Two little isles, waiting for you to raise some critters.",
  "boot.body":
    "Sun Isle and Moon Isle. Feed them full, play together, give them cute names, and see what happens across the two isles.",
  "boot.credit": "Made by Ray and {grok} Grok",
  "boot.github": "GitHub repo",
  "boot.made":
    "{phone} Built v1 on an iPhone with {grok} Grok Build (unreal). Exported into Cursor, let {spark} Grok 4.6 polish it up (full throttle), and it turned out pretty sweet.",
  "boot.art":
    "{pic} Every style, picture, and clip was crafted by {grok} Grok, token by token.",
  "boot.effect":
    "Effect is a TypeScript toolkit for rock-solid systems. Success, failure, and dependencies all live in the types.",
  "boot.site": "Visit effect.website",
  "boot.lift": "Opening the journal",
  "boot.ready": "Welcome ashore",
  "boot.chip.pip": "Pip wakes up",
  "boot.chip.nub": "Nub plays",
  "boot.chip.bean": "Bean sprouts",
  "boot.chip.ashore": "Ashore!",
  "log.all": "All events",

  "ms.1.title": "Raise two on Sun Isle",
  "ms.1.hint": "Place one on the isle, feed it full, add another, then try Storm and Replay.",
  "ms.1.win":
    "Only what's in the journal truly happened. Handlers reject overfeeding; Storm clears the view, and Replay restores both critters.",

  "ms.2.title": "Connect, then rename",
  "ms.2.hint": "Set both isles online, then rename a critter. The other isle will sync automatically.",
  "ms.2.win": "When both isles are online, renames sync across automatically.",

  "ms.3.title": "Server goes down",
  "ms.3.hint": "Turn off the server, play with a critter, then turn it back on.",
  "ms.3.win":
    "The isle can still record events offline. Once reconnected, the other side catches right up.",

  "ms.free.title": "The isles are yours",
  "ms.free.hint":
    "Feed, play, sleep, rename, or release critters. You can also toggle isles offline or stop the server again.",

  "hud.next": "Next",
  "hud.free": "Free play",
  "hud.again": "Play again",
  "hud.step": "{n}/3",
  "guide.tap": "Tap here",
  "guide.hatch": "Place on isle",
  "guide.feed": "Feed full",
  "guide.play": "Play",
  "guide.storm": "Blow away",
  "guide.replay": "Restore",
  "guide.ferry": "Go online",
  "guide.rename": "Rename",
  "guide.fold": "Append-only journal",
  "guide.online": "Go online",
  "guide.server": "Toggle server",
  "guide.offline": "Go offline",

  "isle.sun": "Sun Isle",
  "isle.moon": "Moon Isle",
  "isle.locked": "Moon Isle is locked",
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
  "isle.unreachable": "Unreachable",
  "net.server": "Server",
  "net.serverDown": "Server down",
  "log.append": "Append-only — existing events never change",
  "log.empty": "No events yet. Only successful writes are recorded.",
  "log.ghost": "not in journal",
  "step.0": 'client("{event}", payload) dispatches a write',
  "step.1": "EventGroup resolves the matching handler",
  "step.2": "The handler validates first. If it fails, the journal stays untouched",
  "step.3": "On success, EventJournal appends the entry",

  "stat.belly": "Belly",
  "stat.mood": "Mood",
  "stat.energy": "Energy",

  "err.stuffed": "Already full, can't eat any more.",
  "err.hungry": "Too hungry to play.",
  "err.sleepy": "Too tired right now, let it sleep.",
  "err.full": "The isle is full.",
  "err.missing": "This critter isn't on the isle.",
  "err.noname": "Name cannot be empty.",
  "err.jam": "Couldn't record the event right now.",

  "cap.idle": "Tap a critter to emit an event.",
  "cap.walk": "Event is heading to the journal...",
  "cap.ok": "Committed to the journal.",
  "cap.no": "{why}",
  "cap.sync": "Synced {n} event(s)",
  "cap.syncEmpty": "Both sides are in sync.",
  "cap.online": "{isle} is online. Catching up on missed events.",
  "cap.offline": "{isle} went offline. New events are stored locally.",
  "cap.serverUp": "Server is up. Online isles will reconnect.",
  "cap.serverDown": "Server is down. Both isles record events locally.",
  "cap.unreachable": "Server is down, so {isle} can't connect. It will catch up when restored.",
  "cap.storm": "The isle was wiped, but the journal remains.",
  "cap.replay": "Replaying the journal to restore critters.",
  "cap.fold": "The journal is append-only. Recorded entries never change.",
  "cap.conflict": "Conflict: the same critter was modified on both sides.",

  "forge.1": "client",
  "forge.2": "EventGroup",
  "forge.3": "handler",
  "forge.4": "journal",

  "help.title": "What are we learning?",
  "help.lead":
    "Enjoying the isles? Here, let's unpack the two core heroes behind the scenes: Effect, and its EventLog.",
  "help.close": "Back to play",
  "help.tab.effect": "Effect",
  "help.tab.log": "EventLog",
  "help.fx.1.k": "Declare first, execute later",
  "help.fx.1.v":
    "An Effect isn't a script that runs uncontrollably. It's a clear blueprint: what success looks like, what errors can happen, and what dependencies are required. You compose everything first, and execute only when ready.",
  "help.fx.2.k": "Outcomes live in the types",
  "help.fx.2.v":
    "Three core channels: Success, Error, and Requirements. Failures are first-class and never silently swallowed—whether a critter is full or an isle is at capacity, every rejection is explicitly typed.",
  "help.fx.3.k": "Compose like building blocks",
  "help.fx.3.v":
    "All island interactions are broken down into small, composable pieces. Feeding, playing, and syncing snap together naturally, making complex flows easy to retry, cancel, and trust.",
  "help.ray.k": "Built to explain it to her",
  "help.ray.v":
    "Ray built this project to explain Effect to his wife. What started as a quick prototype got a little too polished—and became the interactive playground you see here. Want more? Go poke him on X!",
  "help.ray.cta": "Nudge Ray on X",
  "help.fx.slot.success": "Success",
  "help.fx.slot.error": "Error",
  "help.fx.slot.needs": "Requirements",
  "help.path.title": "How Events Drive the World",
  "help.path.hint": "Toggle between Success and Rejection to see how the island and journal react.",
  "help.path.ok": "Hatch OK",
  "help.path.no": "Stuffed (Rejected)",
  "help.path.play": "Step through",
  "help.path.isle": "Island View",
  "help.path.book": "Event Journal",
  "help.path.isle.ok": "A new Pip appears",
  "help.path.isle.no": "View stays unchanged",
  "help.path.book.ok": "+ Hatched recorded",
  "help.path.book.no": "Nothing written",
  "help.path.0.k": "client",
  "help.path.0.v": "Client dispatches an action intent. The journal remains untouched at this stage.",
  "help.path.1.k": "EventGroup",
  "help.path.1.v": "Defines the event schema and primary key, routing the action to its handler.",
  "help.path.2.k": "handler",
  "help.path.2.ok": "Validates business rules: conditions are met, checks pass, proceeding to write.",
  "help.path.2.no": "Validation fails: e.g. critter is already full. The handler rejects and aborts early.",
  "help.path.3.k": "journal",
  "help.path.3.ok": "Event is appended to the immutable journal. State officially updates across the island.",
  "help.path.3.no": "The journal stays untouched and clean—as if the invalid action never took place.",
  "help.beats": "Three Core Powers of EventLog",
  "help.1.k": "Append-Only Source of Truth",
  "help.1.v":
    "History is never overwritten. UI is just a projection—even after a storm, replaying the log restores everything.",
  "help.2.k": "Multi-Replica Sync",
  "help.2.v":
    "When both isles are online, renaming automatically syncs across the server using the same primary key.",
  "help.3.k": "Offline Resilience",
  "help.3.v":
    "Even if the server goes down, isles keep writing locally and catch up once reconnected.",
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
