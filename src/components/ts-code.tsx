import { cn } from "@/lib/cn";

const KEYWORDS = new Set([
  "const",
  "let",
  "return",
  "yield",
  "if",
  "else",
  "new",
  "export",
  "import",
  "from",
  "type",
  "function",
  "async",
  "await",
  "void",
  "never",
  "in",
  "of",
]);

const TYPES = new Set([
  "Effect",
  "Event",
  "EventGroup",
  "EventLog",
  "EventJournal",
  "Entry",
  "Layer",
  "Schema",
  "Identity",
  "Hatched",
  "Named",
  "Fed",
  "Played",
  "Slept",
  "Released",
  "Snapshot",
  "Stuffed",
  "Full",
  "string",
  "number",
]);

type Kind = "kw" | "type" | "str" | "fn" | "cm" | "num" | "punct" | "id" | "space";

function tokenize(src: string): { kind: Kind; text: string }[] {
  const out: { kind: Kind; text: string }[] = [];
  let i = 0;
  while (i < src.length) {
    if (src.startsWith("//", i)) {
      const end = src.indexOf("\n", i);
      const stop = end === -1 ? src.length : end;
      out.push({ kind: "cm", text: src.slice(i, stop) });
      i = stop;
      continue;
    }
    const ch = src[i];
    if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < src.length && src[j] !== ch) {
        if (src[j] === "\\") j += 2;
        else j += 1;
      }
      out.push({ kind: "str", text: src.slice(i, Math.min(j + 1, src.length)) });
      i = Math.min(j + 1, src.length);
      continue;
    }
    if (ch >= "0" && ch <= "9") {
      let j = i + 1;
      while (j < src.length && /[\d.]/.test(src[j])) j += 1;
      out.push({ kind: "num", text: src.slice(i, j) });
      i = j;
      continue;
    }
    if (/[A-Za-z_$]/.test(ch)) {
      let j = i + 1;
      while (j < src.length && /[\w$]/.test(src[j])) j += 1;
      const id = src.slice(i, j);
      let k = j;
      while (k < src.length && (src[k] === " " || src[k] === "\t")) k += 1;
      const call = src[k] === "(";
      const kind: Kind = KEYWORDS.has(id)
        ? "kw"
        : TYPES.has(id) || /^[A-Z]/.test(id)
          ? "type"
          : call
            ? "fn"
            : "id";
      out.push({ kind, text: id });
      i = j;
      continue;
    }
    if (/\s/.test(ch)) {
      let j = i + 1;
      while (j < src.length && /\s/.test(src[j])) j += 1;
      out.push({ kind: "space", text: src.slice(i, j) });
      i = j;
      continue;
    }
    out.push({ kind: "punct", text: ch });
    i += 1;
  }
  return out;
}

export function TsCode({ src, className }: { src: string; className?: string }) {
  return (
    <pre className={cn("help-code", className)}>
      <code className="language-ts">
        {tokenize(src).map((tok, i) =>
          tok.kind === "space" ? (
            tok.text
          ) : (
            <span key={`${i}-${tok.kind}`} className={`tok-${tok.kind}`}>
              {tok.text}
            </span>
          ),
        )}
      </code>
    </pre>
  );
}

export function HelpText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/`([^`]+)`/g);
  return (
    <span className={className}>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <code key={i} className="help-inline">
            {part}
          </code>
        ) : (
          part
        ),
      )}
    </span>
  );
}
