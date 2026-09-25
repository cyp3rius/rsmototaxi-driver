# Handoff: RS Moto Taxi Driver (PWA kierowcy)

Aplikacja: `crm.rsmotoconcierge.pl/driver` · PWA instalowana na ekranie początkowym, głównie iPhone / Safari · tryb jasny i ciemny (za systemem).

## O plikach w paczce
Pliki `.dc.html` to **referencje projektowe w HTML**: prototypy pokazujące wygląd i zachowanie. To nie jest kod produkcyjny do skopiowania. Zadanie: odtworzyć te ekrany w docelowym stacku projektu (istniejące komponenty, routing, stan, API). Jeśli repo nie ma jeszcze frontu PWA, sugerowany stack to React + TypeScript + Vite, CSS variables na tokeny, `lucide-react` na ikony.

Pełna specyfikacja funkcjonalna (stany, reguły biznesowe, dane): **`SPEC.md`**. Ten README opisuje warstwę wizualną i interakcje ustalone w projekcie. Przy konflikcie obowiązują decyzje z tego README (są nowsze).

Podgląd: otwórz `RS Driver Kompletny.dc.html` w przeglądarce przez lokalny serwer (np. `npx serve .`). Wszystkie ekrany są ułożone w kolejności przepływu, każdy w trybie jasnym i ciemnym.

## Fidelity
**High-fidelity.** Kolory, typografia, odstępy, promienie, copy i animacje są finalne. Odtwarzać 1:1. Teksty po polsku są finalne i nie należy ich zmieniać.

## Pliki
- `RS Driver Kompletny.dc.html`: plansza zbiorcza (tokeny, wszystkie ekrany i stany, arkusz komponentów, rozmiary SE / Pro Max). Tablica `sections` w skrypcie na dole mapuje każdą ramkę na `screen` + `state`.
- `DriverScreen.dc.html`: powitanie, logowanie, pomoc, sekwencje ładowania, dashboard (stany A/A2/B/C/D), banery, start/koniec zmiany, blokada aktualizacji, arkusz komponentów.
- `DriverFlows.dc.html`: instalacja, splash, błędy ładowania, zmiany, kursy, nowy kurs, szczegóły kursu, paragon, koszty, wypłaty.
- `support.js`: runtime podglądu (tylko do otwierania plików, nie przenosić).
- `assets/`: logo i zdjęcia (patrz Assets).
- `SPEC.md`: specyfikacja UI v0.6 od klienta.

## Design tokens (Kierunek A, neutralne premium)
Kolor aut pojawia się tylko na zdjęciach. UI jest neutralne, akcent szampański/brązowy.

| Token | Jasny | Ciemny |
|---|---|---|
| bg.base | #F5F7F9 | #020407 |
| bg.surface | #FFFFFF | #0B1016 |
| bg.surfaceRaised | #EDF0F3 | #141B23 |
| text.primary | #0A0F14 | #F2F4F6 |
| text.secondary | #5B6570 | #98A2AD |
| text.tertiary (tylko placeholdery) | #8A939C | #5F6873 |
| separator | #DDE2E7 | #1D2630 |
| accent.primary | #8A6A30 | #D8B878 |
| accent.onPrimary | #FFFFFF | #020407 |
| status.success | #1E7A4C | #4CC38A |
| status.warning | #9A5B00 | #F0A93B |
| status.danger | #B3261E | #FF6B61 |

`theme-color`: #020407. Wszystkie pary tekst/tło spełniają WCAG AA 4,5:1 (poza text.tertiary, używanym wyłącznie na placeholdery). Tła tintowane: `color-mix(in srgb, var(--accent) 12–14%, var(--surface))` dla wyróżnień i chipów akcentu, analogicznie dla statusów.

Na zdjęciu powitalnym zawsze ciemny scrim, a tekst jest biały w obu trybach.

### Typografia
- **Nagłówki i liczby:** Archivo (Google Fonts, zmienna oś `wdth`), weight 600, `font-stretch` 112–125%. Liczby `font-variant-numeric: tabular-nums`.
  - Powitanie „Witaj, Sławek”: 48px, stretch 125%, lh 1.05
  - Godziny / liczniki: 56px, stretch 112%, lh 1
  - Tablica rejestracyjna: 28px, stretch 112%, letter-spacing .04em
  - Kwota wypłaty: Archivo szeroki w kolorze akcentu
- **Treść:** font systemowy `-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif`.
  - Body 17/24
  - Etykiety, chipy, nawigacja 15/20: **minimum w całej aplikacji**
  - Przycisk główny 18px / 600
- Rozmiary w `rem` od bazy `-apple-system-body` (`font: -apple-system-body` na `html`), żeby tekst skalował się z ustawieniem iOS.

### Odstępy (skala 4 / 8 / 12 / 16 / 20 / 24)
- Boki ekranu 20px; bottom sheety 24px (tytuł i treść na tej samej krawędzi)
- Karty w listach i na dashboardzie: gap 12px; nowa grupa sekcji 24px
- Nagłówek ekranu → treść 12px; tytuł sheetu → podtytuł 6px
- Formularz: etykieta → pole 8px, pole → kolejna etykieta 16px
- Nad przyciskiem głównym zawsze 24px; przycisk drugorzędny pod głównym 8px
- Padding kart: listy (kursy, koszty, zmiany, wypłaty) 16px; karty główne i podsumowania 20px
- Wiersze z ikoną (np. „Dodaj paragon”): min-height 56, padding 12px 16px, gap 12

### Rozmiary i promienie
- Akcja główna: wysokość 64, kapsuła (radius 999)
- Akcje w pracy, pola formularzy: 56
- Promienie: sheet 32 (górne rogi), karta główna 22, karty list 18–20, pole 14, chip 10, przyciski zawsze kapsuła
- Dolna nawigacja: 64 + safe area; 5 zakładek: Start, Kursy, Koszty, Wypłaty, Zmiany
- Pasek akcji u dołu (formularze, suwaki): padding 12px 20px, bottom = safe area + 4, border-top separator, tło bg.base
- Safe area: używać `env(safe-area-inset-*)` (w makietach top 54, bottom 34 na 390×844)
- Nieaktywny przycisk: opacity .38

### Ikony
Lucide (outline, stroke 2, `currentColor`, 20–24px w UI, 18px w chipach). Typ „Inny” (koszt, kurs) = `ellipsis` (trzy poziome kropki). W makietach ikony są wklejone jako SVG w stylu Lucide; w kodzie użyj `lucide-react`.

## Ekrany
Numery odpowiadają rozdziałom w `SPEC.md`.

1. **Instalacja (5.00):** Safari: instrukcja z podświetlonym przyciskiem Udostępnij. Android/Chrome: jeden przycisk instalacji. Nie pokazujemy, gdy aplikacja działa w trybie standalone.
2. **Splash (5.0):** identyczny z pierwszą klatką powitania, bez mrugnięcia.
3. **Powitanie (5.1):** pełnoekranowe zdjęcie floty + scrim, logo, hasło, CTA „Zaloguj się”. Ruch:
   - Ken Burns: scale 1.00 → 1.06 przez 14s, ease-in-out, tam i z powrotem (cykl 28s), origin na reflektorach
   - Reflektory: zapłon po 0,7s (krótkie mignięcie 0,7–1,4s), potem „oddech” opacity .82 ± .18 (sinus, okres ~4,4s), `mix-blend-mode: screen`
   - Wejście treści (ease-out cubic, translateY 12 → 0 + fade): logo 0–400ms, hasło 150–650ms, przyciski 300–800ms
   - `prefers-reduced-motion`: bez zoomu i reflektorów
4. **Logowanie (5.2):** bottom sheet nad rozmytym zdjęciem (blur 10px, brightness .55). E-mail + hasło w prawdziwym `<form>` (`autocomplete="username"` / `"current-password"`, dla Pęku kluczy). Stany: pusty (przycisk nieaktywny), wypełniony, ładowanie (spinner), błąd (obramowanie danger + komunikat pod polem + krótki shake sheetu), brak sieci. Bez resetu hasła i biometrii. „Problem z logowaniem?” otwiera sheet kontaktu z koordynatorem. iPhone SE: sheet na pełną wysokość, „Zaloguj się” widoczne bez przewijania.
5. **Ładowanie i „Witaj, Sławek” (5.3–5.4):** dwie koncepcje w pliku (A: linia trasy Zabierzów → Balice rysuje się 200–1500ms, poświata, powitanie, przy ~4,5s skaluje się do nagłówka dashboardu; B: powitanie od razu, linia postępu z realnym ładowaniem, tablica auta przelatuje do karty zmiany). **Do potwierdzenia z klientem, którą wdrażamy.** Stany błędów: ładowanie > 15s (ponów) i offline bez cache.
6. **Dashboard (5.5):** stany A (brak zmiany na dziś), A2 (brak wolnego pojazdu), B (zmiana zaplanowana), C (na zmianie), D (zmiana zakończona). Stan zmiany zawsze w nagłówku i steruje akcją główną 64px. Na zmianie bohaterem jest najbliższy kurs (godzina, lot, adres, tabliczka), a licznik zmiany jest cienkim paskiem nad nim.
7. **Banery systemowe:** jeden duży baner, reszta jako chipy pod nagłówkiem. Priorytet: nowa wersja (blokuje aplikację, osobny ekran) → podgląd operatora (akcje wyszarzone) → kurs live w trakcie → brak lokalizacji → brak powiadomień → offline z cache → zmiany do synchronizacji.
8. **Zmiany (5.6):** start zaplanowanej zmiany (przypisane auto ze zdjęciem, potwierdzenie jednym tapnięciem, „Wybierz inne auto”); start ad hoc (wybrane auto jako duża karta, pozostałe w krótkiej liście, zajęte w jednej linijce); zakończenie z podsumowaniem i listą kursów bez paragonu (informacja, nie blokuje); lista zmian z trwającą na górze; toast „Zmiana rozpoczęta · {tablica}”. Nazwa auta w UI: marka i model, np. „Toyota Corolla”.
9. **Kursy (5.10):** Dziś: zaplanowane rosnąco, zakończone malejąco. Chip filtra „Brak paragonu” z licznikiem przełącza na wszystkie kursy bez paragonu, grupowane po dniach. Po zapisie kursu wewnętrznego: toast „Kurs zapisany. Czeka na autoryzację.” i znacznik synchronizacji na karcie.
10. **Nowy kurs (5.7–5.8):** wybór trybu. Kurs live wyróżniony akcentem tylko na zmianie; poza zmianą bramka „Rozpocznij zmianę”. Dwa kroki z paskiem 1/2, 2/2.
    - Krok 1: trasa (autouzupełnianie adresów) i czasy. Walidacja pod polem czasu z godzinami zmian; poza zmianą przycisk „Dalej: szczegóły kursu” jest nieaktywny.
    - Krok 2: **typ kursu i płatność jako kafelki z ikoną, identyczne wizualnie z typem kosztu**. CTA „Zapisz kurs”.
    - Nowy klient: przełącznik Osoba / Firma. **Telefon wymagany zawsze.** Osoba: imię i nazwisko opcjonalne. Firma: **NIP wymagany**, nazwa opcjonalna. Nie pobieramy danych po NIP, bo robi to CRM.
11. **Szczegóły kursu (5.7):**
    - Live w trakcie: bez dolnej nawigacji; licznik, adres z GPS, suwak „Przesuń, aby zakończyć”.
    - Zaplanowany: przy przedpłacie online edytowalny tylko dystans. Na zmianie suwak „Przesuń, aby rozpocząć”, poza zmianą przycisk „Rozpocznij zmianę, żeby ruszyć”. W trakcie: „Przesuń, aby zakończyć”. Wiersz „Dodaj paragon / Dodanie paragonu oznaczy kurs jako zakończony”.
    - Zakończony: tylko do odczytu, poza dodaniem paragonu.
    - Z platformy (Bolt): neutralny znacznik, edycja zablokowana.
12. **Paragon (5.9):** sheet z dwoma wejściami: „Zrób zdjęcie” (`<input type="file" accept="image/*" capture="environment">`) i „Wybierz plik” (obraz lub PDF). Potem podgląd, status rozpoznania (przetwarzanie → do sprawdzenia) i edytowalny numer dokumentu. Ten sam sheet dla kursów i kosztów.
13. **Koszty (5.11):** lista z sortowaniem; na karcie status paragonu i synchronizacji. Nowy koszt na jednym ekranie: kafelki typu z ikonami (Inny = `ellipsis`), duża kwota brutto, VAT opcjonalny, paragon wymagany. Usuwanie z potwierdzeniem (sheet, przycisk danger 56).
14. **Wypłaty (5.12):** zakładki miesięczne / tygodniowe. Miesięczne to wypłata, tygodniowe mają charakter kontrolny; kierowca tylko przegląda. Kwota w akcencie (Archivo szeroki), rozbicie jako prosta lista, bez wykresów. Szczegóły tygodnia i miesiąca.

Arkusz komponentów (sekcja „Arkusz komponentów” w pliku zbiorczym): przyciski we wszystkich stanach, pola, chipy statusów, karta kursu, tablica rejestracyjna, bottom sheet, toast, bottom nav, skala typografii. Najlepiej od niego zacząć bibliotekę komponentów.

## Interakcje i zachowanie
- Hover nie ma zastosowania (dotyk). Stan pressed: lekkie przyciemnienie / scale .98, 100–150ms.
- Suwaki „Przesuń, aby…”: pełna szerokość, 64px, kapsuła; akcja po dociągnięciu do końca, w przeciwnym razie powrót ze sprężyną.
- Bottom sheety wjeżdżają od dołu z przyciemnieniem tła; zamknięcie gestem w dół lub tapnięciem w tło.
- Toasty nad dolną nawigacją, ok. 3s.
- Tryb podglądu operatora (impersonation): wszystkie akcje wyszarzone i nieaktywne.
- Offline: praca na cache, zmiany w kolejce z chipem „do synchronizacji” na elementach i banerem.
- Spinner: obrót 360°, 0,8–1s linear. Pulsujący punkt „na żywo”: ring box-shadow 0 → 9px, success.

## Stan (minimum)
- sesja kierowcy, stan zmiany (A/A2/B/C/D), przypisane / wybrane auto
- aktywny kurs live, lista kursów dnia, filtr „brak paragonu”
- kolejka offline (kursy, koszty, paragony) + status synchronizacji
- flagi systemowe: nowa wersja, impersonation, GPS, powiadomienia, online
- szczegóły reguł i endpointów: `SPEC.md`

## Assets
- `assets/logo-ink.svg`: logo na jasnym tle; `assets/logo-light.svg`: logo na ciemnym tle / zdjęciu
- `assets/logo-rs-moto-taxi.svg`: oryginalny plik logo od klienta
- `assets/fleet-hero-green.webp`: zdjęcie powitania (używane); `assets/fleet-hero-violet.webp`: wariant alternatywny
- Fonty: Archivo z Google Fonts (`family=Archivo:wdth,wght@62..125,100..900`), treść systemowa
- Ikony: `lucide-react`
