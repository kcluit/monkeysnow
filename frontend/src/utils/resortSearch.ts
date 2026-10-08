/**
 * Search in the resort picker, forgiving about how a name is typed: accents,
 * punctuation and word order don't matter, and Mt., St. and Ste. find Mount,
 * Saint, Sankt and Sainte (and the other way round). Mont and Monte are left
 * alone: they are other languages' words, not abbreviations of Mount.
 */

// Letters that aren't a plain letter plus an accent, so removing accents leaves them as they are
const SPECIAL_LETTERS: Record<string, string> = {
    ø: 'o', ł: 'l', đ: 'd', ð: 'd', ı: 'i', ß: 'ss', æ: 'ae', œ: 'oe', þ: 'th',
};
const SPECIAL_LETTER = /[øłđðıßæœþ]/g;

// Words that stand for one another; each finds the others only as a whole word, so "st" still finds "Stowe" by itself
const SAME_WORDS = [['mount', 'mt'], ['saint', 'st', 'sankt'], ['sainte', 'ste']];
const OTHER_WORDS = new Map(SAME_WORDS.flatMap((words) => words.map((word) => [word, words.filter((w) => w !== word)])));

/**
 * Text as search compares it: lowercase, without accents, every run of
 * punctuation and spaces turned into one space, and a space at each end.
 */
export function normalizeForSearch(text: string): string {
    const plain = text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .normalize('NFC') // recombines what isn't a Latin accent, such as Japanese voicing marks
        .replace(SPECIAL_LETTER, (letter) => SPECIAL_LETTERS[letter]);
    return ` ${plain.replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ').trim()} `;
}

/** The words of what a visitor typed; empty when there is nothing to search for. */
export function toSearchWords(query: string): string[] {
    return normalizeForSearch(query).split(' ').filter(Boolean);
}

/** Whether every word appears in `text`, which must come from normalizeForSearch(). */
export function matchesSearchWords(text: string, words: string[]): boolean {
    return words.every((word) =>
        text.includes(word) || (OTHER_WORDS.get(word)?.some((other) => text.includes(` ${other} `)) ?? false)
    );
}
