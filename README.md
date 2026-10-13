# CHRONOS – Enzyklopädie der Menschheitsgeschichte

CHRONOS ist eine quellenbasierte, langfristig erweiterbare Geschichts-Enzyklopädie als **Progressive Web App**. Sie ist zum Lesen, Verstehen, Nachforschen und Entdecken gedacht: ausführliche Artikel mit Belegen, ein Wissensnetz aus Personen, Orten, Ereignissen und Staaten, eine Zeitleiste paralleler Entwicklungen und ein historischer Atlas. Quizze, Punkte, Streaks und Benachrichtigungen gibt es bewusst nicht.

Die App läuft im Browser auf Smartphone, Tablet und Desktop und lässt sich auf dem iPhone wie eine eigene App zum Home-Bildschirm hinzufügen.

## Was die erste Version enthält

| Bereich | Stand |
|---|---|
| **Artikel** | 28 ausführliche Artikel (rund 50.000 Wörter) von der Urgeschichte bis 1990 – mit Afrika, West-, Süd- und Ostasien, Europa und den Amerikas –, darunter eine fünfteilige Reihe zur Römischen Republik |
| **Wissensnetz** | rund 210 Personen, 210 Orte, 280 Ereignisse, 60 Staaten und Reiche, Kulturen, Begriffe, Routen |
| **Quellen** | über 350 Titel, getrennt nach Primärquellen, Editionen, Forschungsliteratur und Institutionen; über 700 Einzelbelege im Text |
| **Epochen** | 47 regional differenzierte Epochen und Teilbereiche mit Einführungstexten und offen ausgewiesenem Redaktionsplan („Im Aufbau“) |
| **Zeitleiste** | Spuren nach Weltregionen, umschaltbare Zeitskala, Filter nach Region und Thema, Kennzeichnung unsicherer Datierungen, Listenansicht für Smartphones |
| **Atlas** | Weltkarte (Natural Earth, offline), Orte nach Kategorien, Routen, fünf schematische Herrschaftsgebiete, Zeitfilter |
| **Suche** | Volltext, Autovervollständigung, Schreibvarianten, Tippfehlertoleranz, Synonyme, Jahres- und Jahrhundertsuche, Filter |
| **Persönlich** | Lesezeichen, Notizen (auch zu Abschnitten), Verlauf, Lesefortschritt, „Weiterlesen“, Export und Import – alles nur auf dem Gerät |
| **Offline** | App, Kerndaten, Suche, Zeitleiste und Atlas offline nutzbar; Artikel gezielt speicherbar; kontrollierte Updates |
| **Abbildungen** | 35 Bilder aus Wikimedia Commons mit automatisch geprüften Lizenzen und Bildnachweisen |

Alle Artikel tragen den Status **„Erstfassung“**: Sie wurden mit Unterstützung eines KI-Sprachmodells auf Grundlage der angegebenen Literatur erarbeitet und sind noch nicht fachwissenschaftlich begutachtet (siehe [docs/INHALTE.md](docs/INHALTE.md#qualität-und-prüfstatus)).

## Schnellstart

Voraussetzung: [Node.js](https://nodejs.org) ab Version 22.18 (führt TypeScript-Skripte direkt aus).

```bash
npm install
npm run dev          # Inhalte bauen und Entwicklungsserver starten → http://localhost:5173
```

Produktionsfassung lokal testen (mit denselben Sicherheits- und Cache-Headern wie online):

```bash
npm run build        # Inhalte prüfen und bauen, Typprüfung, App-Build, Service Worker
npm run preview      # → http://localhost:4173
```

Auf dem Smartphone im selben WLAN: `npm run dev -- --host` und die angezeigte Netzwerkadresse öffnen. Service Worker und Installation funktionieren allerdings nur über `localhost` oder **https**.

## Skripte

| Befehl | Zweck |
|---|---|
| `npm run dev` | Inhalte bauen, Entwicklungsserver mit Hot Reload |
| `npm run content` | Inhalte aus `content/` prüfen und nach `public/data/` schreiben |
| `npm run content:check` | Inhalte nur prüfen (für Redaktion und CI) |
| `npm run build` | Vollständiger Produktions-Build nach `dist/` |
| `npm run preview` | `dist/` mit Produktions-Headern ausliefern |
| `npm test` | Unit- und Inhaltstests (Vitest) |
| `npm run test:e2e` | Browser-Rauchtest des gebauten Produkts inkl. Offline und CSP |
| `npm run check` | Inhalte prüfen und bauen, Typprüfung, Tests (läuft zusammen mit Build und Browsertest auch automatisch bei jedem Push, siehe `.github/workflows/ci.yml`) |
| `npm run media` | Neue Abbildungen von Wikimedia Commons laden (mit Lizenzprüfung) |
| `node scripts/check-links.ts` | Externe Links in den Quellenangaben prüfen |
| `node scripts/render-icons.ts` | App-Icons aus den SVG-Vorlagen erzeugen |

## Projektstruktur

```
content/            Redaktionelle Inhalte (die einzige Stelle, an der Geschichte „steht“)
  articles/         Artikel als Markdown mit Front-Matter
  epochs/ themes/   Epochen- und Themenbaum
  persons/ places/ events/ polities/ cultures/ terms/ routes/ territories/
                    Wissensnetz als YAML
  sources/          Quellen und Literatur
  media/            Abbildungen (Liste + Lizenz-Lock-Datei)
  regions/ lanes/ synonyms/ series/
scripts/            Inhalts-Build, Medienimport, Tests, Hilfsskripte
src/
  shared/           Von Build und App gemeinsam genutzt: Typen, Datierungen, Suche, URLs
  data/             Laden und Indizieren der generierten Daten
  pages/            Seiten (Start, Epochen, Artikel, Zeitleiste, Atlas …)
  components/       Wiederverwendbare Bausteine
  store/            Einstellungen und persönliche Bibliothek (localStorage)
  offline/          Service-Worker-Registrierung, Offline-Speicher
sw/                 Vorlage des Service Workers
public/             Statische Dateien (Icons, Manifest, Bilder, Header-Regeln)
docs/               Architektur, Inhaltsleitfaden, Bereitstellung
```

## Dokumentation

- [docs/ARCHITEKTUR.md](docs/ARCHITEKTUR.md) – Entscheidungen, Datenmodell, Offline-Strategie, Skalierung
- [docs/INHALTE.md](docs/INHALTE.md) – Artikel und Einträge schreiben, Markup, Datierungen, Qualitätsregeln
- [docs/BEREITSTELLUNG.md](docs/BEREITSTELLUNG.md) – Veröffentlichung mit HTTPS, Header, iPhone-Installation

## Auf dem iPhone installieren

1. Die veröffentlichte **https**-Adresse in **Safari** öffnen.
2. Auf **Teilen** tippen (Quadrat mit Pfeil nach oben).
3. **„Zum Home-Bildschirm“** wählen und mit **„Hinzufügen“** bestätigen.

CHRONOS startet dann im Vollbild wie eine eigene App. Details, auch zu Android und Desktop: [docs/BEREITSTELLUNG.md](docs/BEREITSTELLUNG.md#installation-auf-geräten).

## Datenschutz

Keine Cookies, kein Tracking, keine externen Server: Schriften und Kartendaten werden mit der App ausgeliefert. Lesezeichen, Notizen, Verlauf und Einstellungen bleiben im Browser des Geräts und lassen sich exportieren oder löschen.

## Lizenzen der Daten

- Kartengrundlage: [Natural Earth](https://www.naturalearthdata.com/) (gemeinfrei) über das npm-Paket `world-atlas`
- Abbildungen: Wikimedia Commons, Lizenz und Urheber je Bild in `content/media/_commons.lock.json` und unter jedem Bild
- Schriften: Cormorant Garamond, Source Serif 4, Inter (SIL Open Font License)
