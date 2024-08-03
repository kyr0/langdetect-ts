import ngramSymbols from "./profiles/ngrams.json";
import { unicodeBlocks } from "./unicode-blocks";

export type LangProbMap = Record<string, number[]>;
export type LangList = string[];
export type PriorMap = number[];

export interface Language {
  lang: string;
  prob: number;
}

export interface NGram {
  grams: string;
  capitalword: boolean;
}

export interface LangProfile {
  name: string;
  freq: Record<string, number>;
  n_words: number[];
}

export interface DetectorFactory {
  wordLangProbMap: LangProbMap;
  langList: LangList;
  seed: number | null;
}

export const defaultNGram: NGram = {
  grams: " ",
  capitalword: false,
};
export const MAX_TEXT_LENGTH = 10000;
const ALPHA_DEFAULT = 0.5;
const ALPHA_WIDTH = 0.05;
const ITERATION_LIMIT = 1000;
const PROB_THRESHOLD = 0.1;
const CONV_THRESHOLD = 0.99999;
const BASE_FREQ = 10000;
const UNKNOWN_LANG = "unknown";
const URL_RE = /https?:\/\/[-_.?&~;+=/#0-9A-Za-z]{1,2076}/g;
const MAIL_RE =
  /[-_.0-9A-Za-z]{1,64}@[-_0-9A-Za-z]{1,255}[-_.0-9A-Za-z]{1,255}/g;

export interface CjkMap {
  [ch: string]: string;
}

const CJK_MAP: CjkMap = {};

// pre-compute n-gram map
const initCjkNGramMap = (syms: Record<string, string[]>) => {
  const classes = Object.keys(syms);
  for (const className of classes) {
    const symbols = syms[className];
    const representative = symbols[0];

    for (let i = 0; i < symbols.length; i++) {
      CJK_MAP[symbols[i]] = representative;
    }
  }
};
initCjkNGramMap(ngramSymbols.NGram as unknown as Record<string, string[]>);

const validateLangProfile = ({
  name,
  freq,
  n_words,
}: LangProfile): LangProfile => ({
  name,
  freq,
  n_words: n_words.length ? n_words : Array(3).fill(0),
});

const omitLessFreq = (profile: LangProfile) => {
  if (!profile.name) return;

  const MINIMUM_FREQ = 2;
  const LESS_FREQ_RATIO = 100000;
  const ROMAN_CHAR_RE = /^[A-Za-z]$/;
  const ROMAN_SUBSTR_RE = /.*[A-Za-z].*/;
  const threshold = Math.max(
    Math.floor(profile.n_words[0] / LESS_FREQ_RATIO),
    MINIMUM_FREQ,
  );

  const freqEntries = Object.entries(profile.freq);
  let roman = 0;

  for (const [key, count] of freqEntries) {
    if (count <= threshold) {
      profile.n_words[key.length - 1] -= count;
      delete profile.freq[key];
    } else if (ROMAN_CHAR_RE.test(key)) {
      roman += count;
    }
  }

  if (roman < Math.floor(profile.n_words[0] / 3)) {
    for (const [key, count] of freqEntries) {
      if (ROMAN_SUBSTR_RE.test(key)) {
        profile.n_words[key.length - 1] -= count;
        delete profile.freq[key];
      }
    }
  }
};

const createDetector = (factory: DetectorFactory) => {
  let text = "";
  let langProb: Float32Array | null = null;
  let alpha = ALPHA_DEFAULT;
  const nTrial = 7;
  let maxTextLength = MAX_TEXT_LENGTH;
  let priorMap: PriorMap | null = null;

  const setAlpha = (a: number) => {
    alpha = a;
  };

  const setPriorMap = (map: Record<string, number>) => {
    priorMap = Array(factory.langList.length).fill(0);
    let sump = 0;
    factory.langList.forEach((lang, i) => {
      if (lang in map) {
        const p = map[lang];
        if (p < 0) {
          throw new Error("Prior probability must be non-negative.");
        }
        priorMap![i] = p;
        sump += p;
      }
    });
    if (sump <= 0) {
      throw new Error("More than one prior probability must be non-zero.");
    }
    priorMap = priorMap.map((p) => p / sump);
  };

  const setMaxTextLength = (max: number) => {
    maxTextLength = max;
  };

  const normalizeVi = (inputText: string): string => {
    const {
      TO_NORMALIZE_VI_CHARS,
      DMARK_CLASS,
      NORMALIZED_VI_CHARS_0300,
      NORMALIZED_VI_CHARS_0301,
      NORMALIZED_VI_CHARS_0303,
      NORMALIZED_VI_CHARS_0309,
      NORMALIZED_VI_CHARS_0323,
    } = ngramSymbols;

    const normalizedChars = [
      NORMALIZED_VI_CHARS_0300,
      NORMALIZED_VI_CHARS_0301,
      NORMALIZED_VI_CHARS_0303,
      NORMALIZED_VI_CHARS_0309,
      NORMALIZED_VI_CHARS_0323,
    ];

    const ALPHABET_WITH_DMARK = new RegExp(
      `([${TO_NORMALIZE_VI_CHARS}])([${DMARK_CLASS}])`,
      "g",
    );

    const toNormalizeViCharMap: Record<string, number> = {};
    for (let i = 0; i < TO_NORMALIZE_VI_CHARS.length; i++) {
      toNormalizeViCharMap[TO_NORMALIZE_VI_CHARS[i]] = i;
    }

    const dmarkClassMap: Record<string, number> = {};
    for (let i = 0; i < DMARK_CLASS.length; i++) {
      dmarkClassMap[DMARK_CLASS[i]] = i;
    }

    return inputText.replace(ALPHABET_WITH_DMARK, (match, p1, p2) => {
      const alphabetIndex = toNormalizeViCharMap[p1];
      const dmarkIndex = dmarkClassMap[p2];

      if (alphabetIndex !== undefined && dmarkIndex !== undefined) {
        return normalizedChars[dmarkIndex][alphabetIndex];
      }

      return match;
    });
  };

  const append = (inputText: string) => {
    inputText = inputText.replace(URL_RE, " ").replace(MAIL_RE, " ");
    inputText = normalizeVi(inputText);

    let pre = " ";
    let resultText = "";

    for (let i = 0; i < Math.min(inputText.length, maxTextLength); i++) {
      const ch = inputText[i];

      if (ch !== " " || pre !== " ") {
        resultText += ch;
      }
      pre = ch;
    }
    resultText = resultText.trim();
    text += resultText;
  };

  const getText = () => text;

  const detect = () => {
    const probabilities = getProbabilities();
    if (probabilities.length > 0) {
      return probabilities[0].lang;
    }
    return UNKNOWN_LANG;
  };

  const getProbabilities = () => {
    if (langProb === null) {
      detectBlock();
    }
    return sortProbability(langProb!);
  };

  const detectBlock = () => {
    const ngrams = extractNGrams();
    if (ngrams.length === 0) {
      throw new Error("No features in text.");
    }
    langProb = new Float32Array(factory.langList.length);
    const ngramLength = ngrams.length;
    const prob = new Float32Array(factory.langList.length);

    for (let t = 0; t < nTrial; t++) {
      if (priorMap) {
        for (let i = 0; i < priorMap.length; i++) {
          prob[i] = priorMap[i];
        }
      } else {
        const initVal = 1 / factory.langList.length;
        for (let i = 0; i < prob.length; i++) {
          prob[i] = initVal;
        }
      }
      const trialAlpha = alpha + Math.random() * ALPHA_WIDTH;

      let i = 0;
      let converged = false;

      while (!converged) {
        const ngram = ngrams[Math.floor(Math.random() * ngramLength)];

        if (!ngram || !(ngram in factory.wordLangProbMap)) {
        } else {
          const langProbMap = factory.wordLangProbMap[ngram];
          const weight = trialAlpha / BASE_FREQ;
          for (let i = 0; i < prob.length; i++) {
            prob[i] *= weight + langProbMap[i];
          }
        }

        if (i % 5 === 0) {
          let sum = 0;
          let maxp = 0;
          for (let i = 0; i < prob.length; i++) {
            sum += prob[i];
          }
          for (let i = 0; i < prob.length; i++) {
            prob[i] /= sum;
            if (prob[i] > maxp) {
              maxp = prob[i];
            }
          }
          converged = maxp > CONV_THRESHOLD || i >= ITERATION_LIMIT;
        }
        i++;
      }

      for (let j = 0; j < langProb.length; j++) {
        langProb[j] += prob[j] / nTrial;
      }
    }
  };

  const extractNGrams = () => {
    const RANGE = [1, 2, 3];
    const result: string[] = [];
    const ngram: NGram = { ...defaultNGram };
    const textLength = text.length;

    for (let i = 0; i < textLength; i++) {
      const ch = text[i];
      addChar(ngram, ch);
      if (ngram.capitalword) continue;

      for (const n of RANGE) {
        const w = getNGram(ngram, n);
        if (w && w !== " " && w in factory.wordLangProbMap) {
          result.push(w);
        }
      }
    }
    return result;
  };

  const sortProbability = (prob: Float32Array): Language[] => {
    return Array.from(prob)
      .map((p, i) => ({ lang: factory.langList[i], prob: p }))
      .filter((p) => p.prob > PROB_THRESHOLD)
      .sort((a, b) => b.prob - a.prob);
  };

  const addChar = (ngram: NGram, ch: string) => {
    ch = normalize(ch);

    const lastChar = ngram.grams.slice(-1);

    if (lastChar === " ") {
      ngram.grams = " ";
      ngram.capitalword = false;
      if (ch === " ") return;
    } else if (ngram.grams.length >= 3) {
      ngram.grams = ngram.grams.slice(1);
    }
    ngram.grams += ch;

    if (
      ch.toUpperCase() === ch &&
      lastChar.toUpperCase() === lastChar &&
      lastChar !== " " &&
      /[A-Z]/.test(ch) &&
      /[A-Z]/.test(lastChar)
    ) {
      ngram.capitalword = true;
    } else {
      ngram.capitalword = false;
    }
  };

  const getNGram = (ngram: NGram, n: number): string | undefined => {
    if (ngram.capitalword || n < 1 || n > 3 || ngram.grams.length < n)
      return undefined;
    if (n === 1) {
      const ch = ngram.grams.slice(-1);
      if (ch === " ") return undefined;
      return ch;
    }
    const result = ngram.grams.slice(-n);
    return result.trim() === "" ? undefined : result;
  };

  const unicodeBlock = (ch: string): string => {
    const code = ch.charCodeAt(0);
    for (const [name, start, end] of unicodeBlocks) {
      if (code >= start && code <= end) {
        return name;
      }
    }
    return "unknown";
  };

  const normalize = (ch: string): string => {
    switch (unicodeBlock(ch)) {
      case "Basic Latin":
        if (ch < "A" || ("Z" < ch && ch < "a") || "z" < ch) ch = " ";
        break;
      case "Latin-1 Supplement":
        if (ngramSymbols.NGram.LATIN1_EXCLUDE.includes(ch)) ch = " ";
        break;
      case "Latin Extended-B":
        if (ch === "\u0219") ch = "\u015f"; // Small S with comma below => with cedilla
        if (ch === "\u021b") ch = "\u0163"; // Small T with comma below => with cedilla
        break;
      case "General Punctuation":
        ch = " ";
        break;
      case "Arabic":
        if (ch === "\u06cc") ch = "\u064a"; // Farsi yeh => Arabic yeh
        break;
      case "Latin Extended Additional":
        if (ch >= "\u1ea0") ch = "\u1ec3";
        break;
      case "Hiragana":
        ch = "\u3042";
        break;
      case "Katakana":
        ch = "\u30a2";
        break;
      case "Bopomofo":
      case "Bopomofo Extended":
        ch = "\u3105";
        break;
      case "CJK Unified Ideographs":
        ch = CJK_MAP[ch] || ch;
        break;
      case "Hangul Syllables":
        ch = "\uac00";
        break;
    }
    return ch;
  };

  return {
    normalize,
    append,
    detect,
    setMaxTextLength,
    setAlpha,
    setPriorMap,
    getNGram,
    addChar,
    normalizeVi,
    getText,
  };
};

const createDetectorFactory = (
  profileOrProfiles: LangProfile | LangProfile[],
) => {
  const profiles = Array.isArray(profileOrProfiles)
    ? profileOrProfiles
    : [profileOrProfiles];

  const factory: DetectorFactory = {
    wordLangProbMap: {},
    langList: [],
    seed: null,
  };

  if (profiles.length === 0) {
    console.warn("No language profiles provided.");
  }

  profiles.forEach((profile, index) => {
    profile = validateLangProfile(profile);
    addProfile(factory, profile, index, profiles.length);
  });
  return factory;
};

const addProfile = (
  factory: DetectorFactory,
  profile: LangProfile,
  index: number,
  langSize: number,
) => {
  const { name, freq, n_words } = profile;

  if (factory.langList.includes(name)) {
    throw new Error("Duplicate language profile.");
  }
  factory.langList.push(name);

  const wordLangProbMap = factory.wordLangProbMap;

  for (const word in freq) {
    if (!wordLangProbMap[word]) {
      wordLangProbMap[word] = new Array(langSize).fill(0);
    }
    const length = word.length;
    if (1 <= length && length <= 3) {
      wordLangProbMap[word][index] = freq[word] / n_words[length - 1];
    }
  }

  omitLessFreq(profile);
};

const detectLanguage = (
  text: string,
  profileOrProfiles: LangProfile | LangProfile[],
) => {
  const factory = createDetectorFactory(profileOrProfiles);
  const detector = createDetector(factory);
  detector.append(text);
  return detector.detect();
};

export {
  detectLanguage,
  createDetectorFactory,
  createDetector,
  addProfile,
  omitLessFreq,
};
