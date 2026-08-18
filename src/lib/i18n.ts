export type Locale = "zh" | "en";

export const STORAGE_KEY = "eventlog-studio-locale";

export function parseAcceptLanguage(header: string | null | undefined): Locale {
  const parts = String(header ?? "")
    .toLowerCase()
    .split(",")
    .map((p) => p.split(";")[0]?.trim() ?? "")
    .filter(Boolean);
  for (const tag of parts) {
    if (tag.startsWith("zh")) return "zh";
    if (tag.startsWith("en")) return "en";
  }
  return "en";
}

export function detectBrowserLocale(): Locale {
  if (typeof navigator === "undefined") return "en";
  const langs = [navigator.language, ...(navigator.languages ?? [])];
  return langs.some((l) => l.toLowerCase().startsWith("zh")) ? "zh" : "en";
}

export function readStoredLocale(): Locale | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "zh" || v === "en") return v;
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
}

export function interpolate(template: string, params?: Record<string, string | number>) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    params[key] === undefined ? `{${key}}` : String(params[key]),
  );
}

const zh = {
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
  "ms.4.hint": "点「去月亮岛」，月亮岛会收到同一只。",
  "ms.4.win": "渡过去的是事件，不是把整座岛复制一份。",

  "ms.5.title": "两边起名",
  "ms.5.hint": "点它的名字，两边改成不一样的，再渡一次。",
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
  "guide.tap": "点这里",
  "guide.rename": "改名字",

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
  "act.ferry": "去月亮岛",
  "act.ferryBack": "回太阳岛",
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

  "forge.1": "client",
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
  "help.6.v": "groupCompaction 把一串事件收成一条快照。",
} as const;

const en: Record<keyof typeof zh, string> = {
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
  "ms.4.hint": "Tap “To Moon Isle”. Moon Isle receives the same critter.",
  "ms.4.win": "You synced events, not a copy of the island.",

  "ms.5.title": "Two names",
  "ms.5.hint": "Tap the name, call it something different on each isle, then sail again.",
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
  "guide.tap": "Tap here",
  "guide.rename": "Rename",

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
  "act.ferry": "To Moon Isle",
  "act.ferryBack": "Back to Sun",
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

  "forge.1": "client",
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
  "help.6.v": "groupCompaction folds a chain of events into a snapshot.",
};

export const DICT = { zh, en };
export type MessageKey = keyof typeof zh;

export function translate(
  locale: Locale,
  key: MessageKey,
  params?: Record<string, string | number>,
) {
  return interpolate(DICT[locale][key], params);
}
