# MOBILE_AUDIT.md

Mobile-Responsiveness-Audit für Business Hub. Stand: 2026-06-06.
Zielbreiten für die Verifikation: **375 / 390 / 414 px** (Mobile) und **≥1280 px** (Desktop, darf nicht regredieren).

Status-Legende: ⬜ offen · 🟦 teilweise · ✅ gelöst

---

## Phase 1 — Stack & Struktur

| Aspekt | Befund |
| --- | --- |
| Framework | Next.js 16.2.6 (App Router) + React 19 + TypeScript 5 |
| Styling | **Tailwind CSS v4** (PostCSS-Plugin, kein `tailwind.config.js`; Theme via `@theme inline` + CSS-Variablen in [app/globals.css](app/globals.css)) |
| Komponenten | shadcn/ui (Nova-Preset, base `neutral`), Radix-Primitives, lucide-react Icons |
| Breakpoints | Tailwind-Defaults: `sm` 640 · `md` 768 · `lg` 1024 · `xl` 1280 · `2xl` 1536. **Aktuell faktisch ungenutzt** — die App ist hart auf Desktop verdrahtet. |
| Viewport-Meta | Next.js injiziert `width=device-width, initial-scale=1` automatisch (kein `viewport`-Export, keine Überschreibung in [app/layout.tsx](app/layout.tsx)) → **OK**, keine Änderung nötig. |
| Tabellen-Lib | TanStack Table (Projekte, Ressourcen) |
| Kalender-Lib | FullCalendar React (`dayGrid` / `timeGrid` / `interaction`) |
| Kanban-Lib | dnd-kit |

### Alle Views/Routes

| Route | Datei | Inhalt |
| --- | --- | --- |
| `/` → `/projects` | [app/page.tsx](app/page.tsx) | Redirect |
| `/projects` | [app/projects/_components/ProjectsClient.tsx](app/projects/_components/ProjectsClient.tsx) | Tabelle / Kanban / Kalender + Filter-Toolbar + Drawer |
| `/digest` | [app/digest/_components/DailyDigest.tsx](app/digest/_components/DailyDigest.tsx) | KI-Briefing + Time-Block-Vorschläge |
| `/calendar` | [app/calendar/_components/CalendarView.tsx](app/calendar/_components/CalendarView.tsx) | Google-Kalender-Mirror |
| `/clients` | [app/clients/_components/ClientsView.tsx](app/clients/_components/ClientsView.tsx) | Master-Detail (Liste + Detail) |
| `/areas` | [app/areas/_components/AreasView.tsx](app/areas/_components/AreasView.tsx) | Karten-Grid + Drawer |
| `/resources` | [app/resources/_components/ResourcesView.tsx](app/resources/_components/ResourcesView.tsx) | Tabelle + Filter + Drawer |
| `/profile` | [app/profile/_components/ProfileView.tsx](app/profile/_components/ProfileView.tsx) | Integrations-Status + Settings |
| `/capture` | [app/capture/_components/CaptureForm.tsx](app/capture/_components/CaptureForm.tsx) | Quick Capture — **bereits mobil** (`fixed inset-0`) |
| `/login` | [app/login/_components/LoginForm.tsx](app/login/_components/LoginForm.tsx) | Passwort-Gate — **bereits mobil** (`fixed inset-0`) |
| `/settings/google-*` | [app/settings/](app/settings/) | OAuth-Landings (unkritisch) |

---

## Globale Root-Causes (zuerst beheben — betreffen ALLE Views)

| # | Komponente/Datei | Problem | Fix-Strategie | Status |
| --- | --- | --- | --- | --- |
| G1 | [app/layout.tsx:36](app/layout.tsx#L36) | `<main>` hat `min-w-[1280px]` → **die ganze App ist auf jedem Gerät ≥1280px breit**. Hauptursache für horizontales Seiten-Scrollen. | `min-w-[1280px]` entfernen; durch responsive Padding ersetzen (`px-4 sm:px-6`), `w-full max-w-screen-2xl` behalten. | ✅ |
| G2 | [components/TopNav.tsx:55](components/TopNav.tsx#L55) | Nav-Container `min-w-[1280px]`; 6 Tabs zentriert + Action-Cluster werden rechts abgeschnitten, nicht alle Tabs erreichbar. | `min-w` raus. Tabs auf Mobile in **horizontal scrollbare Leiste** (`overflow-x-auto`, snap, `no-scrollbar`) ODER Dropdown. Action-Cluster (Capture/Locale/Connect/Avatar) kompakter, Titel kürzbar. | ✅ |
| G3 | [app/clients/_components/ClientsView.tsx:189](app/clients/_components/ClientsView.tsx#L189), [app/calendar/_components/CalendarView.tsx:499](app/calendar/_components/CalendarView.tsx#L499) | Eigene Wrapper mit `min-w-[1240px]` (zusätzlich zum globalen). | `min-w` entfernen; `w-full`, responsive Padding. | ✅ |
| G4 | global | Touch-Targets teils <44px (Icon-Buttons `size-8` = 32px, Nav-Tabs `py-1.5`). | Auf Mobile Mindesthöhe/-Fläche anheben wo sinnvoll (Tabs, Icon-Buttons in Toolbars). | 🟦 Filter/Inputs/Selects auf `h-9`+`w-full` angehoben, Zurück-Button `py-2`. Nav-Tabs (`py-1.5` ≈ 30px) und einzelne Icon-Buttons (`size-8` = 32px) bleiben knapp unter 44px — bewusst, da volle 44px die Top-Nav-Höhe sprengen würden. Offener Feinschliff. |

---

## Phase 1 — Probleme pro View

### Top-Navigation
| Komponente/Datei | Problem | Fix-Strategie | Status |
| --- | --- | --- | --- |
| [components/TopNav.tsx](components/TopNav.tsx) | siehe G2. `justify-center` + `flex-1` Nav + fixe Gaps sprengen den Viewport. | Mobile: scrollbare Tab-Leiste (volle Breite, aktiver Tab sichtbar markiert). Titel auf Mobile ggf. kürzen/ausblenden. | ✅ |

### Projekte — Toolbar
| [ProjectsClient.tsx:162-258](app/projects/_components/ProjectsClient.tsx#L162) | Toolbar nutzt bereits `flex-wrap` (gut), aber 3× `w-[180px]` Selects + View-Toggle + Group-Button + Add-Button stapeln unkontrolliert. | Selects auf Mobile `w-full` / 2-spaltig; Add-Button voll-breit oder Icon-only; Reihenfolge prüfen. | ✅ |

### Projekte — Tabelle
| [ProjectsTable.tsx:253-330](app/projects/_components/ProjectsTable.tsx#L253) | `<table w-full>` mit fixen Zell-Breiten (Name + 150/160/130/150px Spalten) → breiter als Viewport; Wrapper ist `overflow-hidden` → Inhalt wird abgeschnitten statt scrollbar. | **Mobile: Karten-Layout** (gestapelte Label-Wert-Paare pro Projekt) statt Tabelle. Tabelle nur ab `md`/`lg`. Alternativ Tabelle in `overflow-x-auto`-Container. Karten bevorzugt. | ✅ |

### Projekte — Kanban
| [ProjectsKanban.tsx:71](app/projects/_components/ProjectsKanban.tsx#L71) | `grid grid-cols-3` → 3 Spalten nebeneinander, nur eine sichtbar, Rest ragt raus. | Mobile: vertikal stapeln (`grid-cols-1`) **oder** horizontales Snap-Scrolling (`flex overflow-x-auto snap-x`, Spaltenbreite `~85vw`). Ab `md`: `grid-cols-3`. | ✅ |

### Projekte — Kalender (& Tab Kalender)
| [ProjectsCalendar.tsx:70](app/projects/_components/ProjectsCalendar.tsx#L70) | `grid grid-cols-[minmax(0,1fr)_280px]` (Kalender + „kein Deadline"-Sidebar) stapelt nicht. FullCalendar-Monatsgitter zeigt nur Mo–Mi. | Mobile: einspaltig (`grid-cols-1`), Sidebar unter den Kalender. FullCalendar volle Breite; ggf. Scoped-CSS für kleinere Zellen / Listen-Ansicht. | ✅ |
| [CalendarView.tsx](app/calendar/_components/CalendarView.tsx) + [calendar.css](app/calendar/calendar.css) | `min-w-[1240px]` (G3). Toolbar (`flex-wrap` vorhanden, ok) + FullCalendar `timeGridWeek` zu breit; Monatsgitter abgeschnitten. | `min-w` raus. Mobile-Default ggf. `timeGridDay` oder Listen-Ansicht; scoped CSS für schmale Slots. Toolbar-Buttons touch-tauglich. | ✅ |

### Kunden
| [ClientsView.tsx:189-227](app/clients/_components/ClientsView.tsx#L189) | `min-w-[1240px]` (G3); KPI-Reihe `grid-cols-3` schneidet rechts ab; `grid-cols-[320px_minmax(0,1fr)]` (Liste+Detail) stapelt nicht. | `min-w` raus. KPI: `grid-cols-1 sm:grid-cols-3`. Master-Detail: Mobile als **Drill-down** (Liste → Tap → Detail mit Zurück-Button), Desktop side-by-side. | ✅ |
| [ClientDetail.tsx:104](app/clients/_components/ClientDetail.tsx#L104), [:265](app/clients/_components/ClientDetail.tsx#L265) | Financial-KPIs `grid-cols-3`, Metadaten-Grid `grid-cols-2` zu eng; Header-Buttons. | KPIs `grid-cols-1 sm:grid-cols-3`; Metadaten `grid-cols-1 sm:grid-cols-2`. | ✅ |
| [WhatsAppTemplates.tsx](app/clients/_components/WhatsAppTemplates.tsx) | Vorlagen-Text läuft aus dem Rahmen (kein Umbruch). | `break-words` / `whitespace-pre-wrap`, Buttons stapeln. (Datei in Phase 3 detailliert prüfen.) | ✅ |
| [InvoiceList.tsx](app/clients/_components/InvoiceList.tsx) | Rechnungs-Tabelle vermutlich zu breit. | In `overflow-x-auto` kapseln oder Karten. (In Phase 3 prüfen.) | ✅ |

### Bereiche (Areas)
| [AreasView.tsx:109](app/areas/_components/AreasView.tsx#L109) | Grid bereits responsiv (`grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3`) — gut. Problem: lange Textblöcke/Abstände in Karten + FocusHeader-Lesbarkeit. | Karten-Padding/Truncation prüfen, `break-words`. Inline-Editoren touch-tauglich. Geringer Aufwand. | ✅ |
| [AreaCard.tsx](app/areas/_components/AreaCard.tsx) | Inline-Edit-Targets, Badges-Umbruch. | `flex-wrap` für Badges, Touch-Targets. | ✅ |

### Ressourcen
| [ResourcesView.tsx:303-369](app/resources/_components/ResourcesView.tsx#L303) | Tabelle bereits in `overflow-x-auto` gekapselt (besser als Projekte), aber auf Mobile trotzdem Querscrollen über viele Spalten. Filter-Bar: `w-[200px]`/`w-[180px]` Selects + Add-Button. | Mobile: Karten-Layout oder reduzierte Spalten (Name/Type) + Rest im Drawer. Filter-Selects `w-full`. | ✅ |

### KI-Briefing (Digest)
| [DailyDigest.tsx](app/digest/_components/DailyDigest.tsx), [TimeBlockSuggestions.tsx](app/digest/_components/TimeBlockSuggestions.tsx) | `max-w-4xl` zentriert — relativ gutartig. Markdown-Prosa + Vorschlags-Karten prüfen auf Padding/Umbruch. | Geringer Aufwand: Padding, `break-words`, Karten-Buttons stapeln. | ✅ |

### Profil
| [ProfileView.tsx](app/profile/_components/ProfileView.tsx), [SettingsSection.tsx](app/profile/_components/SettingsSection.tsx) | Integrations-Karten + Settings-Reihen — Grid/Flex prüfen. | Karten `grid-cols-1 sm:grid-cols-2`; Settings-Reihen stapeln. | ✅ |

### Drawer / Dialoge (shared)
| [ProjectDrawer.tsx:61](app/projects/_components/ProjectDrawer.tsx#L61), [AreaDrawer.tsx:58](app/areas/_components/AreaDrawer.tsx#L58), [ResourceDrawer.tsx:75](app/resources/_components/ResourceDrawer.tsx#L75) | Breite `w-[min(90vw,1400px)]` — auf Mobile bereits 90vw, **ok**. Aber interne `grid-cols-[140px_1fr]` / `[160px_1fr]` Meta-Zeilen sind eng. | Meta-Grid auf Mobile `grid-cols-1` oder schmaleres Label. Drawer-Breite ok. | ✅ |
| [components/ui/dialog.tsx:64](components/ui/dialog.tsx#L64) | `max-w-[calc(100%-2rem)] sm:max-w-sm` — **bereits mobil-safe**. | Keine Änderung nötig. | ✅ |

---

## Phase 2 — Strategie (Kurzfassung)

1. **Mobile-first**: Default = Mobile, Aufstockung über `sm`/`md`/`lg`. Bestehende Tailwind-Breakpoints, **keine neue CSS-Lib**.
2. **Navigation**: scrollbare Tab-Leiste auf Mobile.
3. **Tabellen → Karten**: Projekte (+ ggf. Ressourcen/Rechnungen) auf Mobile gestapelte Karten; sonst `overflow-x-auto` mit Scroll-Hinweis.
4. **Kanban**: vertikal stapeln oder Snap-Scroll.
5. **Kalender**: volle Breite, Mobile evtl. Tages-/Listen-Ansicht.
6. **Master-Detail (Kunden)**: Drill-down statt side-by-side.
7. **KPI-Reihen**: `grid-cols-1 sm:grid-cols-3`.
8. **Touch-Targets** ≥44px; **Text** `break-words`; **kein** horizontales Seiten-Scrollen (Root nie breiter als Viewport).

## Phase 3 — Reihenfolge der Umsetzung
1. Globaler App-Shell (G1) + TopNav (G2) — schaltet sofort alle Seiten frei.
2. Projekte (Toolbar, Tabelle, Kanban, Kalender).
3. Kunden (G3, KPIs, Drill-down, WhatsApp/Invoices).
4. Kalender-Tab (G3, FullCalendar).
5. Ressourcen, Bereiche, Digest, Profil.
6. Drawer-Innenlayouts.

## Phase 4 — Verifikation

**Build:** `npm run build` → ✓ Compiled successfully (keine Type-/Lint-Fehler durch die Änderungen).

**Statische Prüfung pro View** (Quellcode, da keine laufende Browser-Session — visuelle Sichtprüfung bei 375/390/414 px durch Markus empfohlen):

| View | Status | Begründung |
| --- | --- | --- |
| App-Shell / alle Seiten | ✅ | `min-w-[1280px]` aus `<main>` entfernt → keine erzwungene Mindestbreite mehr; Root nie breiter als Viewport. |
| Top-Navigation | ✅ | Tabs in scrollbarer `overflow-x-auto no-scrollbar`-Leiste, bricht auf eigene Zeile um; alle 6 Tabs erreichbar. |
| Projekte (Tabelle) | ✅ | Mobile = gestapelte Karten (`md:hidden`), Desktop = Tabelle (`hidden md:block`). Inline-Edit bleibt erhalten. |
| Projekte (Kanban) | ✅ | Mobile = horizontales Snap-Wischen (85vw-Spalten), `md:grid-cols-3`. |
| Projekte (Kalender) | ✅ | Grid stapelt einspaltig auf Mobile, FullCalendar volle Breite. |
| Kalender-Tab | ✅ | `min-w` weg; FullCalendar passt 7 Tage in den Viewport; scoped Mobile-CSS für schmale Slots. |
| Kunden | ✅ | KPIs `grid-cols-3` (kompakt) mit responsivem Text; Master-Detail = Drill-down (Liste → Detail + Zurück-Button) < md, side-by-side ≥ md. |
| Kunden-Detail | ✅ | Financial-KPIs + Metadaten + Header stapeln einspaltig auf Mobile; Rechnungstabelle `overflow-x-auto`; WhatsApp-Text `break-words`. |
| Bereiche | ✅ | Grid war bereits responsiv; Wrapper-Doppelpadding entfernt. |
| Ressourcen | ✅ | Filter-Selects responsiv; Tabelle in `overflow-x-auto` (akzeptierter Fallback). |
| Digest | ✅ | Doppelpadding entfernt; Vorschlags-Karten-Buttons stapeln auf Mobile. |
| Profil | ✅ | Doppelpadding entfernt; Timezone-Input `w-full` mit Wrap; Fehler-`<pre>` bricht um. |
| Drawer (Projekte/Areas/Resources) | ✅ | Meta-Grids stapeln Label/Wert einspaltig < sm; Außenbreite war bereits `90vw`. |
| Touch-Targets | 🟦 | Inputs/Selects/Filter angehoben; Nav-Tabs + einzelne Icon-Buttons bleiben ~32px (bewusst, s. G4). |

**Empfohlene manuelle Sichtprüfung** (von Markus): `npm run dev`, DevTools-Responsive-Modus bei 375 px, jeden Tab durchklicken und auf horizontales Seiten-Scrollen prüfen.

## Design-Entscheidungen (von Markus bestätigt, 2026-06-06)
- **Navigation Mobile**: **scrollbare Tab-Leiste** (horizontal wischbar, aktiver Tab markiert).
- **Tabellen Mobile** (Projekte, ggf. Ressourcen): **Karten-Layout** (gestapelte Label-Wert-Paare).
- **Kanban Mobile**: **horizontales Snap-Wischen** (Spaltenbreite ~85vw, `snap-x`).
