# Style Guide — CareerMap Solutions EMS

## Brand Identity
- **Company**: CareerMap Solutions (CMS)
- **Product**: HR & Payroll Management System
- **Tone**: Professional, clean, corporate, trustworthy

---

## Color Palette

### Primary
| Name | Hex | Usage |
|---|---|---|
| Primary Blue | `#2563EB` | Buttons, links, active states, sidebar highlights |
| Primary Dark | `#1E40AF` | Hover states, headings |
| Primary Light | `#DBEAFE` | Backgrounds, badges, chips |

### Neutrals
| Name | Hex | Usage |
|---|---|---|
| White | `#FFFFFF` | Card backgrounds, main content area |
| Gray 50 | `#F8FAFC` | Page background |
| Gray 100 | `#F1F5F9` | Table row hover, input backgrounds |
| Gray 200 | `#E2E8F0` | Borders, dividers |
| Gray 400 | `#94A3B8` | Placeholder text, disabled states |
| Gray 600 | `#475569` | Secondary text, labels |
| Gray 900 | `#0F172A` | Primary text, headings |

### Status Colors
| Name | Hex | Usage |
|---|---|---|
| Success Green | `#16A34A` | Active, approved, present |
| Success Light | `#DCFCE7` | Success badge backgrounds |
| Warning Amber | `#D97706` | Pending, on-leave |
| Warning Light | `#FEF3C7` | Warning badge backgrounds |
| Danger Red | `#DC2626` | Rejected, absent, errors |
| Danger Light | `#FEE2E2` | Error badge backgrounds |

---

## Typography

- **Font Family**: `Inter` (load from Google Fonts)
- **Base size**: `14px` / `text-sm`

| Style | Class | Usage |
|---|---|---|
| Page Title | `text-2xl font-bold text-gray-900` | Page headings |
| Section Title | `text-lg font-semibold text-gray-900` | Card/section headings |
| Label | `text-sm font-medium text-gray-600` | Form labels, table headers |
| Body | `text-sm text-gray-700` | General content |
| Caption | `text-xs text-gray-400` | Helper text, timestamps |

---

## Layout

### Page Structure
```
┌─────────────────────────────────────────┐
│  Sidebar (240px fixed)  │  Main Content  │
│                         │                │
│  - Logo                 │  - Top bar     │
│  - Nav links            │  - Page title  │
│  - User profile         │  - Content     │
└─────────────────────────────────────────┘
```

### Sidebar
- Width: `240px` fixed
- Background: `#1E40AF` (dark blue) or `#0F172A` (dark slate)
- Active link: white text + `#2563EB` left border indicator
- Logo at top, user info at bottom

### Top Bar
- Height: `64px`
- Background: `#FFFFFF`
- Border bottom: `border-b border-gray-200`
- Contains: page title (left), notifications + user avatar (right)

### Content Area
- Background: `#F8FAFC`
- Padding: `p-6`
- Max width: full width minus sidebar

---

## Components

### Cards
```
bg-white rounded-xl shadow-sm border border-gray-200 p-6
```

### Stat Cards (Dashboard)
```
bg-white rounded-xl p-6 flex items-center gap-4
- Icon container: rounded-lg p-3 (colored background)
- Value: text-2xl font-bold text-gray-900
- Label: text-sm text-gray-500
```

### Buttons

| Variant | Classes |
|---|---|
| Primary | `bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium` |
| Secondary | `bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium` |
| Danger | `bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium` |
| Ghost | `text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg text-sm font-medium` |

### Form Inputs
```
w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
placeholder:text-gray-400
```

### Tables
```
- Container: bg-white rounded-xl border border-gray-200 overflow-hidden
- Header: bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider
- Row: border-b border-gray-100 hover:bg-gray-50
- Cell: px-6 py-4 text-sm text-gray-700
```

### Badges / Status Pills
```
- Base: inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
- Active/Present: bg-green-100 text-green-700
- Pending: bg-amber-100 text-amber-700
- Rejected/Absent: bg-red-100 text-red-700
- Info: bg-blue-100 text-blue-700
```

### Modals
```
- Overlay: fixed inset-0 bg-black/50 z-50
- Container: bg-white rounded-2xl shadow-xl p-6 max-w-lg w-full mx-auto mt-20
- Header: text-lg font-semibold + close button top-right
```

---

## Spacing System
Use Tailwind's default spacing. Key values:
- Card padding: `p-6`
- Section gap: `gap-6`
- Form field gap: `gap-4`
- Inline elements: `gap-2` or `gap-3`

---

## Icons
Use **Lucide React** (`lucide-react`) for all icons.
- Size default: `w-5 h-5`
- Sidebar icons: `w-5 h-5`
- Stat card icons: `w-6 h-6`

---

## Responsive Breakpoints
- Mobile first with Tailwind
- Sidebar collapses on mobile (`md:block hidden`)
- Tables scroll horizontally on small screens (`overflow-x-auto`)
- Cards stack vertically on mobile (`grid-cols-1 md:grid-cols-2 lg:grid-cols-4`)

---

## Design Principles
1. **Whitespace** — generous padding, don't crowd elements
2. **Hierarchy** — clear visual weight from headings → labels → body
3. **Consistency** — same border radius, same shadow across all cards
4. **Feedback** — every button/action has hover + focus states
5. **Accessibility** — sufficient color contrast, focus rings on inputs
