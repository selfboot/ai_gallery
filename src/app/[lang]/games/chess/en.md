## Play Chinese Chess Online

Chinese Chess (Xiangqi) is a classic two-player strategy board game. Players move in turns with the goal of checkmating the opponent's general. This page supports both local PvP and AI mode, with undo, restart, and move history.

## Rules Implemented

This page implements core Xiangqi rules, including:

- Rook moves in straight lines without jumping pieces;
- Horse follows the L-shape and can be blocked by the horse-leg rule;
- Elephant moves two points diagonally, cannot cross the river, and can be blocked by the elephant-eye rule;
- Advisor moves one point diagonally inside the palace;
- General moves one point orthogonally inside the palace, with facing-generals rule supported;
- Cannon captures only with exactly one screen piece in between;
- Pawn moves forward before crossing the river and can move sideways after crossing;
- Illegal self-check moves are blocked;
- Check, checkmate, and stalemate are detected.

## AI Mode (3 Levels)

After switching to "Play vs AI" in settings, you can choose your side and AI rank:

1. novice: shallow search
2. expert: medium search
3. master: stronger search

## Page Features

1. Selected piece highlight, legal move hints, and last-move markers;
2. Captured pieces and move history panel;
3. Undo and restart controls;
4. Bilingual UI and documentation (Chinese/English).
