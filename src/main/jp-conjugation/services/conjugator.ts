const ui = {
  う: 'い',
  く: 'き',
  ぐ: 'ぎ',
  す: 'し',
  ず: 'じ',
  つ: 'ち',
  づ: 'ぢ',
  ぬ: 'に',
  ふ: 'ひ',
  ぶ: 'び',
  ぷ: 'ぴ',
  む: 'み',
  る: 'り',
};
const ua = {
  う: 'わ',
  く: 'か',
  ぐ: 'が',
  す: 'さ',
  ず: 'ざ',
  つ: 'た',
  づ: 'だ',
  ぬ: 'な',
  ふ: 'は',
  ぶ: 'ば',
  ぷ: 'ぱ',
  む: 'ま',
  る: 'ら',
};
const pastPlain = {
  す: 'した',
  く: 'いた',
  ぐ: 'いだ',
  む: 'んだ',
  ぶ: 'んだ',
  ぬ: 'んだ',
  う: 'った',
  る: 'った',
  つ: 'った',
};
const v5te = {
  す: 'して',
  く: 'いて',
  ぐ: 'いで',
  む: 'んで',
  ぶ: 'んで',
  ぬ: 'んで',
  う: 'って',
  る: 'って',
  つ: 'って',
};
const conjugation = {
  いく: {
    p: 'いきます',
    n: 'いかない',
    n_p: ['いきません', 'いかないです'],
    past: 'いった',
    past_p: 'いきました',
    past_n: 'いかなかった',
    past_n_p: ['いきませんでした', 'いかなかったです'],
    te: 'いって',
  },
  行く: {
    p: '行きます',
    n: '行かない',
    n_p: ['行きません', '行かないです'],
    past: '行った',
    past_p: '行きました',
    past_n: '行かなかった',
    past_n_p: ['行きませんでした', '行かなかったです'],
    te: '行って',
  },
  する: {
    p: 'します',
    n: 'しない',
    n_p: ['しません', 'しないです'],
    past: 'した',
    past_p: 'しました',
    past_n: 'しなかった',
    past_n_p: ['しませんでした', 'しなかったです'],
    te: 'して',
  },
  くる: {
    p: 'きます',
    n: 'こない',
    n_p: ['きません', 'こないです'],
    past: 'きた',
    past_p: 'きました',
    past_n: 'こなかった',
    past_n_p: ['きませんでした', 'こなかったです'],
    te: 'きて',
  },
  来る: {
    p: '来ます',
    n: '来ない',
    n_p: ['来ません', '来ないです'],
    past: '来た',
    past_p: '来ました',
    past_n: '来なかった',
    past_n_p: ['来ませんでした', '来なかったです'],
    te: '来て',
  },
  ある: {
    p: 'あります',
    n: 'ない',
    n_p: ['ありません', 'ないです'],
    past: 'あった',
    past_p: 'ありました',
    past_n: 'なかった',
    past_n_p: ['ありませんでした', 'なかったです'],
    te: 'あって',
  },
  とう: {
    p: 'といます',
    n: 'とわない',
    n_p: ['といません', 'とわないです'],
    past: 'といた',
    past_p: 'といました',
    past_n: 'とわなかった',
    past_n_p: ['といませんでした', 'とわなかったです'],
    te: 'とうて',
  },
  問う: {
    p: '問います',
    n: '問わない',
    n_p: ['問いません', '問わないです'],
    past: '問いた',
    past_p: '問いました',
    past_n: '問わなかった',
    past_n_p: ['問いませんでした', '問わなかったです'],
    te: '問うて',
  },
  // adjectives
  いい: {
    p: 'いいです',
    n: 'いくない',
    n_p: ['いくないです', 'いくありません'],
    past: 'いかった',
    past_p: 'いかったです',
    past_n: 'いくなかった',
    past_n_p: ['いくなかったです', 'いくありませんでした'],
    adverb: 'いく',
  },
  よい: {
    p: 'よいです',
    n: 'よくない',
    n_p: ['よくないです', 'よくありません'],
    past: 'よかった',
    past_p: 'よかったです',
    past_n: 'よくなかった',
    past_n_p: ['よくなかったです', 'よくありませんでした'],
    adverb: 'よく',
  },
  良い: {
    p: '良いです',
    n: '良くない',
    n_p: ['良くないです', '良くありません'],
    past: '良かった',
    past_p: '良かったです',
    past_n: '良くなかった',
    past_n_p: ['良くなかったです', '良くありませんでした'],
    adverb: '良く',
  },
};

function masuStem(word: string, type: string) {
  if (type === 'v5') return word.slice(0, -1) + ui[word.at(-1) as keyof typeof ui];
  return word.slice(0, -1);
}
function plainNegativeComplete(word: string, type: string) {
  if (type === 'v5') word.slice(0, -1) + ua[word.at(-1) as keyof typeof ua] + 'ない';
  return word.slice(0, -1) + 'ない';
}
function conjugateVerb(
  word: string,
  type: string,
  options: {
    negative?: boolean;
    polite?: boolean;
    past?: boolean;
    te?: boolean;
  },
) {
  if (options.te) {
    if (type === 'v1') return masuStem(word, type) + 'て';
    return word.slice(0, -1) + v5te[word.at(-1) as keyof typeof v5te];
  }

  if (options.past) {
    if (options.negative) {
      if (options.polite)
        return [masuStem(word, type) + 'ませんでした', plainNegativeComplete(word, type).slice(0, -1) + 'かったです'];
      return plainNegativeComplete(word, type).slice(0, -1) + 'かった';
    }
    if (options.polite) return masuStem(word, type) + 'ました';
    if (type === 'v1') return masuStem(word, type) + 'た';
    return word.slice(0, -1) + pastPlain[word.at(-1) as keyof typeof pastPlain];
  }

  if (options.negative) {
    if (options.polite) return [masuStem(word, type) + 'ません', plainNegativeComplete(word, type) + 'です'];
    return plainNegativeComplete(word, type);
  }
  if (options.polite) return masuStem(word, type) + 'ます';
  return word;
}
function conjugateIAdjective(
  word: string,
  options: {
    negative?: boolean;
    polite?: boolean;
    past?: boolean;
    adverb?: boolean;
  },
) {
  if (options.adverb) return word.slice(0, -1) + 'く';
  if (options.past) {
    if (options.negative) {
      if (options.polite) return [word.slice(0, -1) + 'くなかったです', word.slice(0, -1) + 'くありませんでした'];
      return word.slice(0, -1) + 'くなかった';
    }
    if (options.polite) return word.slice(0, -1) + 'かったです';
    return word.slice(0, -1) + 'かった';
  }
  if (options.negative) {
    if (options.polite) return [word.slice(0, -1) + 'くないです', word.slice(0, -1) + 'くありません'];
    return word.slice(0, -1) + 'くない';
  }
  if (options.polite) return word + 'です';
  return word;
}
function conjugateNaAdjective(
  word: string,
  options: {
    negative?: boolean;
    polite?: boolean;
    past?: boolean;
    adverb?: boolean;
  },
) {
  if (options.adverb) return word + 'に';
  if (options.past) {
    if (options.negative) {
      if (options.polite)
        return [
          word + 'じゃなかったです',
          word + 'ではなかったです',
          word + 'じゃありませんでした',
          word + 'ではありませんでした',
        ];
      return [word + 'じゃなかった', word + 'ではなかった'];
    }
    if (options.polite) return word + 'でした';
    return word + 'だった';
  }
  if (options.negative) {
    if (options.polite)
      return [word + 'じゃないです', word + 'ではないです', word + 'じゃりません', word + 'ではありません'];
    return [word + 'じゃない', word + 'ではない'];
  }
  if (options.polite) return word + 'です';
  return word + 'だ';
}
function conjugateIrregular(
  word: string,
  options: {
    negative?: boolean;
    polite?: boolean;
    past?: boolean;
    te?: boolean;
    adverb?: boolean;
  },
) {
  const found = Object.keys(conjugation).find((x) => word.endsWith(x)) as keyof typeof conjugation;
  const rules = conjugation[found];
  const suffix = word.slice(0, -found.length);
  const conjugated = rules[getConjugationKey(options) as keyof typeof rules];
  if (conjugated === undefined) return word;
  if (typeof conjugated === 'string') return suffix + conjugated;
  return conjugated.map((x) => suffix + x);
}
export type ConjugateOptions = {
  negative?: boolean;
  polite?: boolean;
  past?: boolean;
  te?: boolean;
  adverb?: boolean;
};
export function getConjugationKey(options: ConjugateOptions) {
  if (options.te) return 'te';
  if (options.adverb) return 'adverb';
  if (options.past) {
    if (options.negative) {
      if (options.polite) return 'past_n_p';
      return 'past_n';
    }
    if (options.polite) return 'past_p';
    return 'past';
  }
  if (options.negative) {
    if (options.polite) return 'n_p';
    return 'n';
  }
  if (options.polite) return 'p';
}
export function conjugate(word: string, type: string, options: ConjugateOptions) {
  switch (type) {
    case 'v1':
    case 'v5':
      return conjugateVerb(word, type, options);
    case 'irv':
  }
  if (type === 'irv' || type === 'ira') return conjugateIrregular(word, options);
  if (type === 'v1' || type === 'v5') return conjugateVerb(word, type, options);
  if (type === 'i') return conjugateIAdjective(word, options);
  if (type === 'na') return conjugateNaAdjective(word, options);
}
