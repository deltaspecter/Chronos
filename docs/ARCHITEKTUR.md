# CHRONOS – Architektur

Dieses Dokument beschreibt die technischen Entscheidungen hinter CHRONOS, das Datenmodell, die Offline-Strategie und den Weg zu einem Bestand von vielen tausend Artikeln.

## 1. Ausgangslage und Grundentscheidung

Das Repository war zu Projektbeginn leer. Als Stack wurde gewählt:

| Bereich | Wahl | Begründung |
|---|---|---|
| Sprache | TypeScript (strict) | Typisierte Datenmodelle für Build und App, eine Sprache für alles |
| UI | React 19 + React Router | Bewährt, gut wartbar, eigene URLs für jede Seite |
| Build | Vite | Schnell, Code-Splitting (Zeitleiste und Atlas laden erst bei Bedarf) |
| Styling | Tailwind CSS 4 + eigene CSS-Schicht | Design-Tokens für Dunkel/Hell, eigene Lesetypografie |
| Zustand | Zustand mit `persist` | Schlank, speichert Einstellungen und Bibliothek im Gerät |
| Suche | MiniSearch, Index beim Build vorberechnet | Volltext, Präfix, Tippfehler – vollständig offline, ohne Server |
| Karte | d3-geo + topojson + Natural Earth | Keine Kartendienste Dritter, keine API-Schlüssel, gemeinfreie Daten, offline |
| Tests | Vitest, Playwright (Chromium) | Unit-, Inhalts- und Browsertests |

**Statisch zuerst, Datenbank später.** Die Aufgabenstellung nennt Next.js und PostgreSQL als mögliche Grundlage. CHRONOS ist dagegen zunächst als *statische* Web-App mit einem Inhalts-Build gebaut:

- Die Inhalte ändern sich redaktionell, nicht durch Nutzerinteraktion. Eine Datenbank zur Laufzeit bringt dafür keinen Vorteil, aber Betriebsaufwand, Kosten und Angriffsfläche.
- Statische Dateien mit Inhalts-Hash lassen sich perfekt cachen; das macht die Offline-Fähigkeit robust und die App schnell.
- Jede Änderung ist eine Textdatei im Git-Repository: versioniert, prüfbar (Pull Request, Review), mit vollständiger Historie.
- Die App ist ohne jeden Server-Code und ohne externe KI-API vollständig nutzbar.

Die Daten sind so modelliert, dass ein späterer Wechsel zu PostgreSQL (z. B. mit einer redaktionellen Oberfläche) oder zu einer serverseitigen Suche (Meilisearch, PostgreSQL-Volltext) ohne Änderung der App-Seiten möglich ist: Die App liest ausschließlich die generierten JSON-Strukturen aus `src/shared/types.ts`. Ob diese aus Markdown-Dateien oder aus einer Datenbank erzeugt werden, ist für die Oberfläche unerheblich (siehe Abschnitt 6).

## 2. Datenfluss

```
content/  (Markdown + YAML, redaktionell gepflegt, versioniert)
   │
   ▼  scripts/build-content.ts
   │   • Schema-Validierung (zod) – Fehler brechen den Build ab
   │   • Verweise auflösen ([[…]], [@…]) und prüfen
   │   • Beziehungen in beide Richtungen ergänzen (Wissensnetz)
   │   • Dubletten-Warnungen, ungenutzte Quellen
   │   • Suchindex vorberechnen
   ▼
public/data/   manifest.json
               catalog.<hash>.json    Metadaten aller Artikel
               taxonomy.<hash>.json   Epochen, Themen, Regionen, Zeitleisten-Spuren
               entities.<hash>.json   Personen, Orte, Ereignisse, Staaten, Quellen, Medien …
               search.<hash>.json     MiniSearch-Index + Synonyme
               a/<id>.<hash>.json     je Artikel: HTML, Inhaltsverzeichnis, Belege, Beziehungen
   │
   ▼  Vite-Build (bindet das Manifest ein → App- und Datenversion sind identisch)
dist/  + sw.js (Service Worker mit Dateiliste und Versionshash)
```

Die Kerndaten (Katalog, Taxonomie, Wissensnetz, Suchindex) werden beim Start geladen und bleiben im Speicher. Artikeltexte werden einzeln und erst beim Öffnen geladen.

## 3. Datenmodell

Alle Typen stehen in `src/shared/types.ts`, die Validierungsschemata in `scripts/lib/schema.ts`.

| Typ | Datei(en) | Wesentliche Felder |
|---|---|---|
| Artikel | `content/articles/**/*.md` | stabile `id`, `slug` (+ `formerSlugs`), Typ, Zeitraum, Epochen, Themen, Regionen, Beziehungen, Bibliografie, Status, Version, Historie |
| Epoche | `content/epochs/*.yaml` | Hierarchie (`parent`), Zeitraum mit `spanNote`, Geltungsregionen, Einführungstext, Redaktionsplan |
| Thema | `content/themes/*.yaml` | Hierarchie, Einführungstext |
| Region | `content/regions/*.yaml` | Hierarchie (z. B. Nubien ⊂ Nordostafrika ⊂ Afrika), Namensvarianten |
| Person | `content/persons/*.yaml` | Lebensdaten, Rollen, Orte, verwandte Personen, Sicherheit der Historizität |
| Ort | `content/places/*.yaml` | Koordinaten, **Genauigkeit der Lokalisierung**, Kategorien, heutiger Name |
| Ereignis | `content/events/*.yaml` | Datum oder Zeitraum, **Sicherheit der Datierung**, Gewicht (für Zeitskalen), Beteiligte |
| Staat/Reich | `content/polities/*.yaml` | Bestehen, Zentrum, Vorgänger und Nachfolger |
| Herrschaftsgebiet | `content/territories/*.yaml` | Stichjahr, Polygon, **Sicherheit**, Grundlage, Hinweis |
| Route | `content/routes/*.yaml` | Wegpunkte, **schematisch ja/nein** |
| Kultur, Begriff | `content/cultures`, `content/terms` | Glossar und archäologische Kulturen |
| Quelle | `content/sources/*.yaml` | Art (Primärquelle, Edition, Forschung, Institution), bibliografische Angaben |
| Abbildung | `content/media/*.yaml` + Lock-Datei | Commons-Datei, Bildunterschrift, Alternativtext, Rekonstruktion ja/nein, Lizenz |
| Lesezeichen, Notizen, Lesestand, Verlauf, Offline-Liste | `localStorage` (`src/store/library.ts`) | nur auf dem Gerät |

### Datierungen

Historische Daten werden als Zeichenketten erfasst und in eine strukturierte Form übersetzt (`src/shared/dates.ts`): `"-264"`, `"~-3100"` (ungefähr), `"-2600?"` (unsicher), `"1789-07-14"`, `"-44-03-15"`. Intern wird mit astronomischen Jahren gerechnet (1 v. Chr. = 0), damit Dauern über die Zeitenwende stimmen; es gibt kein Jahr 0. Tiefenzeit (vor 20.000 v. Chr.) wird als „vor … Jahren“ angezeigt.

### Stabile Adressen

Jeder Artikel hat eine unveränderliche `id` und einen lesbaren `slug`. `/artikel/<id>` und alle früheren Slugs leiten auf die aktuelle Adresse um, sodass Lesezeichen und externe Links dauerhaft gültig bleiben. Alle anderen Einträge sind über `/person/<id>`, `/ort/<id>`, `/ereignis/<id>` usw. erreichbar (`src/shared/routes.ts`).

### Versionierung

Artikel tragen `version`, `updated` und eine `history`. Die eigentliche Versionsgeschichte liegt im Git-Repository. Jede Artikeldatei im Build hat einen Inhalts-Hash im Namen; geänderte Artikel erhalten automatisch neue URLs.

## 4. Offline-Strategie und Service Worker

Der Service Worker (`sw/service-worker.js`, beim Build zu `dist/sw.js` ergänzt) arbeitet mit vier Speichern:

| Cache | Inhalt | Lebensdauer |
|---|---|---|
| `chronos-shell-<version>` | App-Hülle, Kerndaten, Suchindex, Karte, Schriften (lateinisch) | wird bei jeder neuen Version ersetzt |
| `chronos-recent` | die zuletzt gelesenen Artikel (max. 30) | älteste fallen heraus |
| `chronos-media-recent` | zuletzt angezeigte Bilder (max. 60) | älteste fallen heraus |
| `chronos-offline` | vom Nutzer ausdrücklich gespeicherte Artikel und ihre Bilder | bleibt, bis der Nutzer sie entfernt |

- **Seitenaufrufe:** zuerst Netz (höchstens 4 Sekunden), sonst die gespeicherte App.
- **Dateien mit Hash:** zuerst aus dem Speicher – ihr Inhalt ändert sich nie.
- **Artikel und Bilder:** zuerst aus dem Speicher (offline gespeichert oder kürzlich gelesen), sonst Netz.
- **Updates:** Ein neuer Service Worker wartet, bis die App „Neu laden“ meldet. Beim Aktivieren werden alte App-Hüllen gelöscht. Da das Daten-Manifest in den App-Code eingebunden ist, passen App und Daten immer zusammen – es gibt keinen Zustand, in dem eine alte App neue Daten oder umgekehrt erwartet.
- **Begrenzung:** Höchstens 200 Artikel lassen sich offline speichern; der Speicherverbrauch wird angezeigt (`navigator.storage.estimate()`), dauerhafte Speicherung kann angefragt werden.
- **Aktualität:** Offline gespeicherte Artikel werden beim nächsten Start mit Verbindung automatisch auf die aktuelle Fassung gebracht.
- **Fallback ohne Service Worker:** Die App liest offline gespeicherte Artikel notfalls direkt aus der Cache-API (`src/data/load.ts`).

## 5. Suche

Der Suchindex wird beim Build mit denselben Optionen erzeugt, mit denen die App ihn lädt (`src/shared/search.ts`). Er umfasst Artikel (inkl. Volltext und Zwischenüberschriften), Epochen, Themen, Personen, Orte, Ereignisse, Staaten, Kulturen, Begriffe, Quellen, Routen und Regionen.

- **Normalisierung:** Kleinschreibung, Umlaute, Diakritika, Transliterationsvarianten (ae/ä, ph/f, th/t, c/k am Wortanfang, y/i, j/i) – „Cäsar“ = „Caesar“, „Pompejus“ = „Pompeius“.
- **Namensvarianten:** Jeder Eintrag hat ein `aliases`-Feld, das hoch gewichtet durchsucht wird.
- **Synonyme:** `content/synonyms/*.yaml` (z. B. Shoah ↔ Holocaust, WWI ↔ Erster Weltkrieg).
- **Zeitangaben:** „1789“, „44 v. Chr.“, „3. Jh. v. Chr.“ werden erkannt und als Zeitfilter angewendet.
- **Tippfehler und Präfixe:** unscharfe Suche ab 4 Zeichen, Präfixsuche ab 3 Zeichen.

## 6. Skalierung auf tausende Artikel

Der aktuelle Aufbau trägt problemlos einige hundert bis wenige tausend Artikel. Für deutlich größere Bestände sind diese Schritte vorgesehen – jeweils ohne Änderung der Seitenkomponenten:

1. **Katalog aufteilen:** Statt eines Katalogs pro Epoche bzw. Region eigene Dateien, die bei Bedarf geladen werden.
2. **Suchindex aufteilen oder auslagern:** Ab etwa 10–20 MB Index ein Index pro Epoche, der beim ersten Suchen nachgeladen wird – oder eine serverseitige Suche (Meilisearch, Typesense oder PostgreSQL-Volltext mit `unaccent`), die dieselben Treffertypen zurückgibt. Offline bliebe dann eine Titelsuche verfügbar.
3. **Redaktionssystem:** Inhalte können in PostgreSQL gepflegt und vom Build-Skript exportiert werden; die Schemata in `scripts/lib/schema.ts` dienen dabei als Vertrag. Ein Import vorhandener Markdown-/YAML-Bestände ist direkt möglich.
4. **Bilder:** Responsive Varianten (z. B. 600 und 1200 Pixel) und modernes Format (AVIF/WebP) im Medienimport.

## 7. Sicherheit und Datenschutz

- Strenge Content-Security-Policy (nur eigene Skripte, keine Inline-Skripte), `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS (`public/_headers`, `render.yaml`).
- Artikel-HTML entsteht ausschließlich beim Build aus redaktionell geprüften Dateien des Repositories; Nutzereingaben werden nie als HTML dargestellt (Notizen sind reiner Text).
- Keine Cookies, kein Tracking, keine externen Anfragen zur Laufzeit; Schriften und Karte sind Teil der App.
- Keine API-Schlüssel nötig. Sollten künftig Dienste mit Schlüsseln hinzukommen, gehören diese ausschließlich in serverseitige Umgebungsvariablen, nie in den Client-Code.

## 8. Barrierefreiheit

Sprunglink zum Inhalt, semantische Überschriften und Landmarken, ARIA-Combobox für die Suche, sichtbare Fokusrahmen, ausreichende Kontraste in beiden Themes, skalierbare Schrift (85–150 %), einstellbarer Zeilenabstand, Serifen- oder serifenlose Leseschrift, reduzierte Bewegung (System und Einstellung), Alternativtexte für alle Abbildungen, Textlisten zu Zeitleiste, Atlas und Wissensnetz.

## 9. Tests

- `src/**/*.test.ts`: Datierungen, Normalisierung, Zeitskala
- `scripts/lib/markup.test.ts`: Markup-Renderer (Verweise, Belege, Kästen, Abbildungen)
- `scripts/content.test.ts`: baut den gesamten Inhaltsbestand und prüft Mindeststandards (Umfang, Belege, Regionen, Bildlizenzen) sowie die Suche gegen den echten Index
- `scripts/e2e-smoke.ts`: startet den Produktions-Build mit Produktions-Headern und prüft alle Bereiche in Chromium (Desktop und Smartphone), Lesezeichen-Persistenz, CSP, Cache-Header, Service Worker und Offline-Betrieb
