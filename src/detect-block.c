#include <math.h>
#include <stdlib.h>
#include <time.h>

#define ITERATION_LIMIT 1000
#define CONV_THRESHOLD 0.99999

void init_probability(float* prob, const float* priorMap, int langListLength) {
    if (priorMap) {
        for (int i = 0; i < langListLength; i++) {
            prob[i] = priorMap[i];
        }
    } else {
        float initVal = 1.0 / langListLength;
        for (int i = 0; i < langListLength; i++) {
            prob[i] = initVal;
        }
    }
}

void update_lang_prob(float* prob, const float* langProbMap, float alpha, int langListLength) {
    float weight = alpha / 10000.0;
    for (int i = 0; i < langListLength; i++) {
        prob[i] *= weight + langProbMap[i];
    }
}

float normalize_prob(float* prob, int langListLength) {
    float sum = 0;
    float maxp = 0;
    for (int i = 0; i < langListLength; i++) {
        sum += prob[i];
    }
    for (int i = 0; i < langListLength; i++) {
        prob[i] /= sum;
        if (prob[i] > maxp) {
            maxp = prob[i];
        }
    }
    return maxp;
}

void detectBlock(float* langProb, const float* ngrams, int ngramLength, int nTrial, float alpha, const float* priorMap, int langListLength, const float* wordLangProbMap) {
    float prob[langListLength];
    srand(time(NULL));
    for (int t = 0; t < nTrial; t++) {
        init_probability(prob, priorMap, langListLength);
        float trialAlpha = alpha + ((float)rand() / RAND_MAX) * 0.05;

        int i = 0;
        int converged = 0;
        while (!converged) {
            int randomIndex = rand() % ngramLength;
            const float* langProbMap = &wordLangProbMap[randomIndex * langListLength];
            update_lang_prob(prob, langProbMap, trialAlpha, langListLength);

            if (i % 5 == 0) {
                converged = normalize_prob(prob, langListLength) > CONV_THRESHOLD || i >= ITERATION_LIMIT;
            }
            i++;
        }

        for (int j = 0; j < langListLength; j++) {
            langProb[j] += prob[j] / nTrial;
        }
    }
}
