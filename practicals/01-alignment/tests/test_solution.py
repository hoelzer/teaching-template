"""CI check: the reference solution must actually be correct.

This is the guard against the classic failure mode -- "it worked last
semester". It runs on every push, so a solution broken by a dependency
update surfaces immediately rather than during the lab session.

It also cross-checks the hand-written implementation against Biopython, so
a change in either is caught.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent / "solution"))

from alignment import GAP, MATCH, MISMATCH, align, score  # noqa: E402

DATA = Path(__file__).parent.parent / "data" / "sequences.fasta"


def test_score_function():
    assert score("A", "A") == MATCH
    assert score("A", "T") == MISMATCH


def test_identical_sequences():
    a1, a2, s = align("ACGT", "ACGT")
    assert (a1, a2, s) == ("ACGT", "ACGT", 4 * MATCH)


def test_alignment_rows_have_equal_length():
    a1, a2, _ = align("GATTACA", "GCATGCU")
    assert len(a1) == len(a2)


def test_empty_sequence():
    a1, a2, s = align("ACGT", "")
    assert (a1, a2, s) == ("ACGT", "----", 4 * GAP)


def test_data_file_is_present_and_parses():
    """Relative paths in the practical must resolve, not just on my laptop."""
    pytest.importorskip("Bio")
    from Bio import SeqIO

    records = list(SeqIO.parse(DATA, "fasta"))
    assert len(records) == 2, "expected exactly two sequences in the data file"


def test_matches_biopython():
    """Our score must agree with an independent implementation."""
    pytest.importorskip("Bio")
    from Bio import Align

    aligner = Align.PairwiseAligner()
    aligner.mode = "global"
    aligner.match_score = MATCH
    aligner.mismatch_score = MISMATCH
    aligner.open_gap_score = GAP
    aligner.extend_gap_score = GAP

    seq1, seq2 = "GATTACA", "GCATGCU"
    _, _, ours = align(seq1, seq2)
    theirs = aligner.score(seq1, seq2)

    assert ours == theirs
