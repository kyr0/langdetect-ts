<span align="center">

  # langdetect-ts

  ### Google langdetect for the web platform. Detects 55 languages of of the box. Minimum 1 sentence input for >90% accurracy.

</span>

> 🔬 Fast and precise, platform-independent language detection wasn't availabl for Workers and Browsers - now it is. (`langdetect` only works server-side). 

## ⚡ Simple and fast

## 📚 Usage

### 1. Install `langdetect-ts`:

`npm/yarn/bun install langdetect-ts`

### 2. Use it

```ts
import { detectLanguage, type LangProfile } from "langdetect-ts";
import allLanguages from "langdetect-ts/profiles/all.json";

// de out of 55 candidates
const detectDe = detectLanguage("Hallo, Welt, wie geht es Dir?", allLanguages)
console.log('Should be de:', detectDe)

// en out of 55 candidates
const detectEn = detectLanguage("Hello world! How are you?", allLanguages)
console.log('Should be en:', detectEn)
```

### 3. Optimized usage

Minimizing the ensemble of languages results in significantly faster results (`60x` faster for 2 language candidates instead of 55 candidates, `2ms per detection instead of 100ms`). It also leads to significantly smaller bundle sizes. Detecting languages using n-grams, as it happens in this library, requires datasets that reflect a languages patterns alongside their frequency probabilities. `55` profiles make up `1 MiB gzipped`, while `2` languages only account for `52 KiB gzipped`.

```ts
import { detectLanguage, type LangProfile } from "langdetect-ts";
import de from "langdetect-ts/profiles/de.json";
import en from "langdetect-ts/profiles/en.json";

// de out of 55 candidates
const detectDe = detectLanguage("Hallo, Welt, wie geht es Dir?", [de, en])
console.log('Should be de:', detectDe)

// en out of 55 candidates
const detectEn = detectLanguage("Hello world! How are you?", [de, en])
console.log('Should be en:', detectEn)
```