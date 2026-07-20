"""Practical 01: global pairwise alignment (Needleman-Wunsch).

Fill in the two functions below. Run `pytest test_alignment.py` in this
directory to check your work -- the tests are the specification.
"""

from __future__ import annotations

MATCH = 1
MISMATCH = -1
GAP = -2


def score(a: str, b: str) -> int:
    """Return the substitution score for aligning residue `a` against `b`.

    Use the MATCH and MISMATCH constants above.
    """
    raise NotImplementedError("TODO: exercise 1")


def align(seq1: str, seq2: str) -> tuple[str, str, int]:
    """Globally align two sequences.

    Return the two gapped sequences and the alignment score, e.g.

        >>> align("GATTACA", "GCATGCU")
        ('G-ATTACA', 'GCATG-CU', -3)

    Suggested steps:
      1. Build an (n+1) x (m+1) matrix F.
      2. Initialise row 0 and column 0 with cumulative gap penalties.
         Ask yourself why global alignment requires this and local does not.
      3. Fill F with the recurrence from the lecture.
      4. Trace back from F[n][m] to build the gapped strings.
    """
    raise NotImplementedError("TODO: exercise 2")
