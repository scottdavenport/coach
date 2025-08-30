Dark Mode Design System (Cursor‑Ready)

Purpose: A single source of truth to get Cursor building a beautiful, modern, dark UI inspired by neon‑accented SaaS dashboards, finance/crypto, and bento components.

Tech: Next.js + Tailwind + shadcn/ui + lucide-react + Recharts.

⸻

1) Visual Direction
	•	Mood: sleek, cinematic dark with soft glass, thin dividers, and neon accents.
	•	Surfaces: layered blacks (not pure #000), subtle gradients, frosted panels.
	•	Accents: electric cyan + orchid/magenta; limited use for focus/CTAs.
	•	Shapes: 12–16px radius, extra‑round chips/pills, 2xl cards.
	•	Depth: blurred backdrops, low‑noise textures, soft glow on key elements.
	•	Motion: micro‑interactions (150–220ms), easing cubic-bezier(0.2, 0.8, 0.2, 1).

Design keywords: neo‑noir • fintech • bento • glassmorphism (subtle) • grid‑first

⸻

2) Design Tokens

2.1 Color (HSL)

Semantic tokens first. All components reference these, not raw values.

:root[data-theme="dark"] {
  /* Base surfaces */
  --bg:               240 10% 6%;   /* page */
  --panel:            240 12% 8%;   /* app shell */
  --card:             240 12% 10%;  /* cards */
  --card-2:           240 12% 13%;  /* raised cards */
  --overlay:          240 14% 4% / 0.6;  /* modal scrim */

  /* Text */
  --text:             210 12% 94%;  /* primary */
  --muted:            215 10% 65%;  /* secondary */
  --subtle:           215 8% 45%;   /* tertiary */

  /* Brand + accents */
  --primary:          188 94% 49%;  /* electric cyan */
  --primary-weak:     188 94% 49% / 0.18;
  --secondary:        295 88% 60%;  /* orchid */
  --secondary-weak:   295 88% 60% / 0.18;
  --accent:           155 80% 54%;  /* lime‑mint */

  /* State */
  --success:          150 70% 45%;
  --warning:          40 100% 55%;
  --destructive:      0 80% 58%;
  --info:             200 95% 62%;

  /* Borders/lines */
  --line:             220 8% 22%;
  --line-strong:      220 8% 28%;
  --ring:             var(--primary);

  /* Effects */
  --glow-cyan:        188 94% 49% / 0.35;
  --glow-magenta:     295 88% 60% / 0.35;
  --glass:            240 16% 10% / 0.65; /* for bg‑blur */
}

2.2 Typography

:root {
  --font-sans: ui-sans-serif, Inter, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji";
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

Scale (rem): 12 / 14 / 16 / 18 / 20 / 24 / 30 / 36
	•	Display: 36 / 30
	•	H1: 24
	•	H2: 20
	•	H3: 18
	•	Body: 16 (tight line-height 1.5)
	•	Meta: 14, Micro: 12

Weights: 400/500/600; tight letter‑spacing for headings (−0.01em).

2.3 Spacing & Radii
	•	Spacing scale: 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64
	•	Radii: sm 8px, md 12px, lg 16px, xl 20px, 2xl 24px, pill 9999px

2.4 Shadows & Blur

:root[data-theme="dark"] {
  --shadow-1: 0 1px 0 hsl(0 0% 100% / 0.03), 0 8px 24px hsl(240 60% 3% / 0.6);
  --shadow-2: 0 1px 0 hsl(0 0% 100% / 0.04), 0 16px 40px hsl(240 60% 3% / 0.65);
  --blur-1: 8px; /* chips, pills */
  --blur-2: 16px; /* cards */
}

2.5 Transitions & Easing
	•	Duration: 120ms (micro), 180ms (hover), 220ms (press), 320ms (panel)
	•	Easing: cubic-bezier(0.2, 0.8, 0.2, 1)

⸻

3) Tailwind & shadcn Setup

3.1 Tailwind config (extend)

// tailwind.config.ts (excerpt)
export default {
  darkMode: ["class", "[data-theme='dark']"],
  theme: {
    extend: {
      colors: {
        bg: "hsl(var(--bg))",
        panel: "hsl(var(--panel))",
        card: "hsl(var(--card))",
        card2: "hsl(var(--card-2))",
        text: "hsl(var(--text))",
        muted: "hsl(var(--muted))",
        subtle: "hsl(var(--subtle))",
        primary: "hsl(var(--primary))",
        secondary: "hsl(var(--secondary))",
        accent: "hsl(var(--accent))",
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        destructive: "hsl(var(--destructive))",
        info: "hsl(var(--info))",
        line: "hsl(var(--line))",
      },
      borderRadius: {
        lg: "16px",
        xl: "20px",
        '2xl': "24px",
      },
      boxShadow: {
        glow: "0 0 0 2px hsl(var(--ring) / 0.3), 0 0 30px hsl(var(--ring) / 0.35)",
        card: "var(--shadow-1)",
        card2: "var(--shadow-2)",
      },
      backdropBlur: {
        xs: '8px',
        sm: '12px',
        md: '16px',
      },
      backgroundImage: {
        'grid-faint': "radial-gradient(hsl(0 0% 100%/0.06) 1px, transparent 1px)",
        'radial-soft': "radial-gradient(80% 80% at 50% 0%, hsl(var(--primary)/0.08) 0%, transparent 60%)",
        'diagonal-sheen': "linear-gradient(120deg, transparent 0%, hsl(var(--secondary)/0.08) 50%, transparent 100%)",
      },
    },
  },
  plugins: [],
}

3.2 Global CSS (apply tokens)

/* globals.css */
:root { color-scheme: dark; }
html,[data-theme='dark'] body { background: hsl(var(--bg)); color: hsl(var(--text)); }

/* Thin separators */
.hr, .divider { border-top: 1px solid hsl(var(--line)); }

/* Focus ring */
*:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px hsl(var(--ring) / 0.5), 0 0 0 6px hsl(var(--ring) / 0.15);
  border-radius: 10px;
}


⸻

4) Component Blueprints

Use shadcn primitives; apply classes below.

4.1 App Shell
	•	Topbar: 56–64px height, glass (bg-card/60 backdrop-blur-md), thin bottom divider.
	•	Sidebar: 280px, bg-panel, inset border ring-1 ring-line, nav groups with subtle headers.
	•	Content: max‑width 1600px, 24–32px padding, grid‑based.

// AppShell.tsx (layout idea)
<div className="min-h-dvh bg-[radial-gradient(80%_60%_at_50%_0%,hsl(var(--primary)/0.06),transparent_60%)]">
  <header className="sticky top-0 z-40 h-14 bg-card/60 backdrop-blur-md border-b border-line">
    {/* left: logo; center: search; right: user */}
  </header>
  <div className="flex">
    <aside className="hidden md:block w-72 border-r border-line bg-panel">
      {/* nav groups */}
    </aside>
    <main className="flex-1 p-6 md:p-8 space-y-6">
      {/* pages */}
    </main>
  </div>
</div>

4.2 Card

<div className="bg-card border border-line/80 rounded-2xl shadow-card">
  <div className="p-5 md:p-6">
    {/* content */}
  </div>
</div>

	•	Raised: add bg-card/70 backdrop-blur-md shadow-card2.
	•	Glowing CTA: wrap with ring-1 ring-primary/30 shadow-glow (sparingly).

4.3 Buttons
	•	Sizes: sm (28/10), md (36/12), lg (44/14)
	•	Variants:
	•	Solid/Brand: bg-primary text-black hover:brightness-110 active:brightness-95
	•	Soft: bg-primary/15 text-primary hover:bg-primary/25
	•	Ghost: hover:bg-card2/60 text-text
	•	Destructive: bg-destructive text-white hover:brightness-110

<button className="inline-flex items-center gap-2 rounded-xl px-4 h-10 font-medium transition-[transform,filter] duration-200 hover:-translate-y-0.5 active:translate-y-0">
  {/* add variant classes above */}
</button>

4.4 Inputs

<input className="bg-card/60 backdrop-blur-xs border border-line/80 rounded-xl h-10 px-3 text-text placeholder:subtle focus-visible:ring-2 focus-visible:ring-primary/50 focus:border-primary/30" />

	•	Add icons inside with pl-9 and absolute icon left-3 top-1/2 -translate-y-1/2 text-subtle.

4.5 Tabs (underlined)

<nav className="flex gap-6 border-b border-line/80">
  <button className="py-3 text-muted aria-selected:text-text aria-selected:font-medium relative aria-selected:after:content-[''] aria-selected:after:absolute aria-selected:after:inset-x-0 aria-selected:after:-bottom-px aria-selected:after:h-0.5 aria-selected:after:bg-gradient-to-r aria-selected:after:from-primary aria-selected:after:to-secondary" role="tab">Overview</button>
</nav>

4.6 Stat Tile

<div className="bg-card border border-line rounded-2xl p-5 shadow-card">
  <div className="text-subtle text-xs">Revenue</div>
  <div className="flex items-baseline gap-2 mt-1">
    <span className="text-2xl font-semibold">$412k</span>
    <span className="text-success text-xs bg-success/15 px-2 py-0.5 rounded-full">+4.3%</span>
  </div>
</div>

4.7 Table (dense, scrollable)

<div className="bg-card border border-line rounded-2xl shadow-card overflow-hidden">
  <div className="max-h-[520px] overflow-auto [scrollbar-color:theme(colors.line)_transparent]">
    <table className="w-full text-sm">
      <thead className="text-subtle sticky top-0 bg-card/90 backdrop-blur-sm">
        <tr className="border-b border-line/70">
          <th className="text-left py-3 px-4 font-medium">Name</th>
          <th className="text-left py-3 px-4 font-medium">Status</th>
          <th className="text-right py-3 px-4 font-medium">Amount</th>
        </tr>
      </thead>
      <tbody>
        {/* rows */}
      </tbody>
    </table>
  </div>
</div>

4.8 Toast

<div className="fixed right-5 bottom-5 bg-card2/80 backdrop-blur-md border border-line rounded-2xl shadow-card2 px-4 py-3">
  <div className="flex items-center gap-3 text-sm"><span className="i-lucide-check-circle text-success"/> Saved</div>
</div>


⸻

5) Patterns

5.1 Bento Grid (Crypto/Stats vibe)

<div className="grid grid-cols-12 gap-4">
  <section className="col-span-12 lg:col-span-8 bg-card rounded-2xl border border-line shadow-card p-6">{/* Chart */}</section>
  <section className="col-span-12 lg:col-span-4 grid grid-rows-3 gap-4">
    <div className="bg-card rounded-2xl border border-line shadow-card p-5">{/* Tile 1 */}</div>
    <div className="bg-card rounded-2xl border border-line shadow-card p-5">{/* Tile 2 */}</div>
    <div className="bg-card rounded-2xl border border-line shadow-card p-5">{/* Tile 3 */}</div>
  </section>
  <section className="col-span-12 bg-card rounded-2xl border border-line shadow-card p-6">{/* Activity table */}</section>
</div>

5.2 Glass Header (hero)

<header className="relative rounded-2xl border border-line shadow-card overflow-hidden">
  <div className="absolute inset-0 bg-radial-soft"/>
  <div className="relative bg-card/60 backdrop-blur-md p-6">
    <h1 className="text-2xl font-semibold">Dashboard</h1>
    <p className="text-muted mt-1">Your business at a glance</p>
    <div className="mt-4 flex gap-3">
      <button className="bg-primary text-black rounded-xl h-10 px-4">New</button>
      <button className="bg-card2 border border-line rounded-xl h-10 px-4">Import</button>
    </div>
  </div>
</header>

5.3 Trade/Action Ticket (compact form)

<form className="bg-card2/70 backdrop-blur-md border border-line rounded-2xl p-5 grid grid-cols-2 gap-4">
  <div>
    <label className="text-subtle text-xs">Symbol</label>
    <input className="mt-1 w-full bg-card border border-line rounded-xl h-10 px-3"/>
  </div>
  <div>
    <label className="text-subtle text-xs">Quantity</label>
    <input className="mt-1 w-full bg-card border border-line rounded-xl h-10 px-3"/>
  </div>
  <div className="col-span-2 flex justify-end gap-3 mt-2">
    <button className="bg-card border border-line rounded-xl h-10 px-4">Cancel</button>
    <button className="bg-primary text-black rounded-xl h-10 px-4">Submit</button>
  </div>
</form>


⸻

6) Chart Theme (Recharts)
	•	Background: bg-card
	•	Grid lines: stroke=theme('colors.line')
	•	Axis labels: text-muted
	•	Primary stroke: hsl(var(--primary)), secondary hsl(var(--secondary))
	•	Area fills: use fillOpacity={0.16} with matching accent.

const axis = { stroke: 'hsl(var(--subtle))', fontSize: 12 };
const grid = { stroke: 'hsl(var(--line))' };


⸻

7) Iconography
	•	Use lucide-react; 1.25rem default.
	•	Color follows text by default; accents only on active/CTA.

⸻

8) Accessibility
	•	Minimum contrast for body text 4.5:1; secondary/meta 3:1.
	•	Focus visible on all interactive elements.
	•	Don’t rely on color alone—icons/labels for status.

⸻

9) Example Page Composition
	1.	Header (glass) with page title + primary action
	2.	Bento above the fold: 8‑col chart + 4‑col KPIs
	3.	Data section: wide table with sticky head
	4.	Right rail (optional): activity, notifications
	5.	Footer: compact with links in muted text

⸻

10) Implementation Checklist (Cursor)
	•	Add CSS variables to globals.css and set data-theme="dark" on <html>.
	•	Update tailwind.config.ts per above and restart dev server.
	•	Install shadcn/ui, lucide-react, recharts.
	•	Create AppShell with topbar/sidebar using tokens.
	•	Build core components: Button, Card, Input, Tabs, Table using classes above.
	•	Implement Bento grid dashboard section.
	•	Apply chart theme with primary/secondary accents.
	•	Audit contrast and keyboard focus.

⸻

11) Do / Don’t

Do
	•	Keep accents rare; use them for CTA/focus states.
	•	Use dividers sparingly; prefer spacing and elevation.
	•	Use consistent 12–16px radii.

Don’t
	•	Don’t use pure black backgrounds or pure white text.
	•	Don’t stack strong glows everywhere—limit to hero/CTA.
	•	Don’t mix too many gradients; one subtle background wash is enough.

⸻

12) Quick Snippets

Neon CTA

<button className="relative bg-primary text-black rounded-xl h-10 px-5 font-semibold shadow-glow">
  <span className="relative z-10">Get Started</span>
  <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/0 via-secondary/20 to-primary/0 blur-md"/>
</button>

Glass Panel

<div className="bg-card/60 backdrop-blur-md border border-line rounded-2xl shadow-card2"></div>

Divider Title

<h3 className="text-sm text-subtle font-medium tracking-tight flex items-center gap-2">
  <span className="inline-block h-px w-3 bg-line"/> Section <span className="inline-block h-px flex-1 bg-line"/>
</h3>


⸻

13) Theming Switch (optional)

// Toggle light/dark by flipping data-theme on <html>
const toggleTheme = () => {
  const el = document.documentElement;
  el.dataset.theme = el.dataset.theme === 'dark' ? 'light' : 'dark';
};

This file defines the dark mode baseline. If/when you want a light theme, copy the token map with lighter surfaces and reuse the same semantic names.