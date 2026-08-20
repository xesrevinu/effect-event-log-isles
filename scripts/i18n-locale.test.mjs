import assert from "node:assert/strict";
import { test } from "node:test";
import { localeFromAcceptLanguage, parseLocale } from "../src/lib/i18n.ts";

test("parseLocale only accepts zh or en", () => {
  assert.equal(parseLocale("zh"), "zh");
  assert.equal(parseLocale("en"), "en");
  assert.equal(parseLocale("ja"), null);
  assert.equal(parseLocale(""), null);
  assert.equal(parseLocale(undefined), null);
});

test("Accept-Language prefers the highest-q supported tag", () => {
  assert.equal(localeFromAcceptLanguage("zh-CN,zh;q=0.9,en;q=0.8"), "zh");
  assert.equal(localeFromAcceptLanguage("en-US,en;q=0.9"), "en");
  assert.equal(localeFromAcceptLanguage("fr,zh;q=0.8,en;q=0.4"), "zh");
  assert.equal(localeFromAcceptLanguage("fr;q=0.8,en-GB;q=0.6"), "en");
  assert.equal(localeFromAcceptLanguage("zh-TW"), "zh");
  assert.equal(localeFromAcceptLanguage("fr,de"), null);
  assert.equal(localeFromAcceptLanguage(""), null);
  assert.equal(localeFromAcceptLanguage("en;q=0,zh"), "zh");
});
