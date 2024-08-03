import { detectLanguage, type LangProfile } from "../dist/index.mjs";
import allLanguages from "../dist/profiles/all.json";
import de from "../dist/profiles/de.json";
import en from "../dist/profiles/en.json";

console.log('e2e: 1/55 detection on sentences:')

// accuracy is > 90% mean with 55 langage candidates (all)
const before = performance.now();

// de out of 55 candidates
const detectDe = detectLanguage("Hallo, Welt, wie geht es Dir?", allLanguages as unknown as Array<LangProfile>)
console.log('Should be de:', detectDe)

// en out of 55 candidates
const detectEn = detectLanguage("Hello world! How are you?", allLanguages as unknown as Array<LangProfile>)
console.log('Should be en:', detectEn)

const now = performance.now();

console.log("Took:", (now - before).toFixed(2), 'ms');

// accuracy increases with less candidates in the selection, while runtime speed increases as well,
// with 2 to 11 candiates, accurracy approaches > 98%.

console.log('e2e: bi: 1/2 detection on sentences:')

// accuracy is > 90% mean with 55 langage candidates (all)
const beforeBi = performance.now();

// de out of 55 candidates
const detectDeBi = detectLanguage("Hallo, Welt, wie geht es Dir?", [de, en] as unknown as Array<LangProfile>)
console.log('bi: Should be de:', detectDeBi)

// en out of 55 candidates
const detectEnBi = detectLanguage("Hello world! How are you?", [de, en] as unknown as Array<LangProfile>)
console.log('bi: Should be en:', detectEnBi)

const nowBi = performance.now();

console.log("Took:", (nowBi - beforeBi).toFixed(2), 'ms');