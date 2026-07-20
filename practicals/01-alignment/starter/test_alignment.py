"""Tests for practical 01. These are the specification -- make them pass.

Run from inside the starter/ directory:

    pytest test_alignment.py -v
"""

from alignment import GAP, MATCH, MISMATCH, align, score


def test_score_match():
    assert score("A", "A") == MATCH


def test_score_mismatch():
    assert score("A", "T") == MISMATCH


def test_identical_sequences_align_without_gaps():
    a1, a2, s = align("ACGT", "ACGT")
    assert a1 == "ACGT"
    assert a2 == "ACGT"
    assert s == 4 * MATCH


def test_alignment_length_is_equal():
    a1, a2, _ = align("GATTACA", "GCATGCU")
    assert len(a1) == len(a2)


def test_gap_is_inserted_for_deletion():
    a1, a2, s = align("ACGT", "AGT")
    assert "-" in a2
    assert a1 == "ACGT"
    assert s == 3 * MATCH + GAP


def test_empty_sequence_is_all_gaps():
    a1, a2, s = align("ACGT", "")
    assert a1 == "ACGT"
    assert a2 == "----"
    assert s == 4 * GAP
