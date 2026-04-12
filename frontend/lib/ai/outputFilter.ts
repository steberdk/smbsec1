/**
 * F-012 / F-031 PI 15 Iter 1 — AI response output filter.
 *
 * Five heuristics applied to every assistant reply before it is returned
 * to the client. Two can REJECT the reply (422 + log), three can FLAG it
 * (log, include in response `flagged[]`, but still return to user).
 *
 *   1. Length cap        — reject  (>2000 chars)
 *   2. Jailbreak markers — reject  (known marker substrings)
 *   3. Code-block abuse  — reject  (>3 fences or one fence >500 chars)
 *   4. Topic drift       — flag    (none of the item title's words appear)
 *   5. PII echo          — flag    (email pattern in output)
 *
 * Flag accuracy is NOT gated by tests (per F-031 AC-7 rewrite in product
 * team consensus §"Refined ACs") — the wiring and flag log are what must
 * be correct. Do not overfit the marker list.
 */

// ---------------------------------------------------------------------------
// Tunables (edit the constants here to adjust without touching logic)
// ---------------------------------------------------------------------------

export const OUTPUT_MAX_CHARS = 2000;

/** Case-insensitive literal substrings that indicate a jailbreak leak. */
export const JAILBREAK_MARKERS: readonly string[] = [
  "DAN mode",
  "ignore previous instructions",
  "system prompt:",
  "[IDENTITY]",
  "[CAPABILITIES]",
  "[REFUSALS]",
  "[CONTEXT]",
  "as DAN",
  "developer mode",
  "jailbreak",
];

export const MAX_FENCED_BLOCKS = 3;
export const MAX_FENCE_CHARS = 500;

// ---------------------------------------------------------------------------
// Result shape
// ---------------------------------------------------------------------------

export type FilterFlag = {
  rule:
    | "length_cap"
    | "jailbreak_markers"
    | "code_block_abuse"
    | "topic_drift"
    | "pii_echo";
  reason: string;
  severity: "reject" | "flag";
};

export type OutputFilterResult =
  | { ok: true; flags: FilterFlag[] }
  | { ok: false; reject: FilterFlag; flags: FilterFlag[] };

// ---------------------------------------------------------------------------
// Individual heuristics
// ---------------------------------------------------------------------------

function checkLength(reply: string): FilterFlag | null {
  if (reply.length > OUTPUT_MAX_CHARS) {
    return {
      rule: "length_cap",
      reason: `reply length ${reply.length} > ${OUTPUT_MAX_CHARS}`,
      severity: "reject",
    };
  }
  return null;
}

function checkJailbreak(reply: string): FilterFlag | null {
  const lower = reply.toLowerCase();
  for (const marker of JAILBREAK_MARKERS) {
    if (lower.includes(marker.toLowerCase())) {
      return {
        rule: "jailbreak_markers",
        reason: `contains jailbreak marker: ${marker}`,
        severity: "reject",
      };
    }
  }
  return null;
}

function checkCodeBlocks(reply: string): FilterFlag | null {
  // Count triple-backtick fences. Each OPEN-fence counts as 1 block, so
  // 3 blocks needs 6 fence markers — but we approximate by counting all
  // fence occurrences and dividing.
  const fenceCount = (reply.match(/```/g) ?? []).length;
  const blockCount = Math.floor(fenceCount / 2);
  if (blockCount > MAX_FENCED_BLOCKS) {
    return {
      rule: "code_block_abuse",
      reason: `${blockCount} fenced code blocks > ${MAX_FENCED_BLOCKS}`,
      severity: "reject",
    };
  }
  // Any single fenced block >500 chars?
  const fenceRe = /```[\s\S]*?```/g;
  let match: RegExpExecArray | null;
  while ((match = fenceRe.exec(reply)) !== null) {
    if (match[0].length > MAX_FENCE_CHARS) {
      return {
        rule: "code_block_abuse",
        reason: `single fenced block ${match[0].length} chars > ${MAX_FENCE_CHARS}`,
        severity: "reject",
      };
    }
  }
  return null;
}

/** Extract lowercased word set from a string, excluding trivial stopwords. */
const STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "of",
  "for",
  "to",
  "in",
  "on",
  "is",
  "are",
  "with",
  "from",
  "your",
  "you",
  "do",
  "does",
  "have",
  "has",
  "at",
  "as",
  "be",
  "by",
  "it",
  "this",
  "that",
  "how",
  "can",
  "i",
  "my",
  "we",
  "our",
]);

function wordSet(input: string): Set<string> {
  const out = new Set<string>();
  const tokens = input.toLowerCase().match(/[a-z][a-z0-9]{2,}/g) ?? [];
  for (const tok of tokens) {
    if (!STOPWORDS.has(tok)) out.add(tok);
  }
  return out;
}

function checkTopicDrift(reply: string, itemTitle: string): FilterFlag | null {
  const titleWords = wordSet(itemTitle);
  if (titleWords.size === 0) return null; // can't judge drift without a title
  const replyWords = wordSet(reply);
  for (const tw of titleWords) {
    if (replyWords.has(tw)) return null;
  }
  return {
    rule: "topic_drift",
    reason: `reply contains none of item title words`,
    severity: "flag",
  };
}

function checkPiiEcho(reply: string): FilterFlag | null {
  // Simple email pattern; we don't try to be RFC 5321 exhaustive here.
  const emailRe = /[\w.+-]+@[\w-]+\.[\w.-]+/;
  if (emailRe.test(reply)) {
    return {
      rule: "pii_echo",
      reason: "reply contains an email address",
      severity: "flag",
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run all five heuristics against an assistant reply. Returns the first
 * REJECT encountered (short-circuiting further reject checks) alongside
 * any FLAGs that were also found during the pass.
 */
export function runOutputFilter(
  reply: string,
  itemTitle: string
): OutputFilterResult {
  const flags: FilterFlag[] = [];

  // Reject-level checks run first and short-circuit on the first hit so we
  // don't waste cycles scanning a hostile response further. We DO continue
  // collecting any flag-level hits that have already been seen so the
  // caller can log them alongside the reject.
  const rejectChecks = [checkLength, checkJailbreak, checkCodeBlocks];
  for (const check of rejectChecks) {
    const result = check(reply);
    if (result) {
      return { ok: false, reject: result, flags };
    }
  }

  // Flag-level checks — always run, never reject.
  const drift = checkTopicDrift(reply, itemTitle);
  if (drift) flags.push(drift);

  const pii = checkPiiEcho(reply);
  if (pii) flags.push(pii);

  return { ok: true, flags };
}
