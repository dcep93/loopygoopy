# Block selection and label simplification

Remove the range-summary line, click/drag hint, and Ready to practice/Practicing
status labels. Keep beat counts and lead/buffering/seeking statuses.

Clicking the immediately preceding or following four-beat block extends the
current contiguous range. Clicking a selected end block removes that block,
unless it is the only selected block, in which case nothing changes. The user
clarified that clicking a selected interior block isolates that block. Clicking
a nonadjacent unselected block also selects it alone. Dragging still replaces
the selection with the dragged range; keyboard activation follows click rules,
and Shift-arrow continues to extend a range.

Manual controls remain untouched. They are the legacy popup editor embedded
below the normal YouTube video after practice exits; this request asks only for
an explanation, not repair.

Verify adjacent extension in both directions, trimming either edge, interior
isolation, single-block no-op, distant selection, and pointer/keyboard parity.
Build and visually inspect the shortened controls, then commit and push.
