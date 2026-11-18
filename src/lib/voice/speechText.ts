// What to read aloud from a Markdown reply: plain sentences, without the code
// blocks and tables, which stay on screen (the tutor is asked to introduce them
// in words).

/** Pieces longer than this are split at commas: some voices stop partway through long ones. */
const MAX_PIECE = 180;

const FENCE = /^\s*(```|~~~)/;
const TABLE_ROW = /^\s*\|/;
const RULE = /^\s*([-*_])(\s*\1){2,}\s*$/;

/**
 * The text to say, one sentence or short phrase per piece. As a reply streams in,
 * pieces are only added at the end, except that the last one may still be growing.
 */
export function toSpeechPieces(markdown: string): string[] {
  const pieces: string[] = [];
  let inCode = false;
  for (const line of markdown.split("\n")) {
    if (FENCE.test(line)) {
      inCode = !inCode;
      continue;
    }
    if (inCode || TABLE_ROW.test(line) || RULE.test(line)) continue;
    const text = plainText(line);
    if (text) pieces.push(...sentences(text));
  }
  return pieces;
}

/** One line of Markdown as words a voice can say. */
function plainText(line: string): string {
  return line
    .replace(/^\s{0,3}#{1,6}\s+/, "") // heading
    .replace(/^\s*>\s?/, "") // quote
    .replace(/^\s*(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?/, "") // list item, task box
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // image
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // link: keep its words
    .replace(/<[^>]+>/g, "") // HTML tag
    .replace(/https?:\/\/\S+/g, "this link")
    .replace(/[*~`\\]/g, "") // emphasis, inline code, escapes
    .replace(/_/g, " ") // _emphasis_ and snake_case read as words
    .replace(/\p{Extended_Pictographic}️?/gu, "") // emoji would be read out by name
    .replace(/\s+/g, " ")
    .trim();
}

/** A question as it's read aloud: any lead-in (such as feedback), the question, then its options as "Option A: …". */
export function spokenQuestion(question: string, options: string[], lead = ""): string {
  const lettered = options.map((option, i) => `Option ${String.fromCharCode(65 + i)}: ${option}`);
  return [lead, question, ...lettered].filter(Boolean).join("\n\n");
}

/** A sentence end: . ! or ? then a space, but not after abbreviations such as "e.g.". */
const SENTENCE_END = /(?<=[.!?])(?<!\b(?:e\.g|i\.e|vs|Mr|Mrs|Ms|Dr)\.)\s+(?=\S)/;

function sentences(text: string): string[] {
  return text.split(SENTENCE_END).flatMap(shortPieces);
}

/** Splits a long sentence at commas, semicolons and colons into pieces of at most MAX_PIECE characters where possible. */
function shortPieces(sentence: string): string[] {
  if (sentence.length <= MAX_PIECE) return [sentence];
  const pieces: string[] = [];
  let piece = "";
  for (const clause of sentence.split(/(?<=[,;:])\s+/)) {
    if (piece && piece.length + clause.length + 1 > MAX_PIECE) {
      pieces.push(piece);
      piece = clause;
    } else {
      piece = piece ? `${piece} ${clause}` : clause;
    }
  }
  if (piece) pieces.push(piece);
  return pieces;
}
