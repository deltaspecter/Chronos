import { Download, Share, SquarePlus } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { PageContainer } from '@/components/ui.tsx'
import { manifest } from '@/data/load.ts'
import { useTitle } from '@/lib/useTitle.ts'

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="mt-12 scroll-mt-24">
      <h2 id={`${id}-h`} className="section-title mb-4">
        {title}
      </h2>
      <div className="prose prose-compact">{children}</div>
    </section>
  )
}

export function InfoPage() {
  useTitle('Über CHRONOS')
  return (
    <PageContainer className="pt-8 lg:pt-12 max-w-3xl">
      <p className="eyebrow mb-3">Über CHRONOS</p>
      <h1 className="page-title">Eine Enzyklopädie zum Lesen, Verstehen und Entdecken</h1>
      <p className="lead mt-5">
        CHRONOS ist ein digitales Nachschlagewerk zur Geschichte der Menschheit – von der Urgeschichte bis zur Gegenwart. Es setzt auf ausführliche, belegte Artikel und auf die Verbindungen
        zwischen Ereignissen, Personen, Orten und Entwicklungen. Es gibt keine Quizze, keine Punkte und keine Benachrichtigungen.
      </p>
      <nav className="mt-8 flex flex-wrap gap-2" aria-label="Abschnitte">
        {[
          ['qualitaet', 'Qualität und Prüfstatus'],
          ['kennzeichnung', 'Kennzeichnungen'],
          ['datierung', 'Datierungen'],
          ['periodisierung', 'Zeitgliederung'],
          ['installieren', 'Als App installieren'],
          ['offline', 'Offline'],
          ['datenschutz', 'Datenschutz'],
          ['lizenzen', 'Karten, Bilder, Lizenzen'],
        ].map(([id, label]) => (
          <a key={id} href={`#${id}`} className="chip">
            {label}
          </a>
        ))}
      </nav>

      <Section id="qualitaet" title="Qualität und Prüfstatus">
        <p>
          Historische Zuverlässigkeit hat Vorrang vor Vollständigkeit. CHRONOS wächst deshalb schrittweise: Ein kleinerer, nachvollziehbar belegter Bestand ist wertvoller als eine große Zahl
          oberflächlicher Texte. Bereiche, zu denen noch keine Artikel vorliegen, sind auf den Epochenseiten unter „Im Aufbau“ offen ausgewiesen.
        </p>
        <p>Jeder Artikel trägt einen sichtbaren Prüfstatus:</p>
        <ul>
          <li>
            <strong>Entwurf</strong> – noch nicht vollständig belegt.
          </li>
          <li>
            <strong>Erstfassung</strong> – auf Grundlage der angegebenen Fachliteratur und Quellen redaktionell verfasst; die fachwissenschaftliche Begutachtung steht noch aus.
          </li>
          <li>
            <strong>Redaktionell geprüft</strong> – Angaben und Belege wurden gegengeprüft.
          </li>
          <li>
            <strong>Fachlich begutachtet</strong> – von einer Fachwissenschaftlerin oder einem Fachwissenschaftler durchgesehen.
          </li>
        </ul>
        <p>
          <strong>Transparenzhinweis:</strong> Die derzeit veröffentlichten Erstfassungen wurden mit Unterstützung eines KI-Sprachmodells erarbeitet. Genannt werden ausschließlich real
          existierende Werke und Quellen; Zitate antiker Texte sind als Übersetzung der Redaktion gekennzeichnet. Weil auch sorgfältig erstellte Texte Fehler enthalten können, tragen alle diese
          Artikel den Status „Erstfassung“, bis sie fachlich geprüft sind. Für wissenschaftliche Arbeiten ziehen Sie bitte stets die angegebene Literatur heran.
        </p>
        <p>
          Primärquellen (Zeugnisse aus der behandelten Zeit) und Sekundärliteratur (moderne Forschung) werden in jeder Literaturliste getrennt aufgeführt. Belegziffern im Text führen zu den
          jeweiligen Titeln; bei antiken Autoren nennen wir, wo möglich, Buch und Kapitel.
        </p>
      </Section>

      <Section id="kennzeichnung" title="Kennzeichnungen im Text">
        <p>Farbige Kästen unterscheiden, wie gesichert eine Aussage ist:</p>
        <aside className="callout callout-befund">
          <p className="callout-label">Gesicherter Befund</p>
          <p>In der Forschung allgemein anerkannt und gut belegt.</p>
        </aside>
        <aside className="callout callout-deutung">
          <p className="callout-label">Deutung und Forschungsposition</p>
          <p>Interpretationen, zu denen es in der Wissenschaft unterschiedliche, begründete Positionen gibt.</p>
        </aside>
        <aside className="callout callout-offen">
          <p className="callout-label">Offene Forschungsfrage</p>
          <p>Fragen, die nach derzeitigem Kenntnisstand nicht entschieden werden können.</p>
        </aside>
        <aside className="callout callout-quelle">
          <p className="callout-label">Aus den Quellen</p>
          <p>Was historische Zeugnisse selbst sagen – mit Hinweisen zu ihrer Perspektive.</p>
        </aside>
        <aside className="callout callout-perspektive">
          <p className="callout-label">Perspektive</p>
          <p>Sichtweisen von Gruppen, die in der Überlieferung oft unterrepräsentiert sind.</p>
        </aside>
      </Section>

      <Section id="datierung" title="Datierungen">
        <ul>
          <li>Jahre vor unserer Zeitrechnung werden mit „v. Chr.“ angegeben; ein Jahr 0 gibt es nicht.</li>
          <li>„um“ kennzeichnet ungefähre Angaben, ein Fragezeichen unsichere oder umstrittene Datierungen.</li>
          <li>Für die Tiefenzeit (vor 20.000 v. Chr.) wird „vor … Jahren“ verwendet; die Abweichung zwischen „v. Chr.“ und „vor heute“ ist dort kleiner als die Messunsicherheit.</li>
          <li>Neuzeitliche Daten folgen dem gregorianischen Kalender. Antike römische Tagesdaten folgen der Überlieferung im damaligen Kalender, der vor Caesars Reform vom Sonnenjahr abwich.</li>
        </ul>
      </Section>

      <Section id="periodisierung" title="Zeitgliederung ohne europäische Einheitsschablone">
        <p>
          Begriffe wie „Antike“, „Mittelalter“ und „Neuzeit“ stammen aus der europäischen Geschichtsschreibung. CHRONOS verwendet breite Zeitabschnitte als Orientierung und behält innerhalb
          dieser Abschnitte die regionalen Periodisierungen bei – etwa Dynastien in China, die Horizonte des Andenraums oder die Epochen Mesoamerikas. Hinweise zur jeweiligen Gliederung stehen
          auf jeder Epochenseite.
        </p>
      </Section>

      <Section id="installieren" title="Als App installieren">
        <p>
          <strong>iPhone und iPad (Safari):</strong>
        </p>
        <ol>
          <li>CHRONOS in Safari öffnen (die Installation funktioniert nur über eine sichere https-Adresse).</li>
          <li>
            Unten in der Leiste auf <Share size={15} className="inline align-[-2px]" aria-label="Teilen" /> „Teilen“ tippen (auf dem iPad oben rechts).
          </li>
          <li>
            Nach unten scrollen und <SquarePlus size={15} className="inline align-[-2px]" aria-hidden /> „Zum Home-Bildschirm“ wählen.
          </li>
          <li>Den Namen „CHRONOS“ bestätigen und auf „Hinzufügen“ tippen.</li>
        </ol>
        <p>
          CHRONOS startet dann wie eine eigene App im Vollbild, ohne Adressleiste. Hinweis: Auf dem iPhone verwaltet die installierte App ihren eigenen Speicher – Lesezeichen und
          Offline-Artikel aus Safari werden nicht automatisch übernommen. Nutzen Sie bei Bedarf Export und Import in den <Link to="/einstellungen">Einstellungen</Link>.
        </p>
        <p>
          <strong>Android (Chrome):</strong> Menü <span aria-hidden>⋮</span> → „App installieren“ bzw. „Zum Startbildschirm hinzufügen“.
        </p>
        <p>
          <strong>Computer (Chrome, Edge):</strong> In der Adressleiste auf das Installationssymbol <Download size={15} className="inline align-[-2px]" aria-hidden /> klicken.
        </p>
      </Section>

      <Section id="offline" title="Offline lesen">
        <p>
          Nach dem ersten Besuch speichert CHRONOS die App selbst sowie Epochen, Themen, Verzeichnisse, den Suchindex, die Zeitleiste und die Kartengrundlagen auf dem Gerät (zusammen wenige
          Megabyte). Artikeltexte werden bewusst nicht vollständig vorab geladen: Speichern Sie einzelne Artikel über das Wolken-Symbol im Artikelkopf. Gespeicherte Artikel werden bei der
          nächsten Verbindung automatisch auf den neuesten Stand gebracht; die zuletzt gelesenen Artikel bleiben zusätzlich vorübergehend verfügbar.
        </p>
        <p>
          Neue Versionen der App werden im Hintergrund geladen und nach einem Hinweis mit „Neu laden“ übernommen – so wird nie mitten im Lesen etwas ausgetauscht, und veraltete Fassungen bleiben
          nicht dauerhaft hängen.
        </p>
      </Section>

      <Section id="datenschutz" title="Datenschutz">
        <p>
          CHRONOS setzt keine Cookies, verwendet keine Analyse- oder Werbedienste und lädt keine Inhalte von fremden Servern; auch die Schriften werden mit der App ausgeliefert. Lesezeichen,
          Notizen, Verlauf und Einstellungen werden ausschließlich im Speicher Ihres Browsers abgelegt und nie übertragen. Sie können diese Daten in den <Link to="/einstellungen">Einstellungen</Link>{' '}
          exportieren oder löschen. Externe Links (etwa zu Museen und Datenbanken) sind gekennzeichnet und öffnen sich in einem neuen Fenster.
        </p>
      </Section>

      <Section id="lizenzen" title="Karten, Bilder und Lizenzen">
        <ul>
          <li>
            Kartengrundlage: <a href="https://www.naturalearthdata.com/">Natural Earth</a> (gemeinfrei), aufbereitet durch das Projekt world-atlas.
          </li>
          <li>
            Historische Grenzen im Atlas sind grob vereinfachte, schematische Rekonstruktionen für einen Stichzeitpunkt und als solche gekennzeichnet. Routen werden über ihre Hauptstationen
            dargestellt, nicht als exakter Wegverlauf.
          </li>
          <li>Abbildungen stammen aus Wikimedia Commons; Urheber und Lizenz stehen unter jedem Bild. Rekonstruktionen und Modelle sind ausdrücklich markiert.</li>
          <li>Schriften: Cormorant Garamond, Source Serif 4 und Inter (SIL Open Font License).</li>
        </ul>
        <p className="text-sm muted">
          Datenstand {new Date(manifest.generated).toLocaleDateString('de-DE')} · {manifest.counts.articles} Artikel · {manifest.counts.sources} Quellen und Titel.
        </p>
      </Section>
    </PageContainer>
  )
}
