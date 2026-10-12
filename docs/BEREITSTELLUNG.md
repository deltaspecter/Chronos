# Bereitstellung und Installation

CHRONOS ist nach dem Build eine rein **statische Website** im Ordner `dist/`. Es gibt keinen Server-Code, keine Datenbank und keine API-Schlüssel. Jeder Hoster, der statische Dateien über **HTTPS** ausliefert und eigene Header erlaubt, ist geeignet.

## 1. Lokal ausführen

Voraussetzung: Node.js ab 22.18.

```bash
npm install
npm run dev        # Entwicklung mit Hot Reload → http://localhost:5173
npm run build      # Produktions-Build nach dist/
npm run preview    # dist/ mit den Produktions-Headern → http://localhost:4173
```

Vor jeder Veröffentlichung:

```bash
npm run check      # Inhalte prüfen, Typprüfung, Unit- und Inhaltstests
npm run build
npm run test:e2e   # Browser-Rauchtest: Seiten, CSP, Service Worker, Offline
```

`npm run build` bricht ab, wenn Inhalte fehlerhaft sind (ungültige Verweise, fehlende Quellen, Schemafehler). Damit gelangen keine kaputten Inhalte online.

## 2. Anforderungen an den Hoster

| Anforderung | Warum |
|---|---|
| **HTTPS** | Service Worker und „Zum Home-Bildschirm“ funktionieren nur über HTTPS (oder `localhost`). |
| **SPA-Fallback**: unbekannte Pfade → `/index.html` mit Status 200 | Artikeladressen wie `/artikel/julius-caesar` existieren nicht als Datei. |
| **Kein Fallback** für `/assets/*`, `/data/*`, `/media/*` | Fehlende Dateien müssen 404 liefern, nicht die HTML-Seite. Die meisten Hoster tun das automatisch, weil diese Dateien existieren. |
| `Cache-Control: no-cache` für `/sw.js`, `/index.html`, `/manifest.webmanifest`, `/theme-init.js` | Damit Updates sofort erkannt werden. |
| `Cache-Control: public, max-age=31536000, immutable` für `/assets/*` und `/data/*` | Diese Dateien tragen einen Inhalts-Hash im Namen und ändern sich nie. |
| Sicherheits-Header (CSP usw.) | Siehe `public/_headers`. Die CSP erlaubt nur eigene Skripte, keine externen Quellen. |

Die maßgebliche Header-Liste steht in **`public/_headers`**. `npm run preview` (`scripts/serve-dist.ts`) wendet genau diese Regeln an, sodass das lokale Verhalten dem Online-Betrieb entspricht.

## 3. Hosting-Varianten

### Render (Blueprint liegt bei)

1. Repository bei GitHub o. Ä. ablegen.
2. In Render **New → Blueprint** wählen und das Repository verbinden.
3. Render liest `render.yaml`: Build `npm ci && npm run build`, Ausgabe `dist/`, Header und SPA-Rewrite sind dort hinterlegt.
4. HTTPS wird automatisch eingerichtet; eine eigene Domain lässt sich unter *Settings → Custom Domains* hinzufügen.

### Netlify oder Cloudflare Pages

- Build-Befehl: `npm run build`
- Ausgabeordner: `dist`
- Node-Version: 22 (z. B. Umgebungsvariable `NODE_VERSION=22`)

`public/_headers` und `public/_redirects` werden beim Build nach `dist/` kopiert und von beiden Diensten automatisch ausgewertet.

### Eigener Server (nginx)

```nginx
server {
    listen 443 ssl http2;
    server_name chronos.example.org;
    root /var/www/chronos/dist;

    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; manifest-src 'self'; worker-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" always;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;
    add_header Strict-Transport-Security "max-age=31536000" always;

    location = /sw.js                { add_header Cache-Control "no-cache"; try_files $uri =404; }
    location = /manifest.webmanifest { add_header Cache-Control "no-cache"; try_files $uri =404; }
    location = /theme-init.js        { add_header Cache-Control "no-cache"; try_files $uri =404; }
    location ~ ^/(assets|data)/      { add_header Cache-Control "public, max-age=31536000, immutable"; try_files $uri =404; }
    location /media/                 { add_header Cache-Control "public, max-age=604800"; try_files $uri =404; }

    location / {
        add_header Cache-Control "no-cache";
        try_files $uri /index.html;
    }
}
```

Hinweis: In nginx ersetzen `add_header`-Angaben in einem `location`-Block die Angaben der übergeordneten Ebene. Wer die Sicherheits-Header überall braucht, setzt sie per `include` in jeden Block.

### Andere Hoster (GitHub Pages u. a.)

Wenn keine eigenen Header und kein SPA-Fallback möglich sind, funktioniert die App eingeschränkt: Direkt aufgerufene Unterseiten liefern 404, und ohne `no-cache` für `sw.js` kommen Updates verzögert an. Solche Hoster sind daher nicht empfohlen.

## 4. Updates und Versionierung

- Jeder Build erzeugt eine neue Datenversion. Die Liste der Datendateien (mit Hash) ist in das App-Bundle eingebettet. App und Inhalte passen deshalb immer zusammen; veraltete Mischstände sind ausgeschlossen.
- Der Service Worker hat dieselbe Versionsnummer. Bei einem neuen Deployment erkennt die App die neue Fassung beim nächsten Start, beim Zurückwechseln in die App oder spätestens nach einer Stunde. Ein unaufdringlicher Hinweis „Neue Fassung verfügbar – Aktualisieren“ erscheint; nichts wird ungefragt neu geladen.
- Nach dem Aktualisieren löscht der Service Worker die Caches der alten Version. Für offline gespeicherte Artikel lädt die App die neue Fassung im Hintergrund nach.
- Persönliche Daten (Lesezeichen, Notizen, Verlauf, Einstellungen) liegen im `localStorage` des Geräts und bleiben bei Updates erhalten. Artikel-IDs und URLs sind stabil; umbenannte Artikel behalten über `formerSlugs` ihre alten Adressen (siehe [INHALTE.md](INHALTE.md)).

## 5. Installation auf Geräten

### iPhone und iPad (Safari)

1. Die **https**-Adresse von CHRONOS in **Safari** öffnen. Unter iOS 16.4 und neuer geht das auch aus anderen Browsern über deren Teilen-Menü, Safari ist aber der zuverlässigste Weg.
2. Unten (iPad: oben rechts) auf **Teilen** tippen, das Quadrat mit dem Pfeil nach oben.
3. Im Menü nach unten scrollen und **„Zum Home-Bildschirm“** wählen. Fehlt der Eintrag, über „Aktionen bearbeiten“ hinzufügen.
4. Den Namen bei Bedarf anpassen und auf **„Hinzufügen“** tippen.

CHRONOS erscheint mit eigenem Symbol auf dem Home-Bildschirm und startet ohne Browserleiste im Vollbild. Gut zu wissen:

- Die installierte App hat **eigene, von Safari getrennte Daten**. Lesezeichen und Notizen aus dem Browser lassen sich unter *Einstellungen → Daten exportieren* sichern und in der App importieren.
- iOS kann Website-Daten von Web-Apps löschen, die mehrere Wochen nicht geöffnet wurden. Unter *Einstellungen* lässt sich dauerhafter Speicher anfordern; regelmäßiges Exportieren der eigenen Notizen ist trotzdem ratsam.
- Offline gespeicherte Artikel sind auf höchstens 200 begrenzt. Der belegte Speicher steht unter *Bibliothek → Offline*.

### Android (Chrome, Edge, Samsung Internet)

Die Adresse öffnen und im Browsermenü **„App installieren“** bzw. **„Zum Startbildschirm hinzufügen“** wählen. Chrome bietet die Installation oft selbst in der Adressleiste an.

### Desktop (Chrome, Edge)

In der Adressleiste auf das Installationssymbol (Monitor mit Pfeil) klicken oder im Menü **„CHRONOS installieren“** wählen. Unter macOS mit Safari ab Version 17: *Ablage → Zum Dock hinzufügen*. Firefox installiert keine Web-Apps, CHRONOS funktioniert dort aber vollständig im Browser, auch offline.

## 6. Fehlersuche

| Problem | Ursache und Lösung |
|---|---|
| „Zum Home-Bildschirm“ startet nur eine Browserseite | Seite wurde über `http://` statt `https://` geöffnet. |
| Unterseite liefert nach dem Neuladen 404 | SPA-Fallback fehlt (siehe Abschnitt 2). |
| Neue Inhalte erscheinen nicht | `sw.js` oder `index.html` werden gecacht. Header prüfen: `curl -I https://…/sw.js` muss `Cache-Control: no-cache` zeigen. |
| Seite bleibt weiß, Konsole meldet CSP-Fehler | Ein Hoster oder CDN fügt eigene Skripte ein (Analytics, „Rocket Loader“ o. Ä.). Diese Funktion abschalten. |
| Offline fehlen Artikel | Nur zuletzt gelesene und ausdrücklich gespeicherte Artikel sind offline verfügbar. Der Status steht im Artikel und unter *Bibliothek → Offline*. |
