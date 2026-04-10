Knuth-Morris-Pratt, usually shortened to **KMP**, is a classic string matching algorithm. Its goal is simple: find every position where a pattern appears inside a larger text. The clever part is that KMP avoids restarting from scratch after a mismatch.

## Why KMP matters

The straightforward substring search algorithm compares characters one by one. When a mismatch happens, it usually moves the pattern by one position and starts comparing again. That repeats work that we already know.

KMP solves this by building a helper array called the **LPS array**:

- `LPS[i]` means the length of the longest proper prefix of `pattern[0..i]`
- that prefix must also be a suffix of `pattern[0..i]`

With that table prepared, the algorithm can jump the pattern pointer to the next useful position instead of starting over.

## LPS, next, and nextval

If you read different textbooks or blog posts, you may notice that KMP is not always introduced with the same helper array.

- **LPS**
  This is the modern implementation style used in many codebases. It records a length: the longest proper prefix that is also a suffix.
- **classic `next`**
  This is common in older teaching material. Instead of emphasizing a length, it emphasizes where the pattern pointer should fall back after a mismatch.
- **`nextval`**
  This is an optimized version of the classic `next` idea. Its purpose is to avoid some fallback positions where the pattern would immediately compare the same character relationship again and gain nothing.

These are not three unrelated algorithms. They are three ways to describe the same KMP insight: **reuse the prefix information that is already known instead of restarting from the beginning**.

Historically, many earlier textbooks introduce KMP through the **classic `next` table** first.

That presentation is very direct:

- when a mismatch happens at pattern index `j`
- the table tells you where the pattern pointer should fall back next

So classic `next` can be seen as an earlier and more explicit fallback-table view of KMP, while `LPS` is the more common modern implementation view.

One important detail: different resources use different `next` conventions. On this page, the comparison section uses a common classic convention where:

- `next[0] = -1`

That keeps the terminology precise and makes the side-by-side comparison easier to follow.

## Why `nextval` was introduced

The classic `next` table already removes a lot of repeated work, but in some patterns it can still send the algorithm to a fallback position where the next comparison is immediately doomed to fail again.

This usually happens when:

- the pattern contains repeated character structure
- a fallback lands on a position whose pattern character is effectively going to recreate the same conflict

The idea behind **`nextval`** is to optimize that case.

Instead of stopping at the first legal fallback position, `nextval` may continue the fallback chain and skip positions that would only trigger another redundant comparison right away.

So `nextval` is best understood as:

- not a different algorithm
- but a refinement of the classic `next` table
- designed to reduce some fallback positions that are valid but not very informative

## How to read this page

This page has two linked visualizations:

1. **Prefix table construction**
   This panel shows how the `lps` array is built step by step for the current pattern.
2. **KMP matching**
   This panel shows how the text pointer `i` and pattern pointer `j` move during matching.

When a mismatch happens:

- if `j > 0`, KMP jumps `j` back to `lps[j - 1]`
- if `j === 0`, KMP simply advances in the text

That is the core reason KMP runs in linear time.

If you learned KMP from a classic `next` or `nextval` presentation, you can think of this page's main animation as the same fallback logic written in the `LPS` style that modern implementations often prefer.

In other words:

- the interactive area at the top is optimized for understanding the matching process
- the markdown explanation below is where the historical `next` / `nextval` perspective is explained more fully

## What to observe

Try a pattern with repeated structure such as `ababd` or `aaabaaa`.

- In the prefix table panel, watch how previously known prefix information is reused.
- In the matching panel, watch how mismatches trigger fallback instead of restarting from the beginning.

The step-by-step controls are especially useful when you want to understand *why* each jump happens.
