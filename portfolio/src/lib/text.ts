/** "A" or "An", depending on the word that follows. */
export function article(word: string) {
  return /^[aeiou]/i.test(word.trim()) ? "An" : "A";
}
