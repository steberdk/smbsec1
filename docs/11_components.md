# 🧩 Component Inventory — smbsec1 (C1)

## Purpose
This file defines the small UI building blocks we reuse everywhere.
Agents must prefer reuse over creating new components.

## Baseline components (current/required)
- PageShell
  - max width container, title/subtitle area, consistent padding
- Card
  - bordered container for content blocks
- Button
  - variants: primary, secondary, danger, link
- ProgressBar
  - percent display (0–100)
- ChecklistItemCard
  - shows item title/why/how + 4 actions:
    - Done
    - Not sure
    - Skip
    - Reset

## Future components (planned)
- Toast / Notice
- ModalConfirm (for deletion flows)
- Table (team progress)
- Badge (status)

## Definition of Done for a new component
A new component must include:
- clear purpose
- props typed
- supports loading/disabled state if interactive
- documented in this file
