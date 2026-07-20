"""Reference solution: global pairwise alignment (Needleman-Wunsch).

Instructor material. Excluded from the rendered site via `project.render`
in _quarto.yml, but note that it IS in the repository -- see instructor/README.md
for what that means for repository visibility.
"""

from __future__ import annotations

MATCH = 1
MISMATCH = -1
GAP = -2


def score(a: str, b: str) -> int:
    """Substitution score for aligning residue `a` against residue `b`."""
    return MATCH if a == b else MISMATCH


def align(seq1: str, seq2: str) -> tuple[str, str, int]:
    """Globally align two sequences.

    Returns the two gapped sequences and the alignment score. Where several
    alignments are optimal, one is returned -- traceback ties are broken
    diagonal-first, which is arbitrary but deterministic.
    """
    n, m = len(seq1), len(seq2)

    # F[i][j] = best score aligning seq1[:i] against seq2[:j].
    f = [[0] * (m + 1) for _ in range(n + 1)]

    # Global alignment: a prefix aligned against nothing is a run of gaps.
    for i in range(1, n + 1):
        f[i][0] = i * GAP
    for j in range(1, m + 1):
        f[0][j] = j * GAP

    for i in range(1, n + 1):
        for j in range(1, m + 1):
            f[i][j] = max(
                f[i - 1][j - 1] + score(seq1[i - 1], seq2[j - 1]),
                f[i - 1][j] + GAP,
                f[i][j - 1] + GAP,
            )

    aligned1: list[str] = []
    aligned2: list[str] = []
    i, j = n, m

    while i > 0 or j > 0:
        if i > 0 and j > 0 and f[i][j] == f[i - 1][j - 1] + score(seq1[i - 1], seq2[j - 1]):
            aligned1.append(seq1[i - 1])
            aligned2.append(seq2[j - 1])
            i, j = i - 1, j - 1
        elif i > 0 and f[i][j] == f[i - 1][j] + GAP:
            aligned1.append(seq1[i - 1])
            aligned2.append("-")
            i -= 1
        else:
            aligned1.append("-")
            aligned2.append(seq2[j - 1])
            j -= 1

    return "".join(reversed(aligned1)), "".join(reversed(aligned2)), f[n][m]
