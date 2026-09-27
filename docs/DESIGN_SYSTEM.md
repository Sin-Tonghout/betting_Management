# Design System

## Colors
| Role | Hex |
|---|---|
| Primary Green | #16A34A |
| Secondary Orange | #F97316 |
| Accent Yellow | #EAB308 |
| Danger Red | #DC2626 |
| Info Teal | #0D9488 |

Light: bg `#F5F7F5`, surface `#FFFFFF`, text `#17211B`, muted `#66736B`, border `#DDE5DF`
Dark: bg `#101612`, surface `#18211B`/`#202B24`, text `#F4F7F5`, muted `#9AA79F`, border `#344139`

Meaning: green = win/profit/primary action, orange = secondary/highlight, yellow = pending/warning, red = loss/error/destructive, teal = info/secondary stats. Keep most surfaces neutral — color marks meaning, not decoration.

## Typography
Noto Sans Khmer, Noto Sans, system-ui, sans-serif
Display 40–48px · H1 32 · H2 28 · H3 24 · H4 20 · Body 16 · Small 14 · Caption 12
Weights: 400 normal, 500 medium, 600 semibold, 700 bold — used for hierarchy, not decoration.

## Spacing scale
4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 (px)
Card padding 24 · dashboard gap 20 · section spacing 32 · button padding 10/16 · input padding 12/14

## Radius
sm 8 · md 12 · lg 16 · xl 20 · pill 999
Cards 16 · buttons 10 · inputs 10 · badges 999

## Shadows
sm `0 2px 8px rgba(...)` · md `0 6px 20px rgba(...)` · lg `0 12px 32px rgba(...)` — soft, theme-aware.

## Core components (build once, reuse everywhere)
Button, Input, Select, Checkbox, Radio, Toggle, Badge, Alert, Toast, Modal, Dropdown, Tooltip, Tabs, Pagination, Breadcrumb, Card, Stat Card, Table, Data Table, Chart Container, Sidebar, Navbar, Footer, Empty State, Loading/Skeleton, Confirmation Dialog, Search, Filter Bar, Date Picker.

Each needs: normal, hover, focus, active, disabled, loading (where relevant), dark-theme, and mobile states.

## Sport accents
Football green · Basketball orange · Tennis yellow · Baseball red · Volleyball teal · Other gray — subtle, consistent.

## CSS variables (starting point)

```css
:root {
    --color-primary: #16A34A;
    --color-secondary: #F97316;
    --color-warning: #EAB308;
    --color-danger: #DC2626;
    --color-info: #0D9488;
    --bg-body: #F5F7F5;
    --bg-surface: #FFFFFF;
    --text-primary: #17211B;
    --text-muted: #66736B;
    --border-color: #DDE5DF;
    --radius-md: 12px;
    --space-4: 16px;
    --space-6: 24px;
}
```