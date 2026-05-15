export const LOCALES = ["de", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "de";

type Entry = Record<Locale, string>;

export const translations = {
  "app.title": { de: "Business Hub", en: "Business Hub" },

  "nav.projects": { de: "Projekte", en: "Projects" },
  "nav.digest": { de: "KI-Briefing", en: "AI Digest" },
  "nav.calendar": { de: "Kalender", en: "Calendar" },
  "nav.clients": { de: "Kunden", en: "Clients" },
  "nav.areas": { de: "Bereiche", en: "Areas" },
  "nav.resources": { de: "Ressourcen", en: "Resources" },

  "locale.de": { de: "DE", en: "DE" },
  "locale.en": { de: "EN", en: "EN" },

  "projects.view.table": { de: "Tabelle", en: "Table" },
  "projects.view.kanban": { de: "Kanban", en: "Kanban" },
  "projects.view.calendar": { de: "Kalender", en: "Calendar" },

  "projects.calendar.noDeadline": { de: "Kein Fälligkeitsdatum", en: "No deadline" },

  "projects.col.name": { de: "Name", en: "Name" },
  "projects.col.status": { de: "Status", en: "Status" },
  "projects.col.area": { de: "Bereich", en: "Area" },
  "projects.col.priority": { de: "Priorität", en: "Priority" },
  "projects.col.dueDate": { de: "Fällig", en: "Due Date" },
  "projects.col.nextAction": { de: "Nächster Schritt", en: "Next Action" },

  "projects.filter.allStatuses": { de: "Alle Status", en: "All statuses" },
  "projects.filter.allAreas": { de: "Alle Bereiche", en: "All areas" },
  "projects.filter.allPriorities": { de: "Alle Prioritäten", en: "All priorities" },

  "projects.empty": { de: "Keine aktiven Projekte.", en: "No active projects." },
  "projects.kanban.emptyCol": { de: "Leer", en: "Empty" },
  "projects.loading": { de: "Lädt …", en: "Loading…" },
  "projects.errorLoad": { de: "Projekte konnten nicht geladen werden.", en: "Could not load projects." },
  "projects.errorUpdate": { de: "Aktualisierung fehlgeschlagen.", en: "Update failed." },
  "projects.updateSuccess": { de: "Projekt aktualisiert.", en: "Project updated." },

  "projects.cell.addName": { de: "Name hinzufügen …", en: "Add name…" },
  "projects.cell.addNextAction": { de: "Nächsten Schritt hinzufügen …", en: "Add next action…" },
  "projects.cell.setDueDate": { de: "Datum setzen", en: "Set date" },
  "projects.cell.noArea": { de: "Bereich wählen", en: "Select area" },

  "projects.drawer.title": { de: "Projektdetails", en: "Project details" },
  "projects.drawer.outcome": { de: "Ergebnis", en: "Outcome" },
  "projects.drawer.noOutcome": { de: "Kein Ergebnis festgelegt", en: "No outcome set" },
  "projects.drawer.estimated": { de: "Geschätzt", en: "Estimated" },
  "projects.drawer.minutes": { de: "Min.", en: "min" },
  "projects.drawer.client": { de: "Kunde", en: "Client" },
  "projects.drawer.created": { de: "Erstellt", en: "Created" },
  "projects.drawer.openInNotion": { de: "In Notion öffnen", en: "Open in Notion" },
  "projects.drawer.close": { de: "Schließen", en: "Close" },

  "projects.add.button": { de: "Projekt hinzufügen", en: "Add Project" },
  "projects.add.title": { de: "Neues Projekt", en: "New Project" },
  "projects.add.description": {
    de: "Erstellt eine neue Seite in der Notion Projekte-Datenbank.",
    en: "Creates a new page in the Notion Projects database.",
  },
  "projects.add.submit": { de: "Erstellen", en: "Create" },
  "projects.add.cancel": { de: "Abbrechen", en: "Cancel" },
  "projects.add.creating": { de: "Wird erstellt …", en: "Creating…" },
  "projects.add.namePlaceholder": { de: "Projektname", en: "Project name" },
  "projects.add.nextActionPlaceholder": { de: "Optional", en: "Optional" },
  "projects.add.selectArea": { de: "Bereich wählen", en: "Select area" },
  "projects.add.nameRequired": { de: "Name ist erforderlich.", en: "Name is required." },
  "projects.add.areaRequired": { de: "Bereich ist erforderlich.", en: "Area is required." },
  "projects.add.error": { de: "Projekt konnte nicht erstellt werden.", en: "Could not create project." },
  "projects.add.success": { de: "Projekt erstellt.", en: "Project created." },

  "status.Active": { de: "Aktiv", en: "Active" },
  "status.On Hold": { de: "Pausiert", en: "On Hold" },
  "status.Done": { de: "Erledigt", en: "Done" },

  "priority.High": { de: "Hoch", en: "High" },
  "priority.Medium": { de: "Mittel", en: "Medium" },
  "priority.Low": { de: "Niedrig", en: "Low" },

  "blocks.empty": {
    de: "Kein Inhalt. Notizen in Notion hinzufügen.",
    en: "No content. Add notes in Notion.",
  },
  "blocks.loading": { de: "Lädt …", en: "Loading…" },
  "blocks.error": {
    de: "Seiteninhalt konnte nicht geladen werden.",
    en: "Couldn't load page content.",
  },
  "blocks.retry": { de: "Erneut versuchen", en: "Retry" },
  "blocks.unsupported": { de: "Nicht unterstützter Block", en: "Unsupported block" },
  "blocks.moreInNotion": { de: "(mehr in Notion)", en: "(more in Notion)" },

  "common.comingSoon": { de: "Demnächst verfügbar", en: "Coming soon" },
} satisfies Record<string, Entry>;

export type TranslationKey = keyof typeof translations;
