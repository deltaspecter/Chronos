# Inhalte schreiben und pflegen

CHRONOS trennt Inhalte strikt vom Code. Alles, was historisch „gesagt“ wird, steht in `content/`. Nach jeder Änderung prüft `npm run content:check` den gesamten Bestand; Fehler (fehlende Verweise, unbekannte Quellen, ungültige Daten) verhindern die Veröffentlichung.

## Grundsätze

1. **Nichts erfinden.** Keine erfundenen Quellen, Zitate, bibliografischen Angaben, Zahlen oder Ereignisse. Im Zweifel weglassen oder als offen kennzeichnen.
2. **Belegen.** Jede wesentliche Aussage stützt sich auf die genannte Literatur; Belege stehen im Text (`[@quelle]`), weitere Titel in der Bibliografie.
3. **Unterscheiden.** Gesicherte Befunde, Deutungen und offene Fragen sichtbar trennen (Kästen, siehe unten).
4. **Perspektiven.** Nicht nur Herrscher und Sieger: Unterworfene, Versklavte, Frauen, Minderheiten, außereuropäische Sichtweisen.
5. **Regionale Zeitgliederung.** Keine europäische Einheitsschablone; regionale Periodisierungen verwenden und erklären.
6. **Ehrlich über den Stand.** Jeder Artikel trägt einen Prüfstatus. Lücken werden im Redaktionsplan der Epoche (`planned`) offen ausgewiesen statt mit dünnen Texten gefüllt.
7. **Keine künstliche Länge.** Substanz statt Wiederholung; Gliederung an das Thema anpassen.

## Qualität und Prüfstatus

| Status | Bedeutung | Mindestanforderungen |
|---|---|---|
| `entwurf` | in Arbeit | darf noch unbelegt sein, sollte nicht veröffentlicht werden |
| `erstfassung` | redaktionell verfasst | Literatur und Belege vorhanden; fachliche Begutachtung ausstehend |
| `geprueft` | redaktionell geprüft | Angaben und Belege von einer zweiten Person gegen die Literatur geprüft |
| `begutachtet` | fachlich begutachtet | von einer Fachwissenschaftlerin oder einem Fachwissenschaftler durchgesehen; Name/Datum in `history` |

Der Build lehnt Artikel ohne jeden Beleg ab, sofern sie nicht als `entwurf` markiert sind. Die derzeitigen Artikel sind mit Unterstützung eines KI-Sprachmodells entstanden und deshalb `erstfassung`. Vor einer Hochstufung sollten insbesondere Zahlen, Daten und Zuschreibungen an der Literatur geprüft werden.

**Checkliste für die Prüfung eines Artikels**

- [ ] Stimmen alle Jahreszahlen, Namen und Zahlenangaben mit der angegebenen Literatur überein?
- [ ] Sind wörtliche Zitate aus Quellen korrekt und als Übersetzung gekennzeichnet?
- [ ] Sind umstrittene Punkte als Deutung oder offene Frage markiert und die Positionen fair dargestellt?
- [ ] Sind Stellenangaben (`[@q-polybios, 6,11–18]`) korrekt?
- [ ] Kommen betroffene Gruppen und regionale Perspektiven vor?
- [ ] Sind Abbildungen passend, lizenziert und korrekt beschriftet; sind Rekonstruktionen markiert?

## Einen Artikel anlegen

Datei unter `content/articles/<bereich>/<name>.md`:

```markdown
---
id: punische-kriege            # stabil, nie ändern (wird Teil der URL /artikel/<id>)
slug: punische-kriege          # optional, Standard = id; bei Umbenennung alten Slug in formerSlugs
title: Die Punischen Kriege
subtitle: Rom und Karthago im Kampf um das westliche Mittelmeer (264–146 v. Chr.)
type: ereignis                 # ueberblick | ereignis | person | epoche | thema | ort | staat | kultur
summary: Zwei bis drei Sätze, die den Kern erfassen (erscheinen in Listen, Suche und als Einleitung).
start: "-264"
end: "-146"
spanNote: Optionaler Hinweis zur Datierung oder Abgrenzung.
epochs: [roemische-republik-epoche]   # mindestens eine Epoche
themes: [krieg-militaer]
regions: [mittelmeer, italien]        # mindestens eine Region
aliases: [Punic Wars, Hannibalkrieg]  # Namensvarianten für die Suche
persons: [hannibal]                   # Wissensnetz (Verweise im Text werden automatisch ergänzt)
places: [karthago]
events: [schlacht-von-cannae]
polities: [karthago-staat]
terms: [provinz]
related: [roemische-republik]         # verwandte Artikel
bibliography: [hoyos-2011, q-polybios]  # Literatur zusätzlich zu den Belegen im Text
image: karthago-haefen                # optionales Titelbild (content/media)
series: rom-republik                  # optional: Artikelreihe …
seriesOrder: 2                        # … mit Position (erzeugt „vorheriger/nächster Teil“)
status: erstfassung
version: 1
updated: 2026-10-12
history:                              # optional
  - { version: 1, date: 2026-10-12, note: Erstfassung }
---

Einleitung …

## Historischer Hintergrund
…
```

### Gliederung

Die Abschnitte richten sich nach dem Thema. Bewährt haben sich: Einführung, historischer Hintergrund, chronologischer Ablauf, Ursachen, Beteiligte, politische, gesellschaftliche, wirtschaftliche und religiöse Aspekte, Alltag, regionale Perspektiven, Folgen, historische Bedeutung, Interpretationen der Forschung, Quellenlage und offene Fragen, weiterführende Themen. `##` und `###` erzeugen das Inhaltsverzeichnis; `#` ist dem Titel vorbehalten.

### Markup

| Schreibweise | Wirkung |
|---|---|
| `[[artikel-id]]`, `[[artikel-id\|Linktext]]` | Verweis auf einen Artikel |
| `[[person:id]]`, `[[ort:id]]`, `[[ereignis:id]]`, `[[staat:id]]`, `[[kultur:id]]`, `[[begriff:id]]`, `[[epoche:id]]`, `[[thema:id]]`, `[[quelle:id]]`, `[[route:id]]` | Verweis auf einen Wissensnetz-Eintrag (wird automatisch in die Beziehungen übernommen) |
| `[@quelle-id]`, `[@a; @b, Buch 6]` | nummerierter Beleg, optional mit Stellenangabe |
| `![[medien-id]]` | Abbildung mit Bildunterschrift, Urheber und Lizenz |
| `:::befund Titel` … `:::` | gesicherter Befund |
| `:::deutung Titel` … `:::` | Deutung, Forschungsposition |
| `:::offen Titel` … `:::` | offene Forschungsfrage |
| `:::quelle Titel` … `:::` | Auszug aus oder Hinweis auf eine Primärquelle |
| `:::perspektive Titel` … `:::` | Perspektive unterrepräsentierter Gruppen oder Regionen |
| Tabellen, Listen, *kursiv*, **fett** | normales Markdown |

Wörtliche Zitate aus fremdsprachigen Quellen werden als „(Übersetzung der Redaktion)“ gekennzeichnet, sofern keine veröffentlichte Übersetzung zitiert wird.

## Datierungen

| Schreibweise | Bedeutung | Anzeige |
|---|---|---|
| `"-264"` | Jahr v. Chr. | 264 v. Chr. |
| `"1789-07-14"` | Tagesdatum | 14. Juli 1789 |
| `"-44-03-15"` | Tagesdatum v. Chr. | 15. März 44 v. Chr. |
| `"~-3100"` | ungefähr | um 3100 v. Chr. |
| `"-2600?"` | unsicher/umstritten | 2600 v. Chr. (?) |
| `"~-300000"` | Tiefenzeit | vor ca. 300.000 Jahren |

Immer in Anführungszeichen schreiben. Es gibt kein Jahr 0. Bei Ereignissen zusätzlich `certainty` (`gesichert`, `wahrscheinlich`, `umstritten`, `unsicher`) und bei Bedarf `dateNote` setzen. Neuzeitliche Daten nach gregorianischem Kalender; abweichende Kalender in `dateNote` erläutern.

## Wissensnetz-Einträge

Jede Datei enthält eine Liste. Beispiele:

```yaml
# content/persons/rom.yaml
- id: hannibal
  name: Hannibal
  aliases: [Hannibal Barkas]
  born: "-247"
  died: "~-183"
  roles: [Feldherr]
  summary: Ein bis zwei Sätze.
  regions: [nordafrika, italien]
  themes: [krieg-militaer]
  places: [karthago, cannae]
  related: [scipio-africanus]
  certainty: unsicher           # nur bei unsicherer Historizität (z. B. Sagengestalten)

# content/places/….yaml
- id: cannae
  name: Cannae
  coords: [16.1325, 41.3064]    # [Längengrad, Breitengrad]
  location: ungefaehr           # exakt | ungefaehr | umstritten
  categories: [schlachtfeld]    # stadt, fundstaette, schlachtfeld, kulturzentrum, hauptstadt, heiligtum, hafen, region
  summary: …
  regions: [italien]

# content/events/….yaml
- id: schlacht-von-cannae
  title: Schlacht von Cannae
  date: "-216-08-02"            # oder start/end
  certainty: gesichert
  dateNote: Datum nach dem damaligen römischen Kalender.
  weight: 2                     # 1 = global bedeutsam, 2 = wichtig, 3 = Detail (steuert Zeitskalen)
  kind: schlacht
  summary: …
  regions: [italien]
  places: [cannae]
  persons: [hannibal]
  polities: [roemische-republik, karthago-staat]
```

Weitere Formate: `polities` (Staaten, mit `predecessors`/`successors`), `cultures`, `terms` (Glossar), `routes` (Wegpunkte, `schematic: true`), `territories` (siehe unten), `regions`, `lanes` (Zeitleisten-Spuren), `synonyms`, `series`.

## Quellen und Literatur

```yaml
- id: bringmann-2002            # Konvention: nachname-jahr
  kind: sekundaer               # primaer | edition | sekundaer | institution
  authors: ["Bringmann, Klaus"] # "Nachname, Vorname" – immer in Anführungszeichen
  title: Geschichte der römischen Republik
  subtitle: Von den Anfängen bis Augustus
  place: München
  publisher: C.H. Beck
  year: 2002
```

Aufsätze erhalten `container` (Zeitschrift/Sammelband), `volume` und `pages`. Primärquellen (`q-…`) erhalten `written` (Entstehungszeit) und eine `note` zu Inhalt und Quellenwert. Institutionen und Datenbanken brauchen eine `url`; `node scripts/check-links.ts` prüft die Erreichbarkeit. **Nur Titel aufnehmen, deren Angaben überprüft sind**; im Zweifel unsichere Felder (Auflage, Verlag) weglassen.

## Abbildungen

1. Datei auf Wikimedia Commons auswählen und in `content/media/*.yaml` eintragen (`commons: "File:…"`, Bildunterschrift, Alternativtext, `reconstruction: true` bei Rekonstruktionen und Modellen).
2. `npm run media` ausführen: Das Skript prüft die Lizenz gegen eine Positivliste (gemeinfrei, CC0, CC BY, CC BY-SA), lädt eine verkleinerte Fassung nach `public/media/` und schreibt Urheber und Lizenz in `content/media/_commons.lock.json`.
3. Im Artikel als Titelbild (`image:`) oder im Text (`![[id]]`) verwenden.

Bei Fotografien von Gewaltverbrechen ist besondere Zurückhaltung geboten; Bilder aus Täterperspektive werden nicht ohne Einordnung verwendet.

## Herrschaftsgebiete im Atlas

`content/territories/*.yaml` enthält grob vereinfachte Umrisse zu einem Stichjahr. Pflichtfelder sind `certainty`, `basis` (worauf die Zeichnung beruht) und `note` (was die Darstellung nicht zeigt). Ringe sind Listen von `[Längengrad, Breitengrad]`; die Orientierung wird beim Build vereinheitlicht. Für genauere Grenzen sollten lizenzierte Forschungsdatensätze verwendet und ihre Lizenz geprüft werden (Nennung in `basis`).

## Epochen und Redaktionsplan

Epochen bilden einen Baum (`parent`). Jede Epoche hat einen Einführungstext (`body`), eine Liste der Regionen, für die ihre Gliederung gilt, und optional `spanNote` zur Periodisierung. Unter `planned` stehen geplante, noch nicht verfasste Artikel – sie erscheinen auf der Epochenseite als „Im Aufbau“.

## Massenimport

Größere Bestände lassen sich importieren, indem sie in die obigen Formate umgewandelt werden (ein Skript pro Quelle unter `scripts/`). Der Inhalts-Build prüft anschließend alle Verweise und meldet Dubletten über gleichlautende Namen. Automatisch erzeugte Texte dürfen nicht ungeprüft als `erstfassung` oder höher veröffentlicht werden.
