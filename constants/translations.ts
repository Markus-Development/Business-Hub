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
  "projects.viewToggle.ariaLabel": { de: "Ansicht", en: "View" },

  "projects.calendar.noDeadline": { de: "Kein Fälligkeitsdatum", en: "No deadline" },

  "projects.col.name": { de: "Name", en: "Name" },
  "projects.col.status": { de: "Status", en: "Status" },
  "projects.col.department": { de: "Abteilung", en: "Department" },
  "projects.col.priority": { de: "Priorität", en: "Priority" },
  "projects.col.dueDate": { de: "Fällig", en: "Due Date" },
  "projects.col.nextAction": { de: "Nächster Schritt", en: "Next Action" },

  "projects.filter.allStatuses": { de: "Alle Status", en: "All statuses" },
  "projects.filter.allDepartments": { de: "Alle Abteilungen", en: "All departments" },
  "projects.filter.allPriorities": { de: "Alle Prioritäten", en: "All priorities" },

  "projects.empty": { de: "Keine aktiven Projekte.", en: "No active projects." },
  "projects.kanban.emptyCol": { de: "Leer", en: "Empty" },
  "projects.loading": { de: "Lädt …", en: "Loading…" },
  "projects.errorLoad": { de: "Projekte konnten nicht geladen werden.", en: "Could not load projects." },
  "projects.errorUpdate": { de: "Aktualisierung fehlgeschlagen.", en: "Update failed." },
  "projects.updateSuccess": { de: "Projekt aktualisiert.", en: "Project updated." },
  "projects.archivedToast": { de: "Nach /04 Archives verschoben", en: "Archived to /04 Archives" },

  "projects.cell.addName": { de: "Name hinzufügen …", en: "Add name…" },
  "projects.cell.addNextAction": { de: "Nächsten Schritt hinzufügen …", en: "Add next action…" },
  "projects.cell.setDueDate": { de: "Datum setzen", en: "Set date" },
  "projects.cell.noDepartment": { de: "Abteilung wählen", en: "Select department" },
  "projects.groupByDepartment": { de: "Nach Abteilung gruppieren", en: "Group by Department" },
  "projects.noDepartment": { de: "Keine Abteilung", en: "No Department" },

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
  "projects.add.selectDepartment": { de: "Abteilung wählen", en: "Select department" },
  "projects.add.nameRequired": { de: "Name ist erforderlich.", en: "Name is required." },
  "projects.add.departmentRequired": { de: "Abteilung ist erforderlich.", en: "Department is required." },
  "projects.add.error": { de: "Projekt konnte nicht erstellt werden.", en: "Could not create project." },
  "projects.add.success": { de: "Projekt erstellt.", en: "Project created." },
  "projects.add.notes": { de: "Notizen", en: "Notes" },
  "projects.add.notesPlaceholder": {
    de: "Füge initiale Notizen hinzu …",
    en: "Add initial notes…",
  },
  "projects.suggest.title": { de: "KI-Aktionsschritte", en: "AI Action Steps" },
  "projects.suggest.contextPlaceholder": {
    de: "Kontext hinzufügen (z. B. Datum, App, Personen) …",
    en: "Add context (e.g. date, app, people)…",
  },
  "projects.suggest.button": { de: "Vorschläge", en: "Suggest" },
  "projects.suggest.use": { de: "Übernehmen", en: "Use" },
  "projects.suggest.error": {
    de: "Vorschläge konnten nicht geladen werden.",
    en: "Could not load suggestions.",
  },
  "projects.suggest.regenerate": { de: "Neu generieren", en: "Regenerate" },
  "projects.suggest.savedLabel": {
    de: "Gespeicherte Vorschläge",
    en: "Saved suggestions",
  },

  "status.Active": { de: "Aktiv", en: "Active" },
  "status.On Hold": { de: "Pausiert", en: "On Hold" },
  "status.Done": { de: "Erledigt", en: "Done" },
  "status.Archived": { de: "Archiviert", en: "Archived" },

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

  "digest.title": { de: "Heutiges Briefing", en: "Today's Briefing" },
  "digest.loading": { de: "Lädt …", en: "Loading…" },
  "digest.emptyHint": {
    de: "Noch kein Briefing für heute. Lass es jetzt erstellen.",
    en: "No briefing for today yet. Generate one now.",
  },
  "digest.generate": { de: "Briefing erstellen", en: "Generate today's briefing" },
  "digest.regenerate": { de: "Neu generieren", en: "Regenerate" },
  "digest.generating": { de: "Wird erstellt …", en: "Generating…" },
  "digest.generated": { de: "Briefing aktualisiert.", en: "Briefing updated." },
  "digest.justGenerated": { de: "Gerade erstellt", en: "Just generated" },
  "digest.cachedPrefix": { de: "Erstellt", en: "Generated" },
  "digest.errorLoad": {
    de: "Briefing konnte nicht geladen werden.",
    en: "Could not load briefing.",
  },
  "digest.errorGenerate": {
    de: "Briefing konnte nicht erstellt werden.",
    en: "Could not generate briefing.",
  },

  "timeblocks.title": { de: "Zeitblöcke für heute", en: "Time blocks for today" },
  "timeblocks.loading": { de: "Lädt …", en: "Loading…" },
  "timeblocks.emptyHint": {
    de: "Noch keine Zeitblöcke für heute. Lass Vorschläge erstellen.",
    en: "No time blocks for today yet. Generate suggestions.",
  },
  "timeblocks.suggest": { de: "Zeitblöcke vorschlagen", en: "Suggest time blocks for today" },
  "timeblocks.suggestAgain": { de: "Weitere vorschlagen", en: "Suggest again" },
  "timeblocks.generating": { de: "Wird erstellt …", en: "Generating…" },
  "timeblocks.generated": { de: "Vorschläge erstellt.", en: "Suggestions generated." },
  "timeblocks.confirm": { de: "Bestätigen", en: "Confirm" },
  "timeblocks.dismiss": { de: "Verwerfen", en: "Dismiss" },
  "timeblocks.confirmed": {
    de: "Zum Kalender hinzugefügt.",
    en: "Added to calendar.",
  },
  "timeblocks.dismissed": { de: "Vorschlag verworfen.", en: "Suggestion dismissed." },
  "timeblocks.errorLoad": {
    de: "Vorschläge konnten nicht geladen werden.",
    en: "Could not load suggestions.",
  },
  "timeblocks.errorGenerate": {
    de: "Vorschläge konnten nicht erstellt werden.",
    en: "Could not generate suggestions.",
  },
  "timeblocks.errorConfirm": {
    de: "Bestätigung fehlgeschlagen.",
    en: "Could not confirm suggestion.",
  },
  "timeblocks.errorDismiss": {
    de: "Verwerfen fehlgeschlagen.",
    en: "Could not dismiss suggestion.",
  },
  "timeblocks.errorGoogleNotConnected": {
    de: "Google Kalender ist nicht verbunden. Verbinde ihn oben rechts.",
    en: "Google Calendar isn't connected. Connect it from the top nav.",
  },
  "timeblocks.errorNoFreeSlots": {
    de: "Heute sind zwischen 09:00 und 18:00 keine freien Zeitfenster verfügbar.",
    en: "No free slots between 09:00 and 18:00 today.",
  },

  "profile.title": { de: "Profil", en: "Profile" },
  "profile.integrationsTitle": { de: "Integrationen", en: "Integrations" },
  "profile.recheckAll": { de: "Alle erneut prüfen", en: "Re-check all" },
  "profile.rechecking": { de: "Wird geprüft …", en: "Re-checking…" },
  "profile.rechecked": { de: "Status aktualisiert.", en: "Status refreshed." },
  "profile.loading": { de: "Lädt …", en: "Loading…" },
  "profile.notChecked": { de: "Noch nicht geprüft", en: "Not checked yet" },
  "profile.checked": { de: "Geprüft", en: "Checked" },
  "profile.disconnect": { de: "Trennen", en: "Disconnect" },
  "profile.disconnecting": { de: "Wird getrennt …", en: "Disconnecting…" },
  "profile.disconnected": { de: "Verbindung getrennt.", en: "Disconnected." },
  "profile.errorLoad": {
    de: "Integrationsstatus konnte nicht geladen werden.",
    en: "Could not load integration status.",
  },
  "profile.errorRecheck": {
    de: "Erneute Prüfung fehlgeschlagen.",
    en: "Re-check failed.",
  },
  "profile.errorDisconnect": {
    de: "Trennen fehlgeschlagen.",
    en: "Could not disconnect.",
  },

  "profile.status.connected": { de: "Verbunden", en: "Connected" },
  "profile.status.error": { de: "Fehler", en: "Error" },
  "profile.status.notConfigured": { de: "Nicht konfiguriert", en: "Not configured" },
  "profile.status.neverConnected": { de: "Nicht verbunden", en: "Never connected" },

  "profile.integration.notion": { de: "Notion", en: "Notion" },
  "profile.integration.google": { de: "Google Kalender", en: "Google Calendar" },
  "profile.integration.zoho": { de: "Zoho Books", en: "Zoho Books" },
  "profile.integration.anthropic": { de: "Anthropic", en: "Anthropic" },
  "profile.integration.supabase": { de: "Supabase", en: "Supabase" },

  "profile.kind.envBased": { de: "Token (.env)", en: "Token (.env)" },
  "profile.kind.oauth": { de: "OAuth", en: "OAuth" },

  "profile.archive.title": { de: "Archiv-Durchlauf", en: "Archive sweep" },
  "profile.archive.description": {
    de: "Archiviert Projekte und Ressourcen, die direkt in Notion auf Status „Archived“ gesetzt wurden.",
    en: "Archives projects and resources set to Status “Archived” directly in Notion.",
  },
  "profile.archive.button": { de: "Archiv-Durchlauf starten", en: "Run archive sweep" },
  "profile.archive.running": { de: "Läuft …", en: "Running…" },
  "profile.archive.success": {
    de: "{projects} Projekte, {resources} Ressourcen archiviert.",
    en: "Archived {projects} projects, {resources} resources.",
  },
  "profile.archive.none": { de: "Nichts zu archivieren.", en: "Nothing to archive." },
  "profile.archive.errorsTitle": { de: "Fehler", en: "Errors" },
  "profile.archive.errorItem": { de: "{name} — {error}", en: "{name} — {error}" },
  "profile.archive.toastError": {
    de: "Archiv-Durchlauf fehlgeschlagen.",
    en: "Archive sweep failed.",
  },

  "profile.roadmap.title": { de: "Roadmap-Aktualisierung", en: "Roadmap update" },
  "profile.roadmap.description": {
    de: "Entwirf eine KI-gestützte Roadmap-Aktualisierung aus deinen abgeschlossenen Projekten, prüfe den Diff und übernimm oder verwirf ihn.",
    en: "Draft an AI roadmap update from your completed projects, review the diff, then apply or discard.",
  },
  "profile.roadmap.draftButton": { de: "Roadmap-Update entwerfen", en: "Draft roadmap update" },
  "profile.roadmap.drafting": { de: "Entwurf läuft …", en: "Drafting…" },
  "profile.roadmap.empty": {
    de: "Keine abgeschlossenen Projekte (Status „Done“) — kein Entwurf möglich.",
    en: "No completed (Done) projects — nothing to draft from.",
  },
  "profile.roadmap.diffLabel": { de: "Roadmap-Diff", en: "Roadmap diff" },
  "profile.roadmap.showDiff": {
    de: "Diff anzeigen ({count} Zeilen)",
    en: "Show diff ({count} lines)",
  },
  "profile.roadmap.hideDiff": { de: "Diff ausblenden", en: "Hide diff" },
  "profile.roadmap.projectsLabel": {
    de: "Zu archivierende Projekte",
    en: "Projects to archive",
  },
  "profile.roadmap.warningsLabel": { de: "Warnungen", en: "Warnings" },
  "profile.roadmap.apply": { de: "Übernehmen", en: "Apply" },
  "profile.roadmap.discard": { de: "Verwerfen", en: "Discard" },
  "profile.roadmap.applying": { de: "Wird übernommen …", en: "Applying…" },
  "profile.roadmap.appliedSummary": {
    de: "roadmap.md aktualisiert und {count} Projekte archiviert.",
    en: "Updated roadmap.md and archived {count} projects.",
  },
  "profile.roadmap.errorsLabel": { de: "Archivierungsfehler", en: "Archive errors" },
  "profile.roadmap.skippedLabel": {
    de: "Übersprungen (Status geändert)",
    en: "Skipped (status changed)",
  },
  "profile.roadmap.runAgain": { de: "Erneut ausführen", en: "Run again" },
  "profile.roadmap.discarded": { de: "Entwurf verworfen.", en: "Draft discarded." },
  "profile.roadmap.tryAgain": { de: "Erneut versuchen", en: "Try again" },
  "profile.roadmap.draftError": {
    de: "Roadmap-Update konnte nicht entworfen werden.",
    en: "Could not draft the roadmap update.",
  },
  "profile.roadmap.applyError": {
    de: "Roadmap-Update konnte nicht übernommen werden.",
    en: "Could not apply the roadmap update.",
  },

  "settings.title": { de: "Einstellungen", en: "Settings" },
  "settings.loading": { de: "Lädt …", en: "Loading…" },
  "settings.errorLoad": {
    de: "Einstellungen konnten nicht geladen werden.",
    en: "Could not load settings.",
  },
  "settings.errorTaskTypes": {
    de: "Notion-Optionen konnten nicht geladen werden.",
    en: "Could not load Notion options.",
  },
  "settings.errorCalendars": {
    de: "Kalenderliste konnte nicht geladen werden.",
    en: "Could not load calendar list.",
  },
  "settings.errorSave": { de: "Speichern fehlgeschlagen.", en: "Save failed." },
  "settings.saved": { de: "Gespeichert.", en: "Saved." },

  "settings.tz.title": { de: "Zeitzone", en: "Timezone" },
  "settings.tz.description": {
    de: "IANA-Zeitzone für Tagesblöcke und Briefings.",
    en: "IANA timezone for daily blocks and briefings.",
  },
  "settings.tz.save": { de: "Speichern", en: "Save" },
  "settings.tz.currentValue": { de: "Aktuell", en: "Current" },
  "settings.tz.placeholder": { de: "Kontinent/Stadt", en: "Continent/City" },

  "settings.cal.title": { de: "Hauptkalender", en: "Master Calendar" },
  "settings.cal.description": {
    de: "Der Google-Kalender, in den Zeitblöcke geschrieben werden.",
    en: "The Google calendar that time blocks are written to.",
  },
  "settings.cal.loading": { de: "Lädt Kalender …", en: "Loading calendars…" },
  "settings.cal.notConnected": {
    de: "Verbinde Google Kalender, um einen Hauptkalender auszuwählen.",
    en: "Connect Google Calendar to choose a master calendar.",
  },
  "settings.cal.empty": {
    de: "Keine Kalender gefunden.",
    en: "No calendars found.",
  },
  "settings.cal.primary": { de: "Primär", en: "primary" },

  "settings.windows.title": { de: "Arbeitsfenster pro Aufgabentyp", en: "Task type windows" },
  "settings.windows.description": {
    de: "Ein oder mehrere Arbeitsfenster (0–23, Start < Ende) je Notion-Aufgabentyp.",
    en: "One or more working windows (0–23, start < end) per Notion task type.",
  },
  "settings.windows.loading": { de: "Lädt …", en: "Loading…" },
  "settings.windows.noOptions": {
    de: "Notion 'Task Type' hat keine Auswahloptionen.",
    en: "Notion 'Task Type' has no select options.",
  },
  "settings.windows.missing": {
    de: "Notion 'Task Type'-Eigenschaft fehlt. Lege in der Projects-Datenbank eine Select-Eigenschaft namens 'Task Type' an.",
    en: "Notion 'Task Type' property is missing. Add a Select property named 'Task Type' to the Projects database.",
  },
  "settings.windows.col.type": { de: "Typ", en: "Type" },
  "settings.windows.col.start": { de: "Start", en: "Start" },
  "settings.windows.col.end": { de: "Ende", en: "End" },
  "settings.windows.add": { de: "Fenster hinzufügen", en: "Add window" },
  "settings.windows.remove": { de: "Fenster entfernen", en: "Remove window" },
  "settings.windows.empty": {
    de: "Keine Fenster — füge eines hinzu.",
    en: "No windows — add one.",
  },
  "settings.windows.invalid": {
    de: "Start muss vor Ende liegen.",
    en: "Start must be before end.",
  },

  "calendar.title": { de: "Kalender", en: "Calendar" },
  "calendar.loading": { de: "Lädt …", en: "Loading…" },
  "calendar.view.day": { de: "Tag", en: "Day" },
  "calendar.view.week": { de: "Woche", en: "Week" },
  "calendar.view.month": { de: "Monat", en: "Month" },
  "calendar.view.custom": { de: "Bereich", en: "Range" },
  "calendar.customRange.from": { de: "Von", en: "From" },
  "calendar.customRange.to": { de: "Bis", en: "To" },
  "calendar.customRange.apply": { de: "Anwenden", en: "Apply" },
  "calendar.toolbar.today": { de: "Heute", en: "Today" },
  "calendar.toolbar.prev": { de: "Zurück", en: "Previous" },
  "calendar.toolbar.next": { de: "Weiter", en: "Next" },
  "calendar.notConnected.title": {
    de: "Google Kalender nicht verbunden",
    en: "Google Calendar not connected",
  },
  "calendar.notConnected.body": {
    de: "Verbinde Google Kalender, um Termine zu sehen und zu bearbeiten.",
    en: "Connect Google Calendar to see and edit events.",
  },
  "calendar.notConnected.cta": { de: "Google verbinden", en: "Connect Google" },
  "calendar.errorLoad": {
    de: "Termine konnten nicht geladen werden.",
    en: "Could not load events.",
  },
  "calendar.errorLoadPending": {
    de: "Vorschläge konnten nicht geladen werden.",
    en: "Could not load suggestions.",
  },

  "calendar.dialog.newTitle": { de: "Neuer Termin", en: "New Event" },
  "calendar.dialog.editTitle": { de: "Termin bearbeiten", en: "Edit Event" },
  "calendar.dialog.field.title": { de: "Titel", en: "Title" },
  "calendar.dialog.field.project": { de: "Projekt", en: "Project" },
  "calendar.dialog.field.projectNone": { de: "Kein Projekt", en: "No project" },
  "calendar.dialog.field.description": { de: "Beschreibung", en: "Description" },
  "calendar.dialog.field.start": { de: "Beginn", en: "Start" },
  "calendar.dialog.field.end": { de: "Ende", en: "End" },
  "calendar.dialog.titleRequired": {
    de: "Titel ist erforderlich.",
    en: "Title is required.",
  },
  "calendar.dialog.endBeforeStart": {
    de: "Ende muss nach Beginn liegen.",
    en: "End must be after start.",
  },
  "calendar.dialog.save": { de: "Speichern", en: "Save" },
  "calendar.dialog.saving": { de: "Wird gespeichert …", en: "Saving…" },
  "calendar.dialog.cancel": { de: "Abbrechen", en: "Cancel" },
  "calendar.dialog.delete": { de: "Löschen", en: "Delete" },
  "calendar.dialog.deleting": { de: "Wird gelöscht …", en: "Deleting…" },
  "calendar.dialog.deleteConfirmTitle": {
    de: "Termin wirklich löschen?",
    en: "Delete this event?",
  },
  "calendar.dialog.deleteConfirmBody": {
    de: "Dieser Termin wird aus Google Kalender entfernt.",
    en: "This event will be removed from Google Calendar.",
  },
  "calendar.dialog.deleteConfirmAction": { de: "Endgültig löschen", en: "Delete" },

  "calendar.toast.created": { de: "Termin erstellt.", en: "Event created." },
  "calendar.toast.updated": { de: "Termin aktualisiert.", en: "Event updated." },
  "calendar.toast.deleted": { de: "Termin gelöscht.", en: "Event deleted." },
  "calendar.toast.confirmed": { de: "Zeitblock bestätigt.", en: "Time block confirmed." },
  "calendar.toast.dismissed": { de: "Vorschlag verworfen.", en: "Suggestion dismissed." },
  "calendar.toast.errorCreate": {
    de: "Termin konnte nicht erstellt werden.",
    en: "Could not create event.",
  },
  "calendar.toast.errorUpdate": {
    de: "Termin konnte nicht aktualisiert werden.",
    en: "Could not update event.",
  },
  "calendar.toast.errorDelete": {
    de: "Termin konnte nicht gelöscht werden.",
    en: "Could not delete event.",
  },
  "calendar.toast.errorConfirm": {
    de: "Bestätigung fehlgeschlagen.",
    en: "Could not confirm suggestion.",
  },
  "calendar.toast.errorDismiss": {
    de: "Verwerfen fehlgeschlagen.",
    en: "Could not dismiss suggestion.",
  },

  "calendar.pending.title": { de: "Vorgeschlagener Zeitblock", en: "Suggested time block" },
  "calendar.pending.confirm": { de: "Bestätigen", en: "Confirm" },
  "calendar.pending.dismiss": { de: "Verwerfen", en: "Dismiss" },

  "clients.title": { de: "Kunden", en: "Clients" },
  "clients.loading": { de: "Lädt …", en: "Loading…" },
  "clients.empty": { de: "Keine aktiven Kunden.", en: "No active clients." },
  "clients.errorLoad": {
    de: "Kunden konnten nicht geladen werden.",
    en: "Could not load clients.",
  },
  "clients.errorLoadDetail": {
    de: "Kundendetails konnten nicht geladen werden.",
    en: "Could not load client details.",
  },

  "clients.summary.total": { de: "Kunden", en: "Clients" },
  "clients.summary.outstanding": { de: "Offen", en: "Outstanding" },
  "clients.summary.overdue": { de: "Überfällig", en: "Overdue" },

  "clients.sort.label": { de: "Sortieren", en: "Sort" },
  "clients.sort.overdue": { de: "Überfällig zuerst", en: "Overdue first" },
  "clients.sort.outstanding": { de: "Offen (höchste zuerst)", en: "Outstanding (highest first)" },
  "clients.sort.name": { de: "Name A–Z", en: "Name A–Z" },

  "clients.filterStatus": { de: "Status", en: "Status" },
  "clients.filterStatus.all": { de: "Alle", en: "All" },

  "clients.health.green": { de: "OK", en: "OK" },
  "clients.health.amber": { de: "Offen", en: "Outstanding" },
  "clients.health.red": { de: "Überfällig", en: "Overdue" },

  "clients.detail.openNotion": { de: "In Notion öffnen", en: "Open in Notion" },
  "clients.detail.openDashboard": { de: "Dashboard öffnen", en: "Open dashboard" },
  "clients.detail.notLinked": {
    de: "Kein Notion-Eintrag verknüpft. Erstelle einen in Notion und füge die Zoho Contact ID hinzu.",
    en: "No Notion record linked. Create one in Notion and add the Zoho Contact ID.",
  },

  "clients.financial.title": { de: "Finanzen", en: "Financials" },
  "clients.financial.lifetime": { de: "Gesamtumsatz", en: "Lifetime turnover" },
  "clients.financial.outstanding": { de: "Offen", en: "Outstanding" },
  "clients.financial.overdue": { de: "Überfällig", en: "Overdue" },

  "clients.invoices.title": { de: "Offene Rechnungen", en: "Open invoices" },
  "clients.invoices.number": { de: "Nr.", en: "#" },
  "clients.invoices.date": { de: "Datum", en: "Date" },
  "clients.invoices.dueDate": { de: "Fällig", en: "Due" },
  "clients.invoices.amount": { de: "Betrag", en: "Amount" },
  "clients.invoices.status": { de: "Status", en: "Status" },
  "clients.invoices.empty": { de: "Keine offenen Rechnungen.", en: "No open invoices." },
  "clients.invoices.viewAll": { de: "Alle in Zoho ansehen", en: "View all in Zoho" },

  "clients.invoiceStatus.paid": { de: "Bezahlt", en: "Paid" },
  "clients.invoiceStatus.unpaid": { de: "Offen", en: "Unpaid" },
  "clients.invoiceStatus.overdue": { de: "Überfällig", en: "Overdue" },
  "clients.invoiceStatus.partially_paid": { de: "Teilweise", en: "Partial" },
  "clients.invoiceStatus.draft": { de: "Entwurf", en: "Draft" },
  "clients.invoiceStatus.sent": { de: "Gesendet", en: "Sent" },
  "clients.invoiceStatus.viewed": { de: "Angesehen", en: "Viewed" },
  "clients.invoiceStatus.void": { de: "Storniert", en: "Void" },

  "clients.tasks.title": { de: "Monatliche Aufgaben", en: "Monthly tasks" },
  "clients.tasks.generate": { de: "Aufgaben erstellen", en: "Generate tasks" },
  "clients.tasks.generating": { de: "Wird erstellt …", en: "Generating…" },
  "clients.tasks.alreadyGenerated": {
    de: "Aufgaben für diesen Monat bereits erstellt.",
    en: "Tasks already generated this month.",
  },
  "clients.tasks.notCreated": { de: "Nicht erstellt", en: "Not created" },
  "clients.tasks.created": { de: "Aufgaben erstellt.", en: "Tasks created." },
  "clients.tasks.errorCreate": {
    de: "Aufgaben konnten nicht erstellt werden.",
    en: "Could not create tasks.",
  },
  "clients.tasks.errorUpdate": {
    de: "Aufgabenstatus konnte nicht aktualisiert werden.",
    en: "Could not update task status.",
  },
  "clients.tasks.statusUpdated": { de: "Status aktualisiert.", en: "Status updated." },

  "clients.task.Book a Call": { de: "Anruf vereinbaren", en: "Book a Call" },
  "clients.task.Get Transactions": { de: "Transaktionen einholen", en: "Get Transactions" },
  "clients.task.Prepare Call": { de: "Anruf vorbereiten", en: "Prepare Call" },
  "clients.task.Call Done": { de: "Anruf erledigt", en: "Call Done" },

  "clients.whatsapp.title": { de: "WhatsApp-Vorlagen", en: "WhatsApp templates" },
  "clients.whatsapp.copy": { de: "Kopieren", en: "Copy" },
  "clients.whatsapp.open": { de: "WhatsApp öffnen", en: "Open WhatsApp" },
  "clients.whatsapp.copied": { de: "In Zwischenablage kopiert.", en: "Copied to clipboard." },
  "clients.whatsapp.errorCopy": {
    de: "Kopieren fehlgeschlagen.",
    en: "Could not copy.",
  },
  "clients.whatsapp.edit": { de: "Bearbeiten", en: "Edit" },
  "clients.whatsapp.save": { de: "Speichern", en: "Save" },
  "clients.whatsapp.reset": { de: "Zurücksetzen", en: "Reset" },
  "clients.whatsapp.saving": { de: "Speichert …", en: "Saving…" },
  "clients.whatsapp.saved": { de: "Vorlage gespeichert.", en: "Template saved." },
  "clients.whatsapp.resetDone": {
    de: "Vorlage zurückgesetzt.",
    en: "Template reset.",
  },
  "clients.whatsapp.errorSave": {
    de: "Speichern fehlgeschlagen.",
    en: "Could not save.",
  },
  // The four WhatsApp templates below are always rendered from the `de` entry
  // regardless of the active UI locale — they are client-facing messages, not
  // UI strings. The `en` entries are retained for the translations type but
  // are not surfaced anywhere.
  "clients.whatsapp.template.Book a Call": {
    de: "Hi {name}, ich hoffe, es geht dir gut! Wann passt es dir diese Woche für unser monatliches Review-Gespräch?",
    en: "Hi {name}, hope you're well! When works best for you this week for our monthly review call?",
  },
  "clients.whatsapp.template.Get Transactions": {
    de: "Hi {name}, kannst du mir bitte die Transaktionen dieses Monats schicken? Ich brauche sie, um deine Buchhaltung abzuschließen.",
    en: "Hi {name}, could you send me this month's transactions? I need them to finalise your accounts.",
  },
  "clients.whatsapp.template.Prepare Call": {
    de: "Hi {name}, ich habe alles für unser Gespräch vorbereitet. Dein aktueller offener Betrag beträgt {amount}. Bis gleich!",
    en: "Hi {name}, I've prepared everything for our call. Your current outstanding balance is {amount}. See you soon!",
  },
  "clients.whatsapp.template.Call Done": {
    de: "Hi {name}, schön, dass wir gesprochen haben! Ich schicke dir die Zusammenfassung in Kürze.",
    en: "Hi {name}, great speaking with you today! I'll send over the summary shortly.",
  },

  "clients.metadata.title": { de: "Kundendaten", en: "Client metadata" },
  "clients.metadata.industry": { de: "Branche", en: "Industry" },
  "clients.metadata.industryPlaceholder": { de: "Branche wählen", en: "Select industry" },
  "clients.metadata.employees": { de: "Mitarbeitende", en: "Employees" },
  "clients.metadata.monthlyRevenue": { de: "Monatsumsatz", en: "Monthly revenue" },
  "clients.monthlyFee": { de: "Monatliche Gebühr", en: "Monthly fee" },
  "clients.person": { de: "Ansprechpartner", en: "Contact person" },
  "clients.metadata.callNotesLink": { de: "Call-Notizen", en: "Call notes" },
  "clients.metadata.clientDatabaseLink": { de: "Kunden-Workspace", en: "Client workspace" },
  "clients.metadata.dashboardLink": { de: "Dashboard-URL", en: "Dashboard URL" },
  "clients.metadata.empty": { de: "—", en: "—" },
  "clients.metadata.edit": { de: "Bearbeiten", en: "Edit" },
  "clients.metadata.save": { de: "Speichern", en: "Save" },
  "clients.metadata.cancel": { de: "Abbrechen", en: "Cancel" },
  "clients.metadata.saved": { de: "Gespeichert.", en: "Saved." },
  "clients.metadata.errorSave": {
    de: "Speichern fehlgeschlagen.",
    en: "Could not save.",
  },

  "clients.notes.title": { de: "Notizen", en: "Notes" },
  "clients.notes.editInNotion": { de: "In Notion bearbeiten", en: "Edit in Notion" },

  "areas.title": { de: "Bereiche", en: "Areas" },
  "areas.loading": { de: "Bereiche werden geladen …", en: "Loading areas…" },
  "areas.error": {
    de: "Bereiche konnten nicht geladen werden.",
    en: "Could not load areas.",
  },
  "areas.empty": {
    de: "Noch keine Bereiche angelegt.",
    en: "No areas yet.",
  },
  "areas.status.active": { de: "Aktiv", en: "Active" },
  "areas.status.needsAttention": { de: "Aufmerksamkeit", en: "Needs Attention" },
  "areas.status.paused": { de: "Pausiert", en: "Paused" },
  "areas.field.currentMilestone": { de: "Aktueller Meilenstein", en: "Current Milestone" },
  "areas.field.nextSteps": { de: "Nächste Schritte", en: "Next Steps" },
  "areas.field.nextFocus": { de: "Nächster Fokus", en: "Next Focus" },
  "areas.field.goal": { de: "Ziel", en: "Goal" },
  "areas.field.standard": { de: "Standard", en: "Standard" },
  "areas.field.healthMetric": { de: "Health-Kennzahl", en: "Health Metric" },
  "areas.field.milestoneDueDate": { de: "Meilenstein fällig", en: "Milestone Due Date" },
  "areas.field.status": { de: "Status", en: "Status" },
  "areas.activeProjects": {
    de: "{count} aktive Projekte",
    en: "{count} active projects",
  },
  "areas.openInNotion": { de: "In Notion öffnen", en: "Open in Notion" },
  "areas.editPlaceholder": { de: "Hinzufügen …", en: "Add…" },
  "areas.drawer.pageBody": { de: "Notizen", en: "Notes" },
  "areas.noMilestone": {
    de: "Kein Meilenstein festgelegt.",
    en: "No milestone set.",
  },
  "areas.noNextSteps": {
    de: "Keine nächsten Schritte.",
    en: "No next steps.",
  },
  "areas.updateSuccess": { de: "Bereich aktualisiert.", en: "Area updated." },
  "areas.updateError": {
    de: "Aktualisierung fehlgeschlagen.",
    en: "Update failed.",
  },
  "areas.focus.title": { de: "Strategischer Fokus", en: "Strategic Focus" },
  "areas.focus.refresh": { de: "Aktualisieren", en: "Refresh" },
  "areas.focus.loading": { de: "Analyse wird geladen …", en: "Loading analysis…" },
  "areas.field.milestoneDue": { de: "Milestone-Fälligkeitsdatum", en: "Milestone Due" },
  "areas.overdueProjects": { de: "{count} überfällig", en: "{count} overdue" },

  "resources.title": { de: "Ressourcen", en: "Resources" },
  "resources.search": { de: "Ressourcen durchsuchen …", en: "Search resources…" },
  "resources.allAreas": { de: "Alle Bereiche", en: "All areas" },
  "resources.addNote": { de: "Notiz hinzufügen", en: "Add Note" },
  "resources.empty": { de: "Keine Ressourcen gefunden.", en: "No resources found." },
  "resources.hasChildContent": {
    de: "Enthält verschachtelte Inhalte — in Notion öffnen",
    en: "Contains nested content — open in Notion",
  },
  "resources.notConfigured": {
    de: "NOTION_RESOURCES_DB_ID ist nicht gesetzt.",
    en: "NOTION_RESOURCES_DB_ID is not set.",
  },
  "resources.error": {
    de: "Ressourcen konnten nicht geladen werden.",
    en: "Could not load resources.",
  },
  "resources.add.title": { de: "Neue Notiz", en: "New Note" },
  "resources.add.description": {
    de: "Erstellt eine neue Seite in der Notion Ressourcen-Datenbank.",
    en: "Creates a new page in the Notion Resources database.",
  },
  "resources.add.namePlaceholder": { de: "Titel der Notiz", en: "Note title" },
  "resources.add.nameRequired": { de: "Titel ist erforderlich.", en: "Title is required." },
  "resources.add.selectArea": {
    de: "Bereich wählen (optional)",
    en: "Select area (optional)",
  },
  "resources.add.selectType": {
    de: "Typ wählen (optional)",
    en: "Select type (optional)",
  },
  "resources.add.typeLabel": { de: "Typ", en: "Type" },
  "resources.add.body": { de: "Inhalt", en: "Content" },
  "resources.add.bodyPlaceholder": { de: "Notizinhalt …", en: "Note content…" },
  "resources.add.cancel": { de: "Abbrechen", en: "Cancel" },
  "resources.add.submit": { de: "Erstellen", en: "Create" },
  "resources.add.creating": { de: "Wird erstellt …", en: "Creating…" },
  "resources.add.success": { de: "Ressource erstellt.", en: "Resource created." },
  "resources.add.error": { de: "Erstellen fehlgeschlagen.", en: "Failed to create." },

  "resources.filter.allTypes": { de: "Alle Typen", en: "All types" },

  "resources.field.area": { de: "Bereich", en: "Area" },
  "resources.field.type": { de: "Typ", en: "Type" },
  "resources.field.status": { de: "Status", en: "Status" },
  "resources.field.confidence": { de: "Vertrauen", en: "Confidence" },
  "resources.field.tags": { de: "Tags", en: "Tags" },
  "resources.field.source": { de: "Quelle", en: "Source" },
  "resources.field.lastReviewed": { de: "Zuletzt geprüft", en: "Last Reviewed" },
  "resources.field.created": { de: "Erstellt", en: "Created" },

  "resources.col.name": { de: "Name", en: "Name" },
  "resources.col.area": { de: "Bereich", en: "Area" },
  "resources.col.type": { de: "Typ", en: "Type" },
  "resources.col.status": { de: "Status", en: "Status" },
  "resources.col.tags": { de: "Tags", en: "Tags" },
  "resources.col.source": { de: "Quelle", en: "Source" },
  "resources.col.lastReviewed": { de: "Zuletzt geprüft", en: "Last Reviewed" },

  "resources.archive.button": { de: "Archivieren", en: "Archive" },
  "resources.archive.title": { de: "Ressource archivieren", en: "Archive resource" },
  "resources.archive.body": {
    de: "Die Ressource wird als Metadaten-Eintrag nach /04 Archives verschoben und die Original-Notion-Seite in den Papierkorb gelegt (30 Tage wiederherstellbar).",
    en: "The resource is moved to /04 Archives as a metadata entry and the original Notion page is sent to trash (recoverable for 30 days).",
  },
  "resources.archive.reasonLabel": { de: "Grund", en: "Reason" },
  "resources.archive.confirm": { de: "Archivieren", en: "Archive" },
  "resources.archive.cancel": { de: "Abbrechen", en: "Cancel" },
  "resources.archive.success": { de: "Nach /04 Archives verschoben", en: "Archived to /04 Archives" },
  "resources.archive.error": {
    de: "Ressource konnte nicht archiviert werden.",
    en: "Could not archive resource.",
  },

  "google.connect": { de: "Google verbinden", en: "Connect Google" },
  "google.connected.title": {
    de: "Google Kalender verbunden",
    en: "Google Calendar connected",
  },
  "google.connected.body": {
    de: "Business Hub kann jetzt deinen Kalender lesen und Termine schreiben.",
    en: "Business Hub can now read your calendar and write events.",
  },
  "google.connected.back": { de: "Zurück zu Projekten", en: "Back to Projects" },
  "google.error.title": {
    de: "Google-Verbindung fehlgeschlagen",
    en: "Google connection failed",
  },
  "google.error.retry": { de: "Erneut versuchen", en: "Try again" },
} satisfies Record<string, Entry>;

export type TranslationKey = keyof typeof translations;
