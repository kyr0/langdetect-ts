import { beforeEach, describe, expect, it, test } from "vitest";
import {
  detectLanguage,
  createDetectorFactory,
  createDetector,
  addProfile,
  type NGram,
  defaultNGram,
  type LangProfile,
  MAX_TEXT_LENGTH,
  type DetectorFactory,
  omitLessFreq,
} from "./";
import { perf } from "@jsheaven/perf";
import { all } from "./profiles/all";
import { readFileSync } from "node:fs";

const englishCorpusText = readFileSync(
  "./src/test/english_corpus.txt",
  "utf-8",
);

// pre-compute dimensions
const corpusSplits = englishCorpusText
  .split(" ")
  .filter((t: string) => !!t)
  .map((t: string) => t.trim());

const dimensionality = [20, 100, 1000, 10000].map((dims) => ({
  dims,
  text: corpusSplits.slice(0, dims).join(" "),
}));
// @ts-ignore

test("Make sure the API interface/contract is fulfilled", async () => {
  expect(typeof detectLanguage).toEqual("function");
  expect(typeof createDetectorFactory).toEqual("function");
  expect(typeof createDetector).toEqual("function");
  expect(typeof addProfile).toEqual("function");
  expect(typeof defaultNGram).toBeDefined();
});

test("Can create a detector factory", async () => {
  const factory = createDetectorFactory(all);

  expect(factory).toBeDefined();
  expect(typeof factory).toEqual("object");
  expect(typeof factory.langList).toBeDefined();
  expect(typeof factory.seed).toBeDefined();
  expect(typeof factory.wordLangProbMap).toBeDefined();
});

test("Can create a detector", async () => {
  const factory = createDetectorFactory(all);
  const detector = createDetector(factory);

  expect(detector).toBeDefined();
  expect(typeof detector).toEqual("object");
  expect(typeof detector.append).toBeDefined();
  expect(typeof detector.detect).toBeDefined();
  expect(typeof detector.normalize).toBeDefined();
  expect(typeof detector.setAlpha).toBeDefined();
  expect(typeof detector.setMaxTextLength).toBeDefined();
  expect(typeof detector.setPriorMap).toBeDefined();
  expect(typeof detector.getNGram).toBeDefined();
  expect(typeof detector.addChar).toBeDefined();
  expect(typeof detector.normalizeVi).toBeDefined();
  expect(typeof detector.getText).toBeDefined();
});

test("Normalizes text correctly with Latin", async () => {
  const factory = createDetectorFactory(all);
  const detector = createDetector(factory);

  expect(detector.normalize("\u0000")).toEqual(" ");
  expect(detector.normalize("\u0009")).toEqual(" ");
  expect(detector.normalize("\u0020")).toEqual(" ");
  expect(detector.normalize("\u0030")).toEqual(" ");
  expect(detector.normalize("\u0040")).toEqual(" ");
  expect(detector.normalize("\u0041")).toEqual("\u0041");
  expect(detector.normalize("\u005A")).toEqual("\u005A");
  expect(detector.normalize("\u005B")).toEqual(" ");
  expect(detector.normalize("\u0060")).toEqual(" ");
  expect(detector.normalize("\u0061")).toEqual("\u0061");
  expect(detector.normalize("\u007A")).toEqual("\u007A");
  expect(detector.normalize("\u007B")).toEqual(" ");
  expect(detector.normalize("\u007F")).toEqual(" ");
  expect(detector.normalize("\u0080")).toEqual("\u0080");
  expect(detector.normalize("\u00A0")).toEqual(" ");
  expect(detector.normalize("\u00A1")).toEqual("\u00A1");
});

test("Normalizes text correctly with CJK Kanji", async () => {
  const factory = createDetectorFactory(all);
  const detector = createDetector(factory);

  expect(detector.normalize("\u4E00")).toEqual("\u4E00");
  expect(detector.normalize("\u4E01")).toEqual("\u4E01");
  expect(detector.normalize("\u4E02")).toEqual("\u4E02");
  expect(detector.normalize("\u4E03")).toEqual("\u4E01");
  expect(detector.normalize("\u4E04")).toEqual("\u4E04");
  expect(detector.normalize("\u4E05")).toEqual("\u4E05");
  expect(detector.normalize("\u4E06")).toEqual("\u4E06");
  expect(detector.normalize("\u4E07")).toEqual("\u4E07");
  expect(detector.normalize("\u4E08")).toEqual("\u4E08");
  expect(detector.normalize("\u4E09")).toEqual("\u4E09");
  expect(detector.normalize("\u4E10")).toEqual("\u4E10");
  expect(detector.normalize("\u4E11")).toEqual("\u4E11");
  expect(detector.normalize("\u4E12")).toEqual("\u4E12");
  expect(detector.normalize("\u4E13")).toEqual("\u4E13");
  expect(detector.normalize("\u4E14")).toEqual("\u4E14");
  expect(detector.normalize("\u4E15")).toEqual("\u4E15");
  expect(detector.normalize("\u4E1E")).toEqual("\u4E1E");
  expect(detector.normalize("\u4E1F")).toEqual("\u4E1F");
  expect(detector.normalize("\u4E20")).toEqual("\u4E20");
  expect(detector.normalize("\u4E21")).toEqual("\u4E21");
  expect(detector.normalize("\u4E22")).toEqual("\u4E22");
  expect(detector.normalize("\u4E23")).toEqual("\u4E23");
  expect(detector.normalize("\u4E24")).toEqual("\u4E13");
  expect(detector.normalize("\u4E25")).toEqual("\u4E13");
  expect(detector.normalize("\u4E30")).toEqual("\u4E30");
});

test("Normalizes text correctly with Romanian", async () => {
  const factory = createDetectorFactory(all);
  const detector = createDetector(factory);

  expect(detector.normalize("\u015f")).toEqual("\u015f");
  expect(detector.normalize("\u0163")).toEqual("\u0163");
  expect(detector.normalize("\u0219")).toEqual("\u015f");
  expect(detector.normalize("\u021b")).toEqual("\u0163");
});

test("Test nGram", async () => {
  const nGram: NGram = {
    ...defaultNGram,
  };
  const factory = createDetectorFactory(all);
  const detector = createDetector(factory);

  expect(detector.getNGram(nGram, 0)).toEqual(undefined);
  expect(detector.getNGram(nGram, 1)).toEqual(undefined);
  expect(detector.getNGram(nGram, 2)).toEqual(undefined);
  expect(detector.getNGram(nGram, 3)).toEqual(undefined);
  expect(detector.getNGram(nGram, 4)).toEqual(undefined);

  detector.addChar(nGram, " ");
  expect(detector.getNGram(nGram, 0)).toEqual(undefined);
  expect(detector.getNGram(nGram, 1)).toEqual(undefined);
  expect(detector.getNGram(nGram, 2)).toEqual(undefined);

  detector.addChar(nGram, "A");
  expect(detector.getNGram(nGram, 1)).toEqual("A");
  expect(detector.getNGram(nGram, 2)).toEqual(" A");
  expect(detector.getNGram(nGram, 3)).toEqual(undefined);

  detector.addChar(nGram, "\u06cc");
  expect(detector.getNGram(nGram, 1)).toEqual("\u064a");
  expect(detector.getNGram(nGram, 2)).toEqual("A\u064a");
  expect(detector.getNGram(nGram, 3)).toEqual(" A\u064a");

  detector.addChar(nGram, "\u1ea0");
  expect(detector.getNGram(nGram, 1)).toEqual("\u1ec3");
  expect(detector.getNGram(nGram, 2)).toEqual("\u064a\u1ec3");
  expect(detector.getNGram(nGram, 3)).toEqual("A\u064a\u1ec3");

  detector.addChar(nGram, "\u3044");
  expect(detector.getNGram(nGram, 1)).toEqual("\u3042");
  expect(detector.getNGram(nGram, 2)).toEqual("\u1ec3\u3042");
  expect(detector.getNGram(nGram, 3)).toEqual("\u064a\u1ec3\u3042");

  detector.addChar(nGram, "\u30a4");
  expect(detector.getNGram(nGram, 1)).toEqual("\u30a2");
  expect(detector.getNGram(nGram, 2)).toEqual("\u3042\u30a2");
  expect(detector.getNGram(nGram, 3)).toEqual("\u1ec3\u3042\u30a2");

  detector.addChar(nGram, "\u3106");
  expect(detector.getNGram(nGram, 1)).toEqual("\u3105");
  expect(detector.getNGram(nGram, 2)).toEqual("\u30a2\u3105");
  expect(detector.getNGram(nGram, 3)).toEqual("\u3042\u30a2\u3105");

  detector.addChar(nGram, "\uac01");
  expect(detector.getNGram(nGram, 1)).toEqual("\uac00");
  expect(detector.getNGram(nGram, 2)).toEqual("\u3105\uac00");
  expect(detector.getNGram(nGram, 3)).toEqual("\u30a2\u3105\uac00");

  detector.addChar(nGram, "\u2010");
  expect(detector.getNGram(nGram, 1)).toEqual(undefined);
  expect(detector.getNGram(nGram, 2)).toEqual("\uac00 ");
  expect(detector.getNGram(nGram, 3)).toEqual("\u3105\uac00 ");

  detector.addChar(nGram, "a");
  expect(detector.getNGram(nGram, 1)).toEqual("a");
  expect(detector.getNGram(nGram, 2)).toEqual(" a");
  expect(detector.getNGram(nGram, 3)).toEqual(undefined);
});

test("Test nGram 3", async () => {
  const nGram: NGram = {
    ...defaultNGram,
  };
  const factory = createDetectorFactory(all);
  const detector = createDetector(factory);

  detector.addChar(nGram, "A");
  expect(detector.getNGram(nGram, 1)).toEqual("A");
  expect(detector.getNGram(nGram, 2)).toEqual(" A");
  expect(detector.getNGram(nGram, 3)).toEqual(undefined);

  detector.addChar(nGram, "1");
  expect(detector.getNGram(nGram, 1)).toEqual(undefined);
  expect(detector.getNGram(nGram, 2)).toEqual("A ");
  expect(detector.getNGram(nGram, 3)).toEqual(" A ");

  detector.addChar(nGram, "B");
  expect(detector.getNGram(nGram, 1)).toEqual("B");
  expect(detector.getNGram(nGram, 2)).toEqual(" B");
  expect(detector.getNGram(nGram, 3)).toEqual(undefined);
});

test("Should replace URLs and emails with spaces", async () => {
  const factory = createDetectorFactory(all);
  const detector = createDetector(factory);

  const inputText = "Visit https://example.com or contact me@example.com";
  const expectedText = "Visit or contact";
  detector.append(inputText);
  expect(detector.getText()).toEqual(expectedText.slice(0, MAX_TEXT_LENGTH));
});

test("Should normalize Vietnamese characters", async () => {
  const factory = createDetectorFactory(all);
  const detector = createDetector(factory);
  const inputText = "\u0041\u0300";
  const expectedText = "\u00C0";
  detector.append(inputText);
  expect(detector.getText()).toEqual(expectedText);
});

test("Should reduce multiple spaces to a single space", async () => {
  const factory = createDetectorFactory(all);
  const detector = createDetector(factory);
  const inputText = "This  is   a   test.";
  const expectedText = "This is a test.";
  detector.append(inputText);
  expect(detector.getText()).toEqual(expectedText.slice(0, MAX_TEXT_LENGTH));
});

test("Should truncate text to the maximum text length", async () => {
  const factory = createDetectorFactory(all);
  const detector = createDetector(factory);
  const inputText = "a".repeat(MAX_TEXT_LENGTH + 10);
  const expectedText = "a".repeat(MAX_TEXT_LENGTH);
  detector.append(inputText);
  expect(detector.getText()).toEqual(expectedText);
});

test("Test normalizeVi", async () => {
  const factory = createDetectorFactory(all);
  const detector = createDetector(factory);

  expect(detector.normalizeVi("")).toEqual("");
  expect(detector.normalizeVi("ABC")).toEqual("ABC");
  expect(detector.normalizeVi("012")).toEqual("012");
  expect(detector.normalizeVi("\u00c0")).toEqual("\u00c0");

  expect(detector.normalizeVi("\u0041\u0300")).toEqual("\u00C0");
  expect(detector.normalizeVi("\u0045\u0300")).toEqual("\u00C8");
  expect(detector.normalizeVi("\u0049\u0300")).toEqual("\u00CC");
  expect(detector.normalizeVi("\u004F\u0300")).toEqual("\u00D2");
  expect(detector.normalizeVi("\u0055\u0300")).toEqual("\u00D9");
  expect(detector.normalizeVi("\u0059\u0300")).toEqual("\u1EF2");
  expect(detector.normalizeVi("\u0061\u0300")).toEqual("\u00E0");
  expect(detector.normalizeVi("\u0065\u0300")).toEqual("\u00E8");
  expect(detector.normalizeVi("\u0069\u0300")).toEqual("\u00EC");
  expect(detector.normalizeVi("\u006F\u0300")).toEqual("\u00F2");
  expect(detector.normalizeVi("\u0075\u0300")).toEqual("\u00F9");
  expect(detector.normalizeVi("\u0079\u0300")).toEqual("\u1EF3");
  expect(detector.normalizeVi("\u00C2\u0300")).toEqual("\u1EA6");
  expect(detector.normalizeVi("\u00CA\u0300")).toEqual("\u1EC0");
  expect(detector.normalizeVi("\u00D4\u0300")).toEqual("\u1ED2");
  expect(detector.normalizeVi("\u00E2\u0300")).toEqual("\u1EA7");
  expect(detector.normalizeVi("\u00EA\u0300")).toEqual("\u1EC1");
  expect(detector.normalizeVi("\u00F4\u0300")).toEqual("\u1ED3");
  expect(detector.normalizeVi("\u0102\u0300")).toEqual("\u1EB0");
  expect(detector.normalizeVi("\u0103\u0300")).toEqual("\u1EB1");
  expect(detector.normalizeVi("\u01A0\u0300")).toEqual("\u1EDC");
  expect(detector.normalizeVi("\u01A1\u0300")).toEqual("\u1EDD");
  expect(detector.normalizeVi("\u01AF\u0300")).toEqual("\u1EEA");
  expect(detector.normalizeVi("\u01B0\u0300")).toEqual("\u1EEB");

  expect(detector.normalizeVi("\u0041\u0301")).toEqual("\u00C1");
  expect(detector.normalizeVi("\u0045\u0301")).toEqual("\u00C9");
  expect(detector.normalizeVi("\u0049\u0301")).toEqual("\u00CD");
  expect(detector.normalizeVi("\u004F\u0301")).toEqual("\u00D3");
  expect(detector.normalizeVi("\u0055\u0301")).toEqual("\u00DA");
  expect(detector.normalizeVi("\u0059\u0301")).toEqual("\u00DD");
  expect(detector.normalizeVi("\u0061\u0301")).toEqual("\u00E1");
  expect(detector.normalizeVi("\u0065\u0301")).toEqual("\u00E9");
  expect(detector.normalizeVi("\u0069\u0301")).toEqual("\u00ED");
  expect(detector.normalizeVi("\u006F\u0301")).toEqual("\u00F3");
  expect(detector.normalizeVi("\u0075\u0301")).toEqual("\u00FA");
  expect(detector.normalizeVi("\u0079\u0301")).toEqual("\u00FD");
  expect(detector.normalizeVi("\u00C2\u0301")).toEqual("\u1EA4");
  expect(detector.normalizeVi("\u00CA\u0301")).toEqual("\u1EBE");
  expect(detector.normalizeVi("\u00D4\u0301")).toEqual("\u1ED0");
  expect(detector.normalizeVi("\u00E2\u0301")).toEqual("\u1EA5");
  expect(detector.normalizeVi("\u00EA\u0301")).toEqual("\u1EBF");
  expect(detector.normalizeVi("\u00F4\u0301")).toEqual("\u1ED1");
  expect(detector.normalizeVi("\u0102\u0301")).toEqual("\u1EAE");
  expect(detector.normalizeVi("\u0103\u0301")).toEqual("\u1EAF");
  expect(detector.normalizeVi("\u01A0\u0301")).toEqual("\u1EDA");
  expect(detector.normalizeVi("\u01A1\u0301")).toEqual("\u1EDB");
  expect(detector.normalizeVi("\u01AF\u0301")).toEqual("\u1EE8");
  expect(detector.normalizeVi("\u01B0\u0301")).toEqual("\u1EE9");

  expect(detector.normalizeVi("\u0041\u0303")).toEqual("\u00C3");
  expect(detector.normalizeVi("\u0045\u0303")).toEqual("\u1EBC");
  expect(detector.normalizeVi("\u0049\u0303")).toEqual("\u0128");
  expect(detector.normalizeVi("\u004F\u0303")).toEqual("\u00D5");
  expect(detector.normalizeVi("\u0055\u0303")).toEqual("\u0168");
  expect(detector.normalizeVi("\u0059\u0303")).toEqual("\u1EF8");
  expect(detector.normalizeVi("\u0061\u0303")).toEqual("\u00E3");
  expect(detector.normalizeVi("\u0065\u0303")).toEqual("\u1EBD");
  expect(detector.normalizeVi("\u0069\u0303")).toEqual("\u0129");
  expect(detector.normalizeVi("\u006F\u0303")).toEqual("\u00F5");
  expect(detector.normalizeVi("\u0075\u0303")).toEqual("\u0169");
  expect(detector.normalizeVi("\u0079\u0303")).toEqual("\u1EF9");
  expect(detector.normalizeVi("\u00C2\u0303")).toEqual("\u1EAA");
  expect(detector.normalizeVi("\u00CA\u0303")).toEqual("\u1EC4");
  expect(detector.normalizeVi("\u00D4\u0303")).toEqual("\u1ED6");
  expect(detector.normalizeVi("\u00E2\u0303")).toEqual("\u1EAB");
  expect(detector.normalizeVi("\u00EA\u0303")).toEqual("\u1EC5");
  expect(detector.normalizeVi("\u00F4\u0303")).toEqual("\u1ED7");
  expect(detector.normalizeVi("\u0102\u0303")).toEqual("\u1EB4");
  expect(detector.normalizeVi("\u0103\u0303")).toEqual("\u1EB5");
  expect(detector.normalizeVi("\u01A0\u0303")).toEqual("\u1EE0");
  expect(detector.normalizeVi("\u01A1\u0303")).toEqual("\u1EE1");
  expect(detector.normalizeVi("\u01AF\u0303")).toEqual("\u1EEE");
  expect(detector.normalizeVi("\u01B0\u0303")).toEqual("\u1EEF");

  expect(detector.normalizeVi("\u0041\u0309")).toEqual("\u1EA2");
  expect(detector.normalizeVi("\u0045\u0309")).toEqual("\u1EBA");
  expect(detector.normalizeVi("\u0049\u0309")).toEqual("\u1EC8");
  expect(detector.normalizeVi("\u004F\u0309")).toEqual("\u1ECE");
  expect(detector.normalizeVi("\u0055\u0309")).toEqual("\u1EE6");
  expect(detector.normalizeVi("\u0059\u0309")).toEqual("\u1EF6");
  expect(detector.normalizeVi("\u0061\u0309")).toEqual("\u1EA3");
  expect(detector.normalizeVi("\u0065\u0309")).toEqual("\u1EBB");
  expect(detector.normalizeVi("\u0069\u0309")).toEqual("\u1EC9");
  expect(detector.normalizeVi("\u006F\u0309")).toEqual("\u1ECF");
  expect(detector.normalizeVi("\u0075\u0309")).toEqual("\u1EE7");
  expect(detector.normalizeVi("\u0079\u0309")).toEqual("\u1EF7");
  expect(detector.normalizeVi("\u00C2\u0309")).toEqual("\u1EA8");
  expect(detector.normalizeVi("\u00CA\u0309")).toEqual("\u1EC2");
  expect(detector.normalizeVi("\u00D4\u0309")).toEqual("\u1ED4");
  expect(detector.normalizeVi("\u00E2\u0309")).toEqual("\u1EA9");
  expect(detector.normalizeVi("\u00EA\u0309")).toEqual("\u1EC3");
  expect(detector.normalizeVi("\u00F4\u0309")).toEqual("\u1ED5");
  expect(detector.normalizeVi("\u0102\u0309")).toEqual("\u1EB2");
  expect(detector.normalizeVi("\u0103\u0309")).toEqual("\u1EB3");
  expect(detector.normalizeVi("\u01A0\u0309")).toEqual("\u1EDE");
  expect(detector.normalizeVi("\u01A1\u0309")).toEqual("\u1EDF");
  expect(detector.normalizeVi("\u01AF\u0309")).toEqual("\u1EEC");
  expect(detector.normalizeVi("\u01B0\u0309")).toEqual("\u1EED");

  expect(detector.normalizeVi("\u0041\u0323")).toEqual("\u1EA0");
  expect(detector.normalizeVi("\u0045\u0323")).toEqual("\u1EB8");
  expect(detector.normalizeVi("\u0049\u0323")).toEqual("\u1ECA");
  expect(detector.normalizeVi("\u004F\u0323")).toEqual("\u1ECC");
  expect(detector.normalizeVi("\u0055\u0323")).toEqual("\u1EE4");
  expect(detector.normalizeVi("\u0059\u0323")).toEqual("\u1EF4");
  expect(detector.normalizeVi("\u0061\u0323")).toEqual("\u1EA1");
  expect(detector.normalizeVi("\u0065\u0323")).toEqual("\u1EB9");
  expect(detector.normalizeVi("\u0069\u0323")).toEqual("\u1ECB");
  expect(detector.normalizeVi("\u006F\u0323")).toEqual("\u1ECD");
  expect(detector.normalizeVi("\u0075\u0323")).toEqual("\u1EE5");
  expect(detector.normalizeVi("\u0079\u0323")).toEqual("\u1EF5");
  expect(detector.normalizeVi("\u00C2\u0323")).toEqual("\u1EAC");
  expect(detector.normalizeVi("\u00CA\u0323")).toEqual("\u1EC6");
  expect(detector.normalizeVi("\u00D4\u0323")).toEqual("\u1ED8");
  expect(detector.normalizeVi("\u00E2\u0323")).toEqual("\u1EAD");
  expect(detector.normalizeVi("\u00EA\u0323")).toEqual("\u1EC7");
  expect(detector.normalizeVi("\u00F4\u0323")).toEqual("\u1ED9");
  expect(detector.normalizeVi("\u0102\u0323")).toEqual("\u1EB6");
  expect(detector.normalizeVi("\u0103\u0323")).toEqual("\u1EB7");
  expect(detector.normalizeVi("\u01A0\u0323")).toEqual("\u1EE2");
  expect(detector.normalizeVi("\u01A1\u0323")).toEqual("\u1EE3");
  expect(detector.normalizeVi("\u01AF\u0323")).toEqual("\u1EF0");
  expect(detector.normalizeVi("\u01B0\u0323")).toEqual("\u1EF1");
});

test("Detects German (de) language correctly, given 55 candidates", async () => {
  const lang = detectLanguage("Hallo, Welt, wie geht es Dir?", all);
  // TODO: fixme, sometimes chooses "it" with small text like "Hallo, Welt"; use dict score as well
  expect(lang).toEqual("de");
});

test("Detects English (en) language correctly, given 55 candidates", async () => {
  const lang = detectLanguage("Hello, World", all);
  expect(lang).toEqual("en");
});

test("Detects the Vietnamese (vi) language correctly, given 55 candiates", async () => {
  const lang = detectLanguage(
    `
Tiếng Việt là ngôn ngữ của người Việt Nam, là ngôn ngữ mẹ đẻ của khoảng 86 triệu người, 
là ngôn ngữ đơn âm, thuộc ngữ hệ Nam Á, dòng ngôn ngữ Môn-Khmer. Tiếng Việt có dấu thanh điệu, 
mỗi từ có thể mang một trong sáu thanh điệu khác nhau: ngang, huyền, sắc, nặng, hỏi, ngã.
như à, á, ã, ả, ạ, â, ấ, ầ, ẩ, ẫ, ậ. Ư
Một số ví dụ khác bao gồm: ê, ế, ề, ể, ễ, ệ, ô, ố, ồ, ổ, ỗ, ộ, ư, ứ, ừ, ử, ữ, ự.
`,
    all,
  );

  expect(lang).toEqual("vi");
});

const TRAINING_EN = "a a a b b c c d e";
const TRAINING_FR = "a b b c c c d d d";
const TRAINING_JA = "\u3042 \u3042 \u3042 \u3044 \u3046 \u3048 \u3048";
const JSON_LANG1 =
  '{"freq":{"A":3,"B":6,"C":3,"AB":2,"BC":1,"ABC":2,"BBC":1,"CBA":1},"n_words":[12,3,4],"name":"lang1"}';
const JSON_LANG2 =
  '{"freq":{"A":6,"B":3,"C":3,"AA":3,"AB":2,"ABC":1,"ABA":1,"CAA":1},"n_words":[12,5,3],"name":"lang2"}';

describe("Detector Tests", () => {
  let factory: DetectorFactory;

  beforeEach(() => {
    factory = createDetectorFactory([]);
    const profileEn: LangProfile = {
      name: "en",
      freq: {},
      n_words: [0, 0, 0],
    };
    TRAINING_EN.split(" ").forEach(
      // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
      (w) => (profileEn.freq[w] = (profileEn.freq[w] || 0) + 1),
    );
    profileEn.n_words = [TRAINING_EN.split(" ").length, 0, 0];
    addProfile(factory, profileEn, 0, 3);

    const profileFr: LangProfile = {
      name: "fr",
      freq: {},
      n_words: [0, 0, 0],
    };
    TRAINING_FR.split(" ").forEach(
      // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
      (w) => (profileFr.freq[w] = (profileFr.freq[w] || 0) + 1),
    );
    profileFr.n_words = [TRAINING_FR.split(" ").length, 0, 0];
    addProfile(factory, profileFr, 1, 3);

    const profileJa: LangProfile = {
      name: "ja",
      freq: {},
      n_words: [0, 0, 0],
    };
    TRAINING_JA.split(" ").forEach(
      // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
      (w) => (profileJa.freq[w] = (profileJa.freq[w] || 0) + 1),
    );
    profileJa.n_words = [TRAINING_JA.split(" ").length, 0, 0];
    addProfile(factory, profileJa, 2, 3);
  });

  test("Test detector1", () => {
    const detect = createDetector(factory);
    detect.append("a");
    expect(detect.detect()).toBe("en");
  });

  test("Test detector2", () => {
    const detect = createDetector(factory);
    detect.append("b d");
    expect(detect.detect()).toBe("fr");
  });

  test("Test detector3", () => {
    const detect = createDetector(factory);
    detect.append("d e");
    expect(detect.detect()).toBe("en");
  });

  test("Test detector4", () => {
    const detect = createDetector(factory);
    detect.append("\u3042\u3042\u3042\u3042a");
    expect(detect.detect()).toBe("ja");
  });

  test("Test lang list", () => {
    const langlist = factory.langList;
    expect(langlist.length).toBe(3);
    expect(langlist[0]).toBe("en");
    expect(langlist[1]).toBe("fr");
    expect(langlist[2]).toBe("ja");
  });

  test("Test factory from JSON string", () => {
    factory = createDetectorFactory([]);
    const profiles = [JSON_LANG1, JSON_LANG2];
    profiles.forEach((profileStr) => {
      const profile = JSON.parse(profileStr);
      addProfile(factory, profile, factory.langList.length, profiles.length);
    });
    const langlist = factory.langList;
    expect(langlist.length).toBe(2);
    expect(langlist[0]).toBe("lang1");
    expect(langlist[1]).toBe("lang2");
  });
});

// Mock LangProfile for testing purposes
const createLangProfile = (
  name: string,
  freq: Record<string, number>,
  n_words: Array<number>,
): LangProfile => ({
  name,
  freq,
  n_words,
});

describe("omitLessFreq", () => {
  it("should omit low-frequency n-grams", () => {
    const profile = createLangProfile("en", { a: 1, b: 3, c: 2 }, [6, 0, 0]);
    omitLessFreq(profile);

    expect(profile.freq.a).toBeUndefined(); // 'a' should be omitted
    expect(profile.freq.b).toBe(3); // 'b' should not be omitted
    expect(profile.freq.c).toBeUndefined(); // 'c' should be omitted
  });

  it("should not omit high-frequency n-grams", () => {
    const profile = createLangProfile(
      "en",
      { a: 10, b: 20, c: 30 },
      [60, 0, 0],
    );
    omitLessFreq(profile);

    expect(profile.freq.a).toBe(10); // 'a' should not be omitted
    expect(profile.freq.b).toBe(20); // 'b' should not be omitted
    expect(profile.freq.c).toBe(30); // 'c' should not be omitted
  });

  it("should omit Roman alphabet n-grams based on threshold", () => {
    const profile = createLangProfile(
      "en",
      { a: 1, b: 3, ab: 2, abc: 1 },
      [6, 2, 1],
    );
    omitLessFreq(profile);

    expect(profile.freq.a).toBeUndefined(); // 'a' should be omitted
    expect(profile.freq.b).toBe(3); // 'b' should not be omitted
    expect(profile.freq.ab).toBeUndefined(); // 'ab' should be omitted
    expect(profile.freq.abc).toBeUndefined(); // 'abc' should be omitted
  });
});

test("Can detect large corpus English (en) language correctly, given 55 candidates", async () => {
  const lang = detectLanguage(englishCorpusText, all);
  expect(lang).toEqual("en");
});

test("perf: Measure performance, 5 iterations, different text input sizes", async () => {
  const times: { [index: number]: number } = {};
  const iterations = 5;
  const dimensions = dimensionality.map((d) => d.dims);
  await perf(
    [
      {
        name: "Detect language",
        fn: async (dims: number, i: number) => {
          if (!times[dims]) {
            times[dims] = performance.now();
          }
          detectLanguage(
            dimensionality.filter((d) => d.dims === dims)[0].text,
            all,
          );

          if (i === iterations - 1 && times[dims] > 0) {
            times[dims] = performance.now() - times[dims];
          }
        },
      },
    ],
    dimensions, // sizes (dimensionality
    true, // warmup
    iterations, // iterations
    30000, // maxExecutionTime
    true, // auto-optimize chuck size
  );

  console.log(`# Results:
## Language detection
- Runs: ${iterations}
- Took:
${dimensions.map((d) => `  - ${times[d].toFixed()} ms for ${d} dimensions`).join(", \n")}\n`);
});
