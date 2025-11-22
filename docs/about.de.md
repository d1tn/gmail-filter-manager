# Gmail Filter Manager
Gmail Filter Manager ist eine Chrome-Erweiterung, mit der Sie Gmail-Filter visuell verwalten können. Sie ermöglicht eine intuitivere und schnellere Erstellung und Bearbeitung von Filtern als die standardmäßige Gmail-Oberfläche.

## Was ist dieses Tool?
- Ein GUI-basiertes Tool, mit dem Sie komplexe Gmail-Filter direkt über die Erweiterung erstellen und verwalten können
- Die Priorität der Filter kann per Drag-and-Drop geändert werden
- Exportieren Sie konfigurierte Filter als XML-Datei und importieren Sie sie in Gmail, um sie anzuwenden  
  - Filter werden **nicht an externe Server gesendet**; sie werden **über die Synchronisierungsfunktion des Browsers mit Ihrem Google-Konto gespeichert und synchronisiert**
- Ihre Einstellungen werden im Browser gespeichert

## Verwendung
### Einen neuen Filter erstellen
1. Klicken Sie im linken Bereich auf die Schaltfläche „＋“.
2. Konfigurieren Sie im rechten Bereich:
   - Filternamen (eine eindeutige Bezeichnung)
   - Bedingungen (Von, An, Betreff, Enthält, Enthält nicht usw.)
   - Aktionen (Posteingang überspringen, Als gelesen markieren, Label hinzufügen usw.)
   - Verwenden Sie „Diese Aktion duplizieren“, um einen weiteren Filter mit denselben Aktionen zu erstellen
3. Fügen Sie mit „+ AND“ mehrere Bedingungen hinzu
4. Fügen Sie mit „+ OR“ weitere Bedingungsgruppen hinzu
5. Änderungen werden automatisch gespeichert

### Filterpriorität ändern
1. Ziehen Sie im linken Bereich das Symbol „≡≡“ eines Filters
2. Verschieben Sie es an die gewünschte Position
3. Änderungen werden automatisch gespeichert

### Filter exportieren
1. Klicken Sie im linken Bereich auf „Filter speichern“
2. Eine XML-Datei wird heruntergeladen

### Filter in Gmail anwenden
1. Bereiten Sie die exportierte XML-Datei vor
2. Öffnen Sie Gmail → Einstellungen (⚙) → Alle Einstellungen anzeigen
3. Wählen Sie die Registerkarte „Filter und blockierte Adressen“
4. Klicken Sie auf „Filter importieren“
5. Wählen Sie die XML-Datei aus und klicken Sie auf „Datei öffnen“
6. Wählen Sie die Filter aus und klicken Sie auf „Filter erstellen“

### Filter importieren
1. Klicken Sie auf „Filter laden“ im linken Bereich
2. Wählen Sie die zu importierende XML-Datei aus
3. Wählen Sie, ob die Filter zusammengeführt oder ersetzt werden sollen

## Hinweise
- Filter werden im Browser gespeichert und können **über das Google-Konto synchronisiert** werden
- Daten werden **nicht an externe Server gesendet**
- Bei vielen komplexen Filtern empfiehlt sich regelmäßiges Exportieren und Sichern

## Fehlerbehebung
- **F: Filter lassen sich nicht importieren**  
  **A:** Überprüfen Sie, ob die XML-Datei im Gmail-kompatiblen Format vorliegt.

- **F: Änderungen werden nicht gespeichert**  
  **A:** Möglicherweise ist der Browser-Speicher voll. Entfernen Sie unnötige Daten oder exportieren Sie Filter als Sicherung.

- **F: Schaltflächen erscheinen nicht in Gmail**  
  **A:** Laden Sie die Seite neu und prüfen Sie, ob die Erweiterung aktiviert ist.

## Feedback & Mitwirkung
Bitte melden Sie Fehler oder Funktionswünsche über GitHub Issues oder das Kontaktformular.  
- GitHub Issues: https://github.com/d1tn/gmail-filter-manager/issues