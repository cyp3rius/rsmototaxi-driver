# RS Moto Taxi Driver: specyfikacja UI (redesign PWA kierowcy)

Wersja 0.6 · wrzesień 2026 · platforma: **PWA** (instalowana na ekranie początkowym), głównie iPhone / Safari, light i dark mode

---

## 0. Kontekst i źródła

**Produkt.** Aplikacja dla kierowców RS Moto Taxi, butikowej usługi przewozu osób z Zabierzowa, pracującej wyłącznie na rezerwacje (transfery Balice, Pyrzowice, Warszawa, kursy lokalne po Małopolsce).

**Odnośniki marki.**
- Strona firmowa: [rsmototaxi.pl](https://rsmototaxi.pl)
- Rezerwacje online: [book.rsmototaxi.pl](https://book.rsmototaxi.pl)

Z tych stron bierzemy trzy rzeczy, które mają być czuć w aplikacji:
1. **Ton:** „Spokój, klasa, przewidywalność”. „Działamy jak jeden kierowca”. Aplikacja ma być cicha, pewna i spójna, nie krzykliwa.
2. **Kolor bazowy:** book.rsmototaxi.pl deklaruje `theme-color: #020407` (granatowa czerń). To nasz kolor kotwiczący.
3. **Realne dane domenowe:** Standard / Van, odbiór z tabliczką, foteliki i podstawki, kierowca anglojęzyczny, numer lotu, dopłata nocna 22:00 do 6:00, płatność PayPal albo u kierowcy (gotówka / karta), rezerwacja min. 24 h wcześniej. Te elementy pojawiają się na dashboardzie.

**Referencje wizualne (wybrane przez klienta, obrazy 15 do 18):**
- UI8, taxi app design (dark)
- Freebiesbug, Free UI Kit for Taxi Booking App
- Taxi / cab booking app UI kit (rider + driver)
- TaxiMode, Taxi Booking Adobe XD UI Kit, Light & Dark Mode

Co z nich przejmujemy: pełna parytetowość light i dark (TaxiMode), karty zleceń na bottom sheecie nad mapą, duże i czytelne CTA, wyraźna hierarchia „najbliższy kurs” ponad listą. Czego **nie** przejmujemy: generycznej palety (żółty taxi, fiolet), ilustracji clipart i przeładowanych ekranów. Nasze wyróżnienie to fotografia własnej floty i jeden dopracowany moment animacji.

## 0.1 Zasoby marki (do użycia w kodzie)

> Dla Cursor: pobierz poniższe pliki do repo (`public/brand/`) zamiast hotlinkować je z rsmototaxi.pl. Skrypt na końcu sekcji.

### Zdjęcia floty

| Podgląd | Plik | Źródło | Proponowane użycie |
|---|---|---|---|
| ![Transfer Balice](https://rsmototaxi.pl/wp-content/uploads/2026/02/AHS_8129-kopia.webp) | `fleet-hero-balice.webp` | [AHS_8129-kopia.webp](https://rsmototaxi.pl/wp-content/uploads/2026/02/AHS_8129-kopia.webp) | **ekran powitalny (5.1), domyślne**; to też og:image strony |
| ![Kraków](https://rsmototaxi.pl/wp-content/uploads/2026/02/taxi_marzec_2025-1-z-1-1.webp) | `fleet-krakow.webp` | [taxi_marzec_2025-1-z-1-1.webp](https://rsmototaxi.pl/wp-content/uploads/2026/02/taxi_marzec_2025-1-z-1-1.webp) | ekran powitalny, wariant alternatywny / tło instalacji (5.00) |
| ![Pyrzowice / Warszawa](https://rsmototaxi.pl/wp-content/uploads/2026/02/taxi-foto-niebieskie-2023-MALE-FOTO_-77.webp) | `fleet-blue.webp` | [taxi-foto-niebieskie-2023-MALE-FOTO_-77.webp](https://rsmototaxi.pl/wp-content/uploads/2026/02/taxi-foto-niebieskie-2023-MALE-FOTO_-77.webp) | wariant nocny / dark mode (do oceny, czy kadr pasuje) |
| ![Kursy lokalne](https://rsmototaxi.pl/wp-content/uploads/2026/02/AHS_8422.webp) | `fleet-local.webp` | [AHS_8422.webp](https://rsmototaxi.pl/wp-content/uploads/2026/02/AHS_8422.webp) | tło podsumowania zmiany (5.6), pusty stan listy kursów |

Wszystkie zdjęcia są poziome, 2048×1363. Na pionowym ekranie powitalnym używamy `object-fit: cover` z `object-position` dobranym per zdjęcie, tak żeby auto zostało w kadrze. Docelowo dedykowana sesja pionowa (patrz sekcja 7).

### Logo i ikony

| Podgląd | Plik | Źródło | Użycie |
|---|---|---|---|
| ![Logo RS Moto Taxi](https://rsmototaxi.pl/wp-content/uploads/2026/03/logo_www2.png) | `logo.png` | [logo_www2.png](https://rsmototaxi.pl/wp-content/uploads/2026/03/logo_www2.png) | tymczasowo: splash, ekran powitalny, nagłówek. **Do podmiany na SVG** |
| ![Favicon](https://rsmototaxi.pl/wp-content/uploads/2026/03/fav.jpg) | `favicon-source.jpg` | [fav.jpg](https://rsmototaxi.pl/wp-content/uploads/2026/03/fav.jpg) | punkt wyjścia do ikony PWA (`apple-touch-icon`, manifest) |

### Strony referencyjne marki

- Strona główna: [rsmototaxi.pl](https://rsmototaxi.pl)
- Rezerwacje (źródło opcji kursu: Standard / Van, tabliczka, foteliki, dopłata nocna, płatność): [book.rsmototaxi.pl](https://book.rsmototaxi.pl)
- Ton i wartości: [O nas](https://rsmototaxi.pl/o-nas/), [Jak działamy](https://rsmototaxi.pl/jak-dzialamy/), [Usługa kierowcy](https://rsmototaxi.pl/usluga-kierowcy/)
- Kontakt (do sheetu „Problem z logowaniem?”): [tel. 508 222 321](tel:+48508222321), [hello@rsmototaxi.pl](mailto:hello@rsmototaxi.pl), [WhatsApp](https://wa.me/48609999823)

### Skrypt pobrania assetów

```bash
mkdir -p public/brand && cd public/brand
curl -L -o fleet-hero-balice.webp "https://rsmototaxi.pl/wp-content/uploads/2026/02/AHS_8129-kopia.webp"
curl -L -o fleet-krakow.webp      "https://rsmototaxi.pl/wp-content/uploads/2026/02/taxi_marzec_2025-1-z-1-1.webp"
curl -L -o fleet-blue.webp        "https://rsmototaxi.pl/wp-content/uploads/2026/02/taxi-foto-niebieskie-2023-MALE-FOTO_-77.webp"
curl -L -o fleet-local.webp       "https://rsmototaxi.pl/wp-content/uploads/2026/02/AHS_8422.webp"
curl -L -o logo.png               "https://rsmototaxi.pl/wp-content/uploads/2026/03/logo_www2.png"
curl -L -o favicon-source.jpg     "https://rsmototaxi.pl/wp-content/uploads/2026/03/fav.jpg"
```

### Inspiracje (z researchu)

- Wheely, aplikacja kierowcy: [App Store: Wheely for Chauffeurs](https://apps.apple.com/us/app/wheely-for-chauffeurs/id1473863611), aplikacja pasażera: [App Store: Wheely](https://apps.apple.com/app/id380732645)
- Koncepcje: [Behance: driver app design](https://www.behance.net/search/projects/driver%20app%20design), [Behance: chauffeur app](https://www.behance.net/search/projects/chauffeur%20app), [Dribbble: taxi driver](https://dribbble.com/tags/taxi-driver)

## 0.2 Stan obecny w kodzie (źródło prawdy dla funkcjonalności)

> Przeanalizowany moduł: `apps/mercato/src/modules/taxi_fleet/` (open-mercato-sandbox). **Ta specyfikacja zmienia warstwę UI. Logika, endpointy, walidacje, statusy i tryb offline zostają bez zmian.** Jeśli coś w dalszej części dokumentu jest sprzeczne z kodem, wygrywa kod, a rozbieżność trzeba zgłosić.

### Stack i miejsca zmian

- Next.js (App Router), React, Tailwind, komponenty `@open-mercato/ui` (shadcn), ikony `lucide-react`, i18n przez `t('taxi_fleet.driverApp.…', 'fallback')`, domyślny język **pl**, drugi **en**.
- **Tokeny wizualne:** `components/driverApp/driverUi.ts` (klasy Tailwind z twardymi hexami, styl „Metronic”, akcent `#1B84FF`). **Tu jest główna zmiana:** hexy zamieniamy na CSS custom properties z sekcji 2.1, nazwy eksportów (`driverCardClass`, `driverPrimaryActionClass` itd.) zostają, żeby nie ruszać stron.
- **Tryb ciemny jest dziś celowo wyłączony:** `components/driverApp/useDriverForcedLightTheme.ts` usuwa klasę `dark`. Wdrożenie dark mode = usunięcie tego hooka + przepięcie `driverUi.ts` na tokeny + sprawdzenie dialogów shadcn w obu trybach.
- **Shell:** `components/driverApp/DriverShell.tsx` (nagłówek, bottom nav, banery GPS / push / aktualizacji / podglądu, status online, live trip banner).
- **Logo:** już jest wektorowe, `public/driver/logo-rs-moto-taxi.svg`, renderowane przez `DriverBrandMark.tsx`. Sekcja 0.1 (PNG ze strony) dotyczy tylko zdjęć.
- **PWA:** manifest `/driver/manifest.webmanifest` (`lib/driverPwaHead.ts`), service worker `public/driver-sw.js`, wersjonowanie `lib/driverAppVersion.ts`, instalacja i wymuszona aktualizacja `useDriverPwa.ts`.

### Mapa ekranów

| Route | Plik | Co robi | Sekcja spec |
|---|---|---|---|
| `/driver/login` | `frontend/driver/login/page.tsx` | e-mail + hasło, `POST /api/auth/login`, wymaga `taxi_fleet.driver`, MFA nieobsługiwane | 5.2 |
| `/driver` | `frontend/driver/page.tsx` | dashboard zmiany (5 stanów, patrz 5.5) | 5.5 |
| `/driver/assignments` | `frontend/driver/assignments/page.tsx` | lista zmian (Wszystkie / Ten tydzień), start i koniec zmiany | 5.6 |
| `/driver/trips` | `frontend/driver/trips/page.tsx` | lista kursów (Wszystkie / Dziś), paginacja | 5.10 |
| `/driver/trips/new` | `frontend/driver/trips/new/page.tsx` | wybór trybu: live / zaplanuj / przeszły, formularz 2-krokowy | 5.7, 5.8 |
| `/driver/trips/live` | `frontend/driver/trips/live/page.tsx` | kurs live w trakcie, zakończenie, potem szczegóły | 5.7 |
| `/driver/trips/[id]` | `frontend/driver/trips/[id]/page.tsx` | szczegóły, cena i dystans, start / koniec kursu zaplanowanego, paragon | 5.7, 5.9 |
| `/driver/expenses` | `frontend/driver/expenses/page.tsx` | lista kosztów, sortowanie, usuwanie | 5.11 |
| `/driver/expenses/new` | `frontend/driver/expenses/new/page.tsx` | nowy koszt z paragonem | 5.11 |
| `/driver/settlements` | `frontend/driver/settlements/page.tsx` | rozliczenia: Miesięczne (wypłata) / Tygodniowe (kontrolne) | 5.12 |
| `/driver/settlements/[id]` | `…/settlements/[id]/page.tsx` | rozliczenie tygodniowe | 5.12 |
| `/driver/monthly-settlements/[id]` | `…/monthly-settlements/[id]/page.tsx` | wypłata miesięczna | 5.12 |

Bottom nav (`DriverShell.tsx`, `NAV`): **Start, Kursy, Koszty, Wypłaty, Zmiany** (5 pozycji).

### Endpointy używane przez aplikację kierowcy

| Endpoint | Metody | Użycie |
|---|---|---|
| `/api/auth/login`, `/api/auth/logout`, `/api/auth/locale` | POST | logowanie, wylogowanie, język |
| `/api/taxi_fleet/driver/me` | GET | profil kierowcy, dzisiejsza zmiana |
| `/api/taxi_fleet/driver/profiles` | GET | profile floty do cache offline (pojazdy, ustawienia) |
| `/api/taxi_fleet/driver/assignments` | GET | lista zmian |
| `/api/taxi_fleet/driver/assignments/start` | POST | start zmiany ad hoc |
| `/api/taxi_fleet/driver/assignments/[id]/shift` | POST | `start` / `end` zmiany zaplanowanej |
| `/api/taxi_fleet/driver/trips`, `/[id]` | GET POST PUT | kursy: lista, tworzenie, zmiany statusu |
| `/api/taxi_fleet/driver/trips/[id]/costs` | POST | koszty przypięte do kursu |
| `/api/taxi_fleet/driver/attachments` | POST | upload paragonu, uruchamia OCR |
| `/api/taxi_fleet/driver/customers` | GET POST | wyszukiwanie i tworzenie klienta (osoba / firma z NIP) |
| `/api/taxi_fleet/driver/expenses` | GET POST DELETE | koszty |
| `/api/taxi_fleet/driver/settlements`, `/[id]`, `/submit` | GET, POST | rozliczenia tygodniowe |
| `/api/taxi_fleet/driver/monthly-settlements`, `/[id]` | GET | wypłaty miesięczne |
| `/api/taxi_fleet/driver/location` | GET POST | pingi GPS w trakcie zmiany (bufor, flush co 30 s) |
| `/api/taxi_fleet/driver/push-subscription` | GET POST DELETE | Web Push (włączany flagą `WEB_PUSH_ENABLED`) |
| `/api/taxi_fleet/driver/communications/ack` | POST | potwierdzenie komunikatów floty |
| `/api/taxi_fleet/driver/impersonation` | POST DELETE | podgląd aplikacji kierowcy przez operatora (read-only) |
| `/api/taxi_fleet/route/distance`, `/reverse-geocode`, `/places-autocomplete` | POST / GET | trasa, adres z GPS, podpowiedzi adresów |
| `/api/taxi_fleet/pricing/quote` | POST | sugerowana cena kursu |
| `/api/attachments/image/…`, `/file/…` | GET | podgląd paragonu |

### Model danych istotny dla UI

- **Zmiana = `assignment`** (`TaxiFleetDailyAssignment`): planowana przez dyspozytora (`planned` → `confirmed` → `completed`, lub `cancelled`) albo **ad hoc** (kierowca startuje sam na pojeździe domyślnym). Pola w UI: `shiftStart`, `shiftEnd`, pojazd (`resourceLabel` / `resourcePlate`), `gpsDistanceKm`. Start zmiany wymaga **potwierdzenia pojazdu**. Start dozwolony w oknie planowany start − 3 h do planowany koniec + 3 h (ustawienia floty). W ciągu dnia może być kilka zmian („Rozpocznij kolejną zmianę”).
- **Kurs, statusy:** `scheduled` → `in_progress` → `completed`. `pending_authorization` dla kursów typu `internal` (kierowca widzi je jako zakończone). `cancelled`.
- **Typy kursu w aplikacji kierowcy:** `client`, `street_hail`, `internal`, `private`, `other`. Typ `platform` (Uber, Bolt) przychodzi z synchronizacji i jest **tylko do odczytu**.

| Typ | Klient | Płatność | Paragon |
|---|---|---|---|
| `client`, `other` | wymagany | tak | **wymagany** |
| `street_hail` | opcjonalny | tak | **wymagany** |
| `private` | nie | nie | **wymagany** |
| `internal` | nie | nie | nie (kurs czeka na autoryzację) |

- **Płatność:** `electronic`, `cash`, `card`, `transfer`, `loyalty_program` (+ `platform_app` tylko z importu). Przedpłata PayPal oznaczana jako „Przedpłata”.
- **Paragon:** jeden załącznik na kurs (`receiptAttachmentId` + numer dokumentu, numer uzupełnia OCR). Statusy dla kierowcy: **Brak paragonu**, **Przetwarzanie** (`pending` / `processing`), **Do sprawdzenia** (`needs_review` / `failed` / ostrzeżenia), **Zweryfikowany** (`applied` / `extracted`). Dodanie paragonu do kursu `scheduled` **automatycznie kończy kurs**. Do zakończonego kursu bez paragonu można go dodać później.
- **Koszty:** `fuel`, `toll`, `parking`, `maintenance`, `other`, kwota brutto, VAT opcjonalny (8 / 23), paragon **wymagany**, OCR jak przy kursach. Wchodzą do rozliczenia tygodniowego.
- **Walidacje, które UI musi komunikować:** kurs live tylko na otwartej zmianie; kurs przeszły musi mieścić się w czasie **przeszłej lub bieżącej zmiany**; kurs planowany tylko w przyszłości; koniec po starcie; brak nakładania się kursów (`tripTimeOverlap`).
- **Offline-first:** mutacje trafiają do outboxu w IndexedDB (`lib/driverOffline/*`), dane z cache z banerem „Dane z pamięci (offline)”, znaczniki synchronizacji na elementach: **Czeka na synchronizację**, **Błąd synchronizacji**, akcja w shellu „Synchronizuj zmiany offline (n)”.

### Funkcje obecne w kodzie, które nowy UI musi zachować

Podgląd read-only przez operatora (impersonation, baner), baner nowej wersji z wymuszoną aktualizacją, przycisk instalacji PWA, banery zgody GPS i powiadomień (z instrukcją dla iPhone'a), baner trwającego kursu live, pull to refresh na listach, sugerowana cena z `pricing/quote`, dystans z ORS i ślad GPS kursu live, autocomplete adresów i „Użyj mojej lokalizacji”, tworzenie klienta w locie (osoba z telefonem / firma z NIP), szczegóły z rezerwacji (lot, foteliki, podstawki, bagaż, meet & greet, kierowca anglojęzyczny, dopłaty nocna i świąteczna, cena bazowa), paginacja list.

---

## 1. Kierunek wizualny

**Koncept: „Nocny transfer na Balice”.** Granatowa czerń kabiny premium o 5 rano, ciepłe światło szampańskie jak podświetlenie wnętrza, jedna cienka linia trasy. Fotografia auta jest bohaterem, UI jest tłem.

Zasady:
1. **Jeden moment wow, reszta dyscypliny.** Efekt „wow” koncentrujemy w sekwencji: powitanie → ładowanie → „Witaj, XXX” → dashboard. Pozostałe ekrany są spokojne i natywne.
2. **Fotografia zamiast ilustracji.** Tylko własne zdjęcia floty RS Moto Taxi. Zero stocków, zero clipartów aut.
3. **Web, który zachowuje się jak natywna aplikacja.** Tryb standalone, pełny ekran pod status barem, systemowy font w treści, natywne kontrolki (date picker, klawiatury). Charakter budujemy szerokim krojem w nagłówkach, światłem i ruchem, nie ozdobnikami.
4. **Kierowca pracuje w aucie.** Każdy element klikalny w trakcie pracy ma min. 56 pt wysokości. Ekrany onboardingu mogą być bardziej „editorialowe”, bo kierowca nie prowadzi.

### 1.1 Ograniczenia platformy PWA

Aplikacja jest PWA, więc część wzorców natywnych zastępujemy webowymi odpowiednikami:

| Natywny wzorzec | W naszej PWA |
|---|---|
| Face ID / Touch ID | brak; długa sesja + autofill z Pęku kluczy iCloud |
| Live Activities, Dynamic Island | brak; stały pasek zmiany + baner kursu live w `DriverShell` + Web Push (już zaimplementowany: przypisanie kursu, przypomnienie T−1 h) |
| Systemowy skaner dokumentów | aparat przez `input capture` + własne przycięcie |
| Haptyka | brak na iOS; feedback wizualny |
| Upload w tle | tylko przy otwartej aplikacji; kolejka w IndexedDB |
| Lokalizacja w tle | brak; tracking GPS zmiany (`useDriverTracking`) działa tylko przy otwartej aplikacji, stąd baner o dostępie do lokalizacji jest ważny |
| Prompt instalacji | ekran instrukcji „Do ekranu początkowego” (5.00) |

---

## 2. Design tokens

Wszystkie kolory definiujemy jako **semantic tokens z dwoma modes** (Figma variables: `Light`, `Dark`; w kodzie: CSS custom properties przełączane przez `@media (prefers-color-scheme: dark)`, plus `color-scheme: light dark` na `:root`, żeby natywne kontrolki i scrollbary też zmieniały tryb). `<meta name="theme-color">` w dwóch wariantach z atrybutem `media`.

### 2.1 Kolory

| Token | Light | Dark | Zastosowanie |
|---|---|---|---|
| `bg.base` | `#F5F7F9` | `#020407` | tło ekranu (dark = theme-color marki) |
| `bg.surface` | `#FFFFFF` | `#0B1016` | karty, bottom sheety |
| `bg.surfaceRaised` | `#EDF0F3` | `#141B23` | pola formularza, karty zagnieżdżone |
| `text.primary` | `#0A0F14` | `#F2F4F6` | tekst główny (w dark celowo nie czysta biel) |
| `text.secondary` | `#5B6570` | `#98A2AD` | opisy, metadane |
| `text.tertiary` | `#8A939C` | `#5F6873` | placeholdery, disabled |
| `accent.primary` | `#8A6A30` (bronze) | `#D8B878` (champagne) | CTA, aktywne stany, linia trasy |
| `accent.onPrimary` | `#FFFFFF` | `#020407` | tekst na przycisku głównym |
| `separator` | `#DDE2E7` | `#1D2630` | linie, obramowania pól |
| `status.success` | `#1E7A4C` | `#4CC38A` | zlecenie potwierdzone, opłacone |
| `status.warning` | `#9A5B00` | `#F0A93B` | dopłata nocna, zmiana godziny |
| `status.error` | `#B3261E` | `#FF6B61` | błędy formularza |
| `scrim.photo` | gradient `#020407` 0% → 85% | gradient `#020407` 0% → 92% | przyciemnienie zdjęć pod tekstem |

Uwagi:
- Akcent ma **dwa warianty celowo**: szampański na jasnym tle ma za niski kontrast, bronze na ciemnym jest matowy. Kontrast tekstu na obu przyciskach sprawdzić na min. 4.5:1 (WCAG AA).
- Kolory marki (logo, strona) **zweryfikować z plikiem logo** przed finalizacją. Jedynym potwierdzonym kolorem jest `#020407`.

### 2.2 Typografia

Dwie role, wyraźnie rozdzielone:
- **Treść i UI: systemowy stack** `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`. Na iPhonie renderuje się SF Pro, na Androidzie Roboto. Zero ładowania, natywne wrażenie.
- **Nagłówki i powitanie: Mona Sans** (open source, SIL OFL, zmienna oś szerokości `wdth` 75 do 125). Używamy szerokości ok. 115 do 125 jako odpowiednika „Expanded”. SF Pro nie może być osadzony jako webfont (licencja Apple), stąd zamiennik. Font self-hostowany, `font-display: swap`, preload tylko jednej wagi.

| Styl | Krój | Rozmiar / line height | Waga | Użycie |
|---|---|---|---|---|
| `display.xl` | Mona Sans, wdth 125 | 40 / 44 | Semibold | „Witaj, XXX”, headline powitania |
| `display.l` | Mona Sans, wdth 115 | 30 / 36 | Semibold | nagłówki ekranów onboardingu |
| `title` | system-ui | 22 / 28 | Semibold | tytuły kart, godzina kursu |
| `body` | system-ui | 17 / 24 | Regular | treść |
| `callout` | system-ui | 15 / 20 | Medium | etykiety pól, metadane |
| `caption` | system-ui | 13 / 18 | Regular | stopki, informacje prawne |
| `numeric` | system-ui, `font-variant-numeric: tabular-nums` | 34 / 40 | Semibold | godziny, kwoty, ETA |

Zasady: sentence case wszędzie (bez ALL CAPS w etykietach), liczby zawsze `tabular-nums`. Rozmiary w `rem`. Bazę ustawiamy przez `font: -apple-system-body` na `html` (tylko Safari), dzięki czemu aplikacja respektuje ustawiony w iOS rozmiar tekstu. Na innych przeglądarkach fallback 17 px. Testujemy do największego rozmiaru tekstu w ustawieniach iOS. Wartości w pt w tym dokumencie = px w CSS.

### 2.3 Layout, spacing, promienie

- **Siatka:** margines boczny 24 pt (iPhone SE i mini: 20 pt), spacing w skali 4 pt: 4, 8, 12, 16, 24, 32, 48, 64.
- **Zakres szerokości:** 375 pt (SE) do 440 pt (Pro Max). Layout płynny, bez twardych szerokości. Treść formularzy max 420 pt.
- **Safe areas** przez `env(safe-area-inset-*)` i `viewport-fit=cover`, status bar `apple-mobile-web-app-status-bar-style: black-translucent`. Zdjęcia full-bleed mogą wchodzić pod status bar, tekst nigdy.
- **Promienie (hierarchia, nie jeden radius na wszystko):** bottom sheet 32, karta 22, pole formularza 14, przycisk główny capsule (pełne zaokrąglenie), chip 10. Standardowy `border-radius`. `corner-shape: squircle` jako progressive enhancement tam, gdzie przeglądarka go wspiera.
- **Elevation:** w light cień `0 8 24 rgba(2,4,7,0.08)` tylko dla sheetów. W dark **bez cieni**, głębię daje jaśniejsza powierzchnia (`bg.surface` → `bg.surfaceRaised`).

### 2.4 Komponenty bazowe

- **Przycisk główny:** wysokość 56 pt, pełna szerokość, `accent.primary`, tekst `body` Semibold. Stan pressed: skala 0.98 (feedback wizualny; `navigator.vibrate` nie działa w Safari na iOS, patrz 3). Stan loading: tekst znika, pojawia się spinner w kolorze `accent.onPrimary`, szerokość przycisku bez zmian.
- **Przycisk drugorzędny:** ta sama wysokość, tło przezroczyste, obramowanie 1 pt `separator`.
- **Pole tekstowe:** wysokość 56 pt, tło `bg.surfaceRaised`, etykieta nad polem (`callout`), nie placeholder zamiast etykiety. Focus: obramowanie 1.5 pt `accent.primary`.

---

## 3. Motion

- **Jeden orkiestrowany moment:** sekwencja z sekcji 5.4 i 5.5. Poza nią animacje tylko jako odpowiedź na akcję użytkownika.
- **Krzywe:** systemowe springi (`.smooth`, `.snappy`), bez linearnych przejść.
- **Haptyka:** Safari na iOS nie udostępnia wibracji z poziomu weba, więc na iPhonie feedback jest wyłącznie wizualny (i ewentualnie dźwiękowy przy kluczowych akcjach, domyślnie wyłączony). Na Androidzie `navigator.vibrate` jako progressive enhancement: krótko przy sukcesie, podwójnie przy błędzie.
- **Przejścia między ekranami:** View Transitions API (Safari 18+, Chrome), z fallbackiem crossfade.
- **Reduce Motion:** każda animacja ma wariant crossfade 200 ms. Ken Burns i parallax wyłączone.

---

## 4. Przepływ

```
Instalacja PWA (5.00, tylko pierwsza wizyta w przeglądarce)
      │
      ▼
Splash screen (statyczny)
      │
      ▼
5.1 Ekran powitalny ──[Zaloguj się]──▶ 5.2 Formularz logowania
                                              │ sukces
                                              ▼
                                   5.3 Ładowanie danych
                                              │ dane gotowe
                                              ▼
                                   5.4 „Witaj, XXX”
                                              │ auto 1.6 s
                                              ▼
                                   5.5 Dashboard (pierwszy ekran)
```

Kolejne uruchomienia (zalogowany): splash → sprawdzenie sesji → 5.3 → 5.4 (wersja skrócona) → 5.5. Bez biometrii: sesja jest długa (refresh token, np. 30 dni, do decyzji), więc kierowca loguje się rzadko. Wygasła sesja wraca do 5.2 z wypełnionym e-mailem.

Po wejściu na dashboard (5.5), zgodnie z kodem:

```
Brak zmiany ──[Rozpocznij zmianę ad hoc + pojazd]──┐
Zmiana zaplanowana ──[Rozpocznij zmianę + pojazd]──┤
                                                   ▼
                                              Na zmianie ──[Zakończ zmianę]──▶ Zmiana zakończona
                                                   │                                │
                                                   │                  [Rozpocznij kolejną zmianę]
Nowy kurs (/driver/trips/new):                     │
  ├─ Kurs live ........ tylko na zmianie ─▶ /trips/live ─▶ Zakończ ─▶ Trasa i czasy ─▶ Szczegóły kursu (+ paragon)
  ├─ Zaplanuj kurs .... zawsze, start w przyszłości ─▶ Trasa i termin ─▶ Szczegóły
  └─ Kurs przeszły .... w czasie przeszłej lub bieżącej zmiany ─▶ Trasa i czasy ─▶ Szczegóły (+ paragon)
Kurs zaplanowany (/trips/[id]): cena i dystans ─▶ Rozpocznij (na zmianie) ─▶ Zakończ ─▶ paragon
                                albo: dodanie paragonu = kurs zakończony
Koszt (/expenses/new): zawsze, paragon wymagany
```

Jeśli kurs live trwa w momencie uruchomienia aplikacji, po sekwencji 5.3 → 5.4 (skróconej) aplikacja otwiera się na `/driver/trips/live`.

---

## 5. Ekrany

### 5.00 Instalacja na ekranie początkowym

iOS nie pokazuje automatycznego promptu instalacji PWA, a push, tryb pełnoekranowy i stabilne przechowywanie danych działają dopiero po dodaniu do ekranu początkowego. Dlatego pierwsza wizyta w Safari (`display-mode: browser`) pokazuje dedykowany ekran:

```
┌──────────────────────────┐
│ [logo]                   │
│ Dodaj aplikację          │  display.l
│ do ekranu początkowego   │
│                          │
│ 1. Stuknij  [⎋ Udostępnij]│  ikona w kolorze akcentu
│ 2. Wybierz „Do ekranu    │
│    początkowego”         │
│ 3. Otwórz RS Moto Taxi   │
│    z ekranu telefonu     │
│                          │
│  [ilustracja: strzałka   │  animowana wskazówka do paska Safari
│   do przycisku Udostępnij]│
│   Kontynuuj w przeglądarce│  link tekstowy, drugorzędny
└──────────────────────────┘
```

- Na Androidzie (Chrome) zamiast instrukcji przycisk „Zainstaluj aplikację” (zdarzenie `beforeinstallprompt`, już obsłużone w `useDriverPwa.ts`; dziś to mały przycisk „Install” w shellu).
- Po uruchomieniu z ekranu początkowego (`display-mode: standalone`) ten ekran nigdy się nie pokazuje.
- Nazwa i ikona w `manifest.webmanifest`: `name: "RS Moto Taxi Driver"`, `short_name: "RS Driver"`, `display: "standalone"`, `background_color` i `theme_color` = `#020407`.

### 5.0 Splash screen

Statyczny obraz startowy: tło `bg.base`, logo RS Moto Taxi wycentrowane, 120 px szerokości. Na iOS wymaga zestawu `apple-touch-startup-image` dla każdej rozdzielczości iPhone'a (generowane automatycznie, np. `pwa-asset-generator`). Wariant ciemny i jasny przez `media` z `prefers-color-scheme` do przetestowania na urządzeniach; jeśli iOS go zignoruje, splash jest zawsze ciemny (`#020407`), co jest spójne z marką. Pierwsza klatka ekranu powitalnego musi wyglądać identycznie jak splash, żeby nie było „mrugnięcia”.

### 5.1 Ekran powitalny (welcome)

**Cel:** pierwsze wrażenie marki. Kierowca ma poczuć, że dołącza do czegoś starannego.

```
┌──────────────────────────┐
│░░░░░░░░░░░░░░░░░░░░░░░░░░│  ← zdjęcie auta RS Moto Taxi, full-bleed
│░░░░░░░ [logo] ░░░░░░░░░░░│     logo w górnej 1/3, na scrimie
│░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░│
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│  ← scrim gradient od 55% wysokości
│ Spokój, klasa,           │  display.l, text on dark
│ przewidywalność.         │
│ Aplikacja kierowcy       │  body, secondary
│ RS Moto Taxi             │
│                          │
│ (      Zaloguj się     ) │  przycisk główny, 56 pt
│  Problem z logowaniem?   │  link tekstowy, callout
└──────────────────────────┘
```

**Zdjęcie:**
- Zdjęcie: `public/brand/fleet-hero-green.webp` (domyślne) lub `public/brand/fleet-hero-violet.webp`. Oba przygotowane z `taxi_marzec_2025` i `AHS_8422`: kadr pionowy 1290×2796, auto w pasie 28 do 55% wysokości, cienie przesunięte w granat #020407, wygaszenie góry (miejsce na logo) i dołu (hasło i przycisk). Przycisk na zdjęciu jest biały, neutralny wobec oklejenia auta. Kadrowanie: `object-fit: cover`, `object-position` tak, by auto było w górnych 60% ekranu.
- **Rekomendacja: dedykowana sesja pionowa** (9:19.5, min. 1290×2796 px). Poziome zdjęcia przycięte do pionu tracą auto. Kadr: auto 3/4 z przodu, dolne 40% kadru spokojne (asfalt, cień), bo tam leży tekst.
- Dwa warianty zdjęcia: dzienne (dla light) i nocne / blue hour (dla dark). Aplikacja wybiera wariant wg bieżącego trybu.

**Light vs dark:**
- Dark: zdjęcie nocne full-bleed, scrim `#020407` do 92%, tekst jasny.
- Light: zdjęcie dzienne full-bleed, scrim również ciemny (tekst na zdjęciu musi być czytelny zawsze). Różnica jest w zdjęciu i w kolorze akcentu przycisku (bronze vs champagne), nie w układzie. Spójność ważniejsza niż „jasny ekran na siłę”.

**Motion (wow, cicho):**
- Ken Burns: skala zdjęcia 1.00 → 1.06 przez 14 s, ease-in-out, zapętlone z odwróceniem.
- Wejście: logo fade 400 ms, potem headline i przycisk slide-up 12 pt + fade, opóźnienie 150 ms.
- Delikatny parallax zdjęcia od żyroskopu (max 8 pt).

**Kryteria akceptacji:**
- Czytelność tekstu na obu wariantach zdjęcia: kontrast min. 4.5:1 w miejscu tekstu.
- Na iPhone SE przycisk w całości widoczny bez scrolla.
- Brak migotania przy przejściu ze splash screenu.

### 5.2 Formularz logowania

**Cel:** szybko i bez stresu. To ma wyglądać jak wejście do klubu, nie jak panel administracyjny.

**Prezentacja:** bottom sheet wysuwany nad ekranem powitalnym (zdjęcie zostaje widoczne w górnej części, rozmyte i przyciemnione). Po wysunięciu sheet zajmuje ok. 70% wysokości, na mniejszych ekranach pełny ekran.

```
┌──────────────────────────┐
│░░░░ (rozmyte zdjęcie) ░░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░│
│╭────────────────────────╮│
││          ───           ││  grabber
││ Zaloguj się            ││  display.l
││ Użyj danych konta      ││  body, secondary
││ kierowcy.              ││
││                        ││
││ E-mail                 ││  callout
││ [ jan@rsmototaxi.pl  ] ││  pole 56 pt
││                        ││
││ Hasło                  ││
││ [ ••••••••••      👁 ] ││
││                        ││
││ ( Zaloguj się        ) ││  przycisk główny
││ Problem z logowaniem?  ││  link do koordynatora
│╰────────────────────────╯│
└──────────────────────────┘
```

**Zachowanie:**
- Logowanie: **e-mail + hasło**, konto kierowcy. Konta zakłada flota, w aplikacji nie ma rejestracji.
- **Brak przypominania hasła w tej wersji.** Zamiast linku „Nie pamiętam hasła” jest link „Problem z logowaniem?”, który otwiera mały sheet: „Skontaktuj się z koordynatorem floty” z przyciskami `tel:` i `mailto:`. Kierowca nie trafia w ślepy zaułek, a my nie obiecujemy funkcji, której nie ma.
- E-mail: `type="email"`, `autocomplete="username"`, `inputmode="email"`, `autocapitalize="off"`, `spellcheck="false"`. Hasło: `type="password"`, `autocomplete="current-password"`. Pola w prawdziwym `<form>` z `action`, żeby Safari zaproponowało zapisanie danych w Pęku kluczy iCloud i potem je autouzupełniało. To zastępuje biometrię w codziennym użyciu.
- Pole e-mail: bez autokorekty i bez wielkiej litery na początku, trim spacji przed wysłaniem. Walidacja formatu dopiero po wyjściu z pola, nie w trakcie pisania.
- Przycisk „Dalej” na klawiaturze przenosi do hasła, „Zaloguj się” wysyła formularz.
- Pamiętanie ostatnio użytego e-maila (pole wypełnione przy kolejnym logowaniu po wylogowaniu).
- Przycisk nieaktywny do czasu wypełnienia obu pól (bez komunikatów błędów przed pierwszą próbą).
- Brak biometrii. Po poprawnym logowaniu sesja jest długa, a przy kolejnym logowaniu pomaga autofill z Pęku kluczy.

**Stany:**
- Loading: spinner w przycisku, pola zablokowane.
- Błąd danych: pole hasła z obramowaniem `status.error`, pod polem komunikat „Nieprawidłowy e-mail lub hasło. Sprawdź dane albo skontaktuj się z koordynatorem.” Delikatny shake sheetu (3 cykle, 6 pt), w Reduce Motion bez shake.
- Brak sieci: baner w sheecie „Brak połączenia z internetem. Logowanie wymaga sieci.” z przyciskiem „Spróbuj ponownie”.
- Niepoprawny format e-maila: komunikat pod polem „Wpisz pełny adres e-mail, np. jan@rsmototaxi.pl”.
- Brak uprawnienia `taxi_fleet.driver` lub błędne dane: kod zwraca jeden komunikat („Logowanie nieudane…”); w nowym UI rozdzielamy go na „Nieprawidłowy e-mail lub hasło” i „To konto nie ma dostępu do aplikacji kierowcy”, jeśli API pozwala to rozróżnić.
- Konto z MFA: komunikat z kodu, że logowanie wieloetapowe nie jest obsługiwane w aplikacji kierowcy.
- Konto nieaktywne lub zablokowane: komunikat „Twoje konto jest nieaktywne. Skontaktuj się z koordynatorem.” z przyciskami `tel:` i `mailto:`.
- Wiele nieudanych prób (limit po stronie backendu): komunikat z czasem blokady i kontaktem do koordynatora.

**Kryteria akceptacji:**
- Sheet dopasowuje się do klawiatury, przycisk „Zaloguj się” zawsze widoczny nad klawiaturą.
- Działa przy największym rozmiarze tekstu w iOS (sheet przechodzi w scroll).
- Sheet dopasowuje się do klawiatury przez `visualViewport` (na iOS klawiatura nie zmienia `100vh`), przycisk nie chowa się pod klawiaturą.

### 5.3 Ładowanie po zalogowaniu (moment wow, część 1)

**Cel:** zamienić czekanie na moment marki. Kierowca ma zobaczyć, że „system przygotowuje jego dzień”.

**Grafika: „Linia trasy”.**
- Tło `bg.base`. Na środku stylizowana, minimalistyczna mapa konturowa okolic (Zabierzów, Kraków, Balice), narysowana cienkimi liniami `separator`.
- Linia trasy w `accent.primary` rysuje się (stroke animation) od punktu Zabierzów do punktu Balice. Na końcu linii mały punkt światła, który „dojeżdża” i pulsuje jeden raz.
- Wykonanie: Lottie lub Rive (rekomendacja: **Rive**, bo pozwala sterować animacją stanem ładowania). Dwa warianty kolorystyczne sterowane tokenami, nie dwa osobne pliki.

```
┌──────────────────────────┐
│                          │
│      ·  ·    ·           │  kontur mapy, bardzo subtelny
│   ·    ╭─────╮   ·       │
│  Zabierzów●━━━━━━━●Balice│  linia w akcencie, rysuje się
│      ·    ╰──·     ·     │
│                          │
│  Przygotowujemy Twój     │  body, secondary, fade-in po 2 s
│  dzień                   │
└──────────────────────────┘
```

**Logika czasu:**
- Minimalny czas animacji: 1.4 s (nawet jeśli dane są gotowe wcześniej, pozwalamy linii dojechać). Nigdy nie wydłużamy sztucznie ponad to.
- Dane ładowane równolegle: `/driver/me` (profil + dzisiejsza zmiana), `/driver/profiles` (cache offline pojazdów), `/driver/trips` (dziś), oraz wysłanie outboxu, jeśli ma zaległe mutacje. Offline: start z danych w IndexedDB (`driverDataCache`, `seedDriverOfflineSnapshots`). Pierwsze uruchomienie offline bez cache: komunikat z kodu „Brak zapisanego profilu na tym urządzeniu. Połącz się raz, żeby pobrać pojazdy i dane zmian.”
- Jeśli ładowanie trwa ponad 2 s: pojawia się tekst „Przygotowujemy Twój dzień”. Ponad 6 s: „Wciąż ładujemy zlecenia…”. Ponad 15 s: ekran błędu z „Spróbuj ponownie” i dostępem do danych z cache, jeśli są.
- Brak sieci przy kolejnym uruchomieniu: przejście dalej na danych z cache z banerem „Tryb offline. Dane z [godzina]”.

### 5.4 „Witaj, XXX” (moment wow, część 2)

**Przejście z 5.3:** punkt światła na końcu trasy rozszerza się w miękką poświatę, mapa robi fade-out, w centrum pojawia się powitanie.

```
┌──────────────────────────┐
│                          │
│                          │
│  Witaj,                  │  display.xl, text.primary
│  Rafał                   │  display.xl, accent.primary
│                          │
│  Dziś masz 3 kursy.      │  body, secondary
│  Pierwszy o 5:40,        │
│  Balice.                 │
│                          │
└──────────────────────────┘
```

**Zachowanie:**
- Imię z profilu kierowcy. Forma „Witaj, Rafał” (mianownik) jest bezpieczna dla wszystkich imion. Wołacz („Rafale”) tylko jeśli backend przechowuje go jawnie.
- Opcjonalny wariant zależny od pory: „Dzień dobry, Rafał” (5:00 do 18:00) / „Dobry wieczór, Rafał” (18:00 do 5:00). Do decyzji klienta.
- Linijka kontekstu zależna od stanu dashboardu (5.5): A „Na dziś nie masz zaplanowanej zmiany.”, B „Twoja zmiana zaczyna się o 6:00. KR 1234X.”, C „Jesteś na zmianie od 6:02.”, D „Dzisiejsza zmiana zakończona.” Jeśli są kursy bez paragonu, druga linijka: „2 kursy czekają na paragon.” Dane z `/driver/me` i listy kursów; offline z cache.
- Animacja: słowo „Witaj,” fade + slide-up 8 pt, imię 120 ms później, linijka kontekstu 250 ms później.
- Czas wyświetlenia: 1.6 s przy pierwszym logowaniu, 0.9 s przy kolejnych uruchomieniach. Tap w dowolnym miejscu pomija.
- **Przejście do dashboardu:** powitanie przesuwa się w górę i zmniejsza, stając się nagłówkiem dashboardu (View Transitions API, `view-transition-name` na nagłówku). Karta najbliższego kursu wjeżdża od dołu jako sheet. To jest kluczowy moment płynności, bez twardego cięcia.

### 5.5 Dashboard (`/driver`)

**Zasada nadrzędna:** stan zmiany jest zawsze widoczny w nagłówku (`DriverShell`: „Na zmianie” / „Poza zmianą”) i steruje akcją główną. Kod ma **pięć stanów** dashboardu, nowy UI musi obsłużyć każdy:

| Stan | Warunek | Akcja główna | Akcje dodatkowe |
|---|---|---|---|
| A. Brak zmiany na dziś | brak assignmentu | **Rozpocznij zmianę ad hoc** (z wyborem pojazdu domyślnego) | Pokaż grafik, Zarejestruj koszt |
| A′. Brak pojazdu | pojazdy domyślne zajęte / brak | brak, komunikat „Poproś dyspozytora o pojazd” | Pokaż grafik |
| B. Zmiana zaplanowana | assignment `planned` / `confirmed`, nierozpoczęty | **Rozpocznij zmianę** (potwierdzenie pojazdu) | Podgląd kursów, Zarejestruj koszt |
| C. Na zmianie | zmiana rozpoczęta | **Dodaj kurs** | Zarejestruj koszt, Kursy, **Zakończ zmianę** |
| D. Zmiana zakończona | zmiana zakończona dziś | **Rozpocznij kolejną zmianę** | Kursy, Zarejestruj koszt, Grafik |

**Stan C: na zmianie** (najważniejszy ekran aplikacji)

```
┌──────────────────────────┐
│ ● Na zmianie  2:14:05    │  lampka success + licznik od shiftStart (serwer)
│ KR 1234X · Skoda Superb  │  resourcePlate · resourceLabel
│╭────────────────────────╮│
││ ( + Dodaj kurs       ) ││  przycisk główny, 64 px → /driver/trips/new
│╰────────────────────────╯│
│ ⚡ Kurs live w trakcie ›  │  tylko gdy trwa kurs live (baner z DriverShell)
│ Dzisiaj                  │
│  Rozpoczęta   6:02       │
│  GPS          84,2 km    │  gpsDistanceKm
│  Kursy        3 · ⚠ 1    │  1 bez paragonu → filtr listy
│ Następny zaplanowany     │
│╭────────────────────────╮│
││ 14:30        za 25 min ││
││ Balice → Zakopane      ││
││ [Przedpłata] [Fotelik] ││
│╰────────────────────────╯│
│ ( Zarejestruj koszt )    │  drugorzędny
│   Zakończ zmianę         │  ghost, z potwierdzeniem
│ [Start][Kursy][Koszty][Wypłaty][Zmiany] │
└──────────────────────────┘
```

**Zachowanie:**
- Licznik zmiany liczony od `shiftStart` z serwera (lub z outboxu, jeśli zmianę rozpoczęto offline).
- Karta „Następny zaplanowany” pokazuje najbliższy kurs `scheduled` z dzisiaj. Tap otwiera `/driver/trips/[id]`.
- Linia „Kursy” pokazuje liczbę kursów na tej zmianie i liczbę kursów bez paragonu, tylko dla typów, które go wymagają.
- Przejście B → C: po potwierdzeniu pojazdu nagłówek płynnie zmienia się w pasek zmiany z licznikiem, a przycisk główny morfuje w „Dodaj kurs”. Start offline: toast „Zmiana rozpoczęta offline. Zsynchronizuje się po połączeniu”, pasek zmiany ze znacznikiem „Czeka na synchronizację”.
- Błędy okna czasowego (`SHIFT_TOO_EARLY`, `SHIFT_TOO_LATE`) pokazujemy jako czytelny komunikat z godziną, od której / do której można zacząć.
- Pull to refresh (`DriverPullToRefresh`) zostaje.

**Banery shellu** (kolejność od najważniejszego, maksymalnie jeden duży naraz, reszta jako chipy w nagłówku): nowa wersja aplikacji (blokujący) → podgląd operatora (read-only) → kurs live w trakcie → brak dostępu do lokalizacji (na zmianie) → brak zgody na powiadomienia → offline / dane z cache → zmiany do synchronizacji.

### 5.6 Zmiany (`/driver/assignments`) i start zmiany

**Start zmiany:** sheet „Potwierdź pojazd na tę zmianę” (`DriverShiftVehiclePicker`): lista pojazdów z tablicą rejestracyjną jako głównym identyfikatorem (duży, `numeric` style), zaznaczony pojazd z assignmentu lub pierwszy domyślny. Przycisk „Rozpocznij zmianę” 64 px. Bez wybranego pojazdu przycisk nieaktywny z podpowiedzią „Wybierz pojazd”.

**Koniec zmiany:** potwierdzenie w sheecie z podsumowaniem: czas zmiany, GPS km, liczba kursów, **kursy bez paragonu** z akcją „Dodaj paragon” przy każdym. Kod nie blokuje zakończenia zmiany przy brakujących paragonach, więc UI tylko ostrzega. Kurs live w trakcie: najpierw „Zakończ kurs”.

**Lista zmian:** segmenty „Ten tydzień / Wszystkie”, karta zmiany: data, godziny planowane i rzeczywiste, pojazd, status (Zaplanowana / Na zmianie / Zakończona / Ad hoc), GPS km. Przycisk „Zakończ zmianę” na karcie trwającej zmiany. Paginacja zostaje, w nowym UI jako „Pokaż więcej” zamiast numerów stron.

### 5.7 Kurs: nowy, live i zaplanowany

**Nowy kurs, wybór trybu** (`/driver/trips/new`, `mode = choose`):

```
┌──────────────────────────┐
│ Nowy kurs            ✕   │
│ Pojazd na zmianie:       │
│ KR 1234X                 │
│╭────────────────────────╮│
││ ⚡ Kurs live            ││  karta 1, akcent; tylko na zmianie
││ Start teraz, GPS       ││  „Wznów kurs live”, jeśli trwa
│╰────────────────────────╯│
│╭────────────────────────╮│
││ 📅 Zaplanuj kurs        ││  zawsze
│╰────────────────────────╯│
│╭────────────────────────╮│
││ ↺ Kurs przeszły         ││  zawsze, w granicach zmian
│╰────────────────────────╯│
└──────────────────────────┘
```

Poza zmianą karta „Kurs live” jest nieaktywna z opisem „Rozpocznij zmianę, żeby jechać na żywo” i przyciskiem „Rozpocznij zmianę” (`DriverTripGate`).

**Formularz jest dwukrokowy w każdym trybie** (zachowujemy):
1. **Trasa i czasy** (`DriverRouteStep`): Skąd, przystanki (dodaj / usuń), Dokąd, z autocomplete i „Użyj mojej lokalizacji”; start i koniec (`DriverDateTimeField`); dystans liczony automatycznie z „Przelicz”, czas trwania. Offline: komunikat, że dystans policzy się po połączeniu.
2. **Szczegóły kursu** (`DriverCommercialStep`): typ kursu (5 kafelków z ikonami), klient (wyszukiwarka po nazwie / telefonie / NIP, „Nowa osoba” / „Nowa firma”), płatność, kwota z **sugerowaną ceną** (`DriverQuoteSync`, chip „Sugerowana cena: 180 zł” do tapnięcia), paragon, notatki. Pola pokazują się zgodnie z tabelą typów w 0.2.

W nowym UI kroki są pokazane jako **pasek postępu 1/2, 2/2** w nagłówku sheetu, a przejście między nimi to przesunięcie w bok. Przycisk „Dalej: szczegóły kursu” / „Zapisz”.

**Kurs live w trakcie** (`/driver/trips/live`):

```
┌──────────────────────────┐
│ ● Na zmianie  2:31:40    │
│╭────────────────────────╮│
││ Kurs w trakcie  0:17:22││  licznik od startedAt
││ Skąd                   ││
││ ul. Krakowska 12,      ││  adres z reverse-geocode
││ Zabierzów              ││
││ Punkty GPS  142        ││  ślad kursu
││                        ││
││ ≫ Przesuń, aby zakończyć││ slide to finish (zamiast przycisku)
│╰────────────────────────╯│
└──────────────────────────┘
```

Po zakończeniu: krok „Trasa i czasy” z wypełnionym startem, końcem i dystansem ze śladu, potem „Szczegóły kursu”. W trakcie kursu tab bar jest ukryty, ekran maksymalnie prosty.

**Kurs zaplanowany** (`/driver/trips/[id]`, status `scheduled`):
- Nagłówek: godzina, trasa, znaczniki z rezerwacji (Przedpłata, lot, foteliki, meet & greet, kierowca anglojęzyczny).
- Edytowalne tylko **cena i dystans** („Tylko te pola można zmienić, gdy kurs jest zaplanowany”). Przy przedpłacie online tylko dystans.
- Akcja główna: **Przesuń, aby rozpocząć** (na zmianie), poza zmianą przycisk „Rozpocznij zmianę, żeby ruszyć”.
- `in_progress`: „Kurs trwa. Zakończ, gdy pasażer wysiądzie. Zmieni się tylko godzina końca.” i **Przesuń, aby zakończyć**.
- Alternatywna ścieżka: „Dodaj paragon” na kursie zaplanowanym z informacją „Dodanie paragonu oznaczy kurs jako zakończony”.
- Sekcja „Więcej szczegółów” (rozwijana): typ, usługa, przystanki, czas, pasażerowie, pojazd, płatność, cena bazowa, dopłaty, kontakt, firma, NIP, lot, foteliki, podstawki, bagaż, meet & greet, kierowca anglojęzyczny.
- Kurs z platformy (Uber / Bolt): baner „Kurs zaimportowany z aplikacji platformy, nie można go edytować”, znacznik platformy na karcie.
- Kurs zakończony: widok tylko do odczytu, z wyjątkiem dodania brakującego paragonu.

### 5.8 Kurs zaplanowany i przeszły: walidacje w UI

| Tryb | Kiedy dostępny | Czasy | Komunikat błędu |
|---|---|---|---|
| Zaplanuj | zawsze | start w przyszłości, koniec opcjonalny | „Kurs planowany musi zaczynać się w przyszłości.” |
| Przeszły | zawsze | start i koniec wymagane, **w granicach przeszłej lub bieżącej zmiany** | „Czas kursu musi mieścić się w jednej z Twoich zmian.” |
| Live | tylko na zmianie | start = teraz | „Kurs live można rozpocząć tylko na otwartej zmianie.” |
| Wszystkie | | bez nakładania się | „Ten kurs nakłada się na inny zarejestrowany kurs.” |

Poza zmianą ekran wyboru pokazuje wyjaśnienie: „Jesteś poza zmianą. Możesz zaplanować kurs albo dodać zakończony kurs z poprzedniej zmiany.”

Date picker: natywny `<input type="datetime-local">` z `min` / `max` wyliczonymi z trybu (dla kursu przeszłego: granice zmian, jeśli są znane w cache), skróty „Teraz”, „Dziś”, „Wczoraj”.

Kurs `internal` po zapisaniu: toast „Kurs zapisany. Czeka na autoryzację.” Na liście kierowca widzi go jako zakończony (zgodnie z `driverVisibleTripStatuses`).

### 5.9 Paragon (kursy i koszty)

**Wejścia** (`DriverReceiptFields`, dziś jedno pole `accept="image/*,.pdf" capture="environment"`):
- Kod ma obecnie **jedno pole z `capture`**, co na iPhonie otwiera od razu aparat i uniemożliwia wybór PDF. Rozdzielamy na dwa przyciski: **Zrób zdjęcie** (`capture="environment"`, `accept="image/*"`) i **Wybierz plik** (`accept="image/*,.pdf"`, bez `capture`).
- Po wyborze: podgląd (`DriverReceiptPreview`), „Usuń”, pole „Numer paragonu / faktury” (uzupełnia OCR, można poprawić).

**Statusy paragonu** (`DriverTripReceiptStatusBadge`, te same na kursach i kosztach):

| Status | Chip | Kolor |
|---|---|---|
| Brak paragonu | „Brak paragonu” | `status.warning` |
| Przetwarzanie OCR | „Przetwarzanie” z pulsującą kropką | `accent` |
| Do sprawdzenia | „Do sprawdzenia” + opis „Sprawdź wynik rozpoznania” | `status.error` |
| Zweryfikowany | „Zweryfikowany” | `status.success` |
| Zapisany offline | „Czeka na synchronizację” | neutralny |

**Zachowanie:** upload przez `POST /api/taxi_fleet/driver/attachments`, offline zapis bloba w IndexedDB i wysyłka z outboxu (już zaimplementowane). Wszędzie, gdzie kurs wymaga paragonu i go nie ma, ten sam wzorzec: chip „Brak paragonu”, tap otwiera od razu sheet paragonu.

### 5.10 Kursy (`/driver/trips`)

- Segmenty: **Dziś / Wszystkie** (jak w kodzie), przycisk „Nowy kurs”.
- Karta kursu: godzina start–koniec, trasa (skąd → dokąd), kwota z walutą, status (Zaplanowany / W trakcie / Zakończony / Anulowany), chip paragonu, chip „Przedpłata”, znacznik platformy (Uber / Bolt), znacznik synchronizacji offline.
- Kolejność na liście „Dziś”: W trakcie → Zaplanowane (rosnąco) → Zakończone (malejąco).
- Szybki filtr **„Brak paragonu”** z licznikiem (nowość w UI, filtr po stronie klienta na podstawie `receiptAttachmentId` i typu kursu).
- Paginacja jako „Pokaż więcej”, pull to refresh.

### 5.11 Koszty (`/driver/expenses`)

**Nowy koszt** (`/driver/expenses/new`), jeden ekran:

```
┌──────────────────────────┐
│ Zarejestruj koszt    ✕   │
│ [⛽ Paliwo][🛣 Autostr.] │  typ kosztu: kafelki
│ [🅿 Parking][🔧 Serwis]  │  fuel, toll, parking,
│ [… Inne]                 │  maintenance, other
│ Kwota brutto             │
│ [        250,00 zł   ]   │  numeric, duże
│ VAT  [8%][23%] opcjonalnie│
│ Kiedy  [ dziś, 14:12 ]   │
│ Paragon (wymagany)       │
│ [📷 Zrób zdjęcie][Plik]  │
│ Notatki                  │
│ ( Zapisz koszt       )   │
└──────────────────────────┘
```

- Opis pod nagłówkiem (z kodu): koszty wchodzą do rozliczenia tygodniowego, paragon jest wymagany, VAT można pominąć, uzupełni go OCR.
- Walidacje: poprawna kwota, poprawna data, paragon wymagany.

**Lista kosztów:** sortowanie (data dokumentu / data dodania, rosnąco / malejąco), karta: typ z ikoną, kwota, data dokumentu, VAT, status paragonu, znacznik synchronizacji. Usuwanie z potwierdzeniem („Usunąć ten koszt?”). Błąd OCR: „Rozpoznanie paragonu nie powiodło się, możesz usunąć koszt i dodać go ponownie”.

### 5.12 Wypłaty (`/driver/settlements`)

- Segmenty: **Miesięczne (wypłata)** i **Tygodniowe (kontrolne)**. Kierowca tylko przegląda, akceptacja jest po stronie floty.
- Karta miesięczna: miesiąc, status (Szkic / Wysłane / Zatwierdzone / Wypłacone), **Wypłata** jako duża kwota. Karta tygodniowa: tydzień, status, „Netto (kontrolne)”.
- Szczegóły tygodniowe: procent wypłaty, przychód, koszty, netto, bonus, rekompensata, wypłata końcowa. Szczegóły miesięczne: przychód, koszty, netto, wypłata końcowa.
- To ekran „nagrody” dla kierowcy, więc warto go dopracować wizualnie: kwota wypłaty w `display.xl`, rozbicie jako prosta lista, bez wykresów w MVP.

---

## 6. Microcopy

Głos: spokojny, rzeczowy, uprzejmy. Jak dobry koordynator floty, nie jak aplikacja z konfetti.

| Miejsce | Tekst |
|---|---|
| Headline powitania | Spokój, klasa, przewidywalność. |
| CTA powitania | Zaloguj się |
| Podtytuł logowania | Użyj danych konta kierowcy. |
| Link pomocy | Problem z logowaniem? |
| Sheet pomocy | Skontaktuj się z koordynatorem floty. |
| Ładowanie | Przygotowujemy Twój dzień |
| Brak kursów | Na dziś nie masz zleceń. |
| Błąd logowania | Nieprawidłowy e-mail lub hasło. Sprawdź dane albo skontaktuj się z koordynatorem. |
| Offline | Tryb offline. Dane z 5:12. |
| Start zmiany | Rozpocznij zmianę |
| Start zmiany bez planu | Rozpocznij zmianę ad hoc |
| Potwierdzenie pojazdu | Potwierdź pojazd na tę zmianę |
| Koniec zmiany | Zakończ zmianę |
| Kolejna zmiana | Rozpocznij kolejną zmianę |
| Dodanie kursu | Dodaj kurs |
| Tryby kursu | Kurs live · Zaplanuj kurs · Kurs przeszły |
| Start kursu zaplanowanego | Przesuń, aby rozpocząć |
| Koniec kursu | Przesuń, aby zakończyć |
| Kurs live poza zmianą | Rozpocznij zmianę, żeby jechać na żywo |
| Kurs internal | Kurs zapisany. Czeka na autoryzację. |
| Statusy paragonu | Brak paragonu · Przetwarzanie · Do sprawdzenia · Zweryfikowany |
| Offline | Zapisano offline. Zsynchronizuje się po połączeniu. |
| Synchronizacja | Czeka na synchronizację · Błąd synchronizacji |
| Kurs z platformy | Kurs z aplikacji platformy. Nie można go edytować. |
| Koszt | Zarejestruj koszt |
| Podgląd operatora | Podgląd tylko do odczytu. Zmiany są wyłączone. |

Zasady: bez wykrzykników, bez „Ups!”, błąd zawsze mówi co się stało i co zrobić. Wszystkie teksty przez istniejące klucze `t('taxi_fleet.driverApp.…', 'fallback')`: zmieniamy tłumaczenia pl / en, nie wprowadzamy tekstów na sztywno.

---

## 7. Assety do przygotowania

| Asset | Format | Uwagi |
|---|---|---|
| Logo RS Moto Taxi | SVG | **już jest w repo:** `public/driver/logo-rs-moto-taxi.svg` (`DriverBrandMark`). Potrzebny wariant jasny do dark mode i na zdjęcie powitalne |
| Zdjęcie powitalne, dzień | HEIC/JPG, 1290×2796 | sesja pionowa, auto floty |
| Zdjęcie powitalne, noc | HEIC/JPG, 1290×2796 | blue hour, światła auta włączone |
| Animacja trasy | Rive (`.riv`) | sterowana stanem, kolory z tokenów |
| Kontur mapy | SVG | uproszczony, bez nazw ulic |
| Ikona aplikacji | `apple-touch-icon` 180×180, manifest 192×192 i 512×512 (w tym `maskable`) | spójna z logo, bez przezroczystości na iOS |
| Splash screeny iOS | PNG, zestaw per rozdzielczość iPhone'a | generowane automatycznie |
| Mona Sans | WOFF2, variable | self-hosted, jedna wersja zmienna |

---

## 8. Otwarte pytania

1. Jaki numer telefonu i e-mail koordynatora pokazujemy w sheecie „Problem z logowaniem?”. Czy dane z rsmototaxi.pl (508 222 321, hello@rsmototaxi.pl), czy osobny kontakt dla kierowców?
2. Czy kolor akcentu ma pochodzić z logo, czy zostajemy przy propozycji champagne / bronze?
3. Czy możliwa jest dedykowana sesja zdjęciowa pionowa (dzień + noc)?
4. „Witaj, XXX” stałe czy zależne od pory dnia?
5. Czy aplikacja obsługuje również język angielski (kierowcy anglojęzyczni)?
6. Wprowadzenie dark mode wymaga usunięcia `useDriverForcedLightTheme` (dziś aplikacja celowo wymusza jasny motyw). Potwierdzić, że to akceptowalne.
7. Czy sekwencja „ładowanie → Witaj” ma się pokazywać przy każdym otwarciu, czy tylko po zalogowaniu i raz dziennie? (rekomendacja: po logowaniu + pierwsze otwarcie dnia)
8. Czy kursy z platform (Uber / Bolt) mają być wizualnie odróżnione od kursów premium RS Moto Taxi (np. neutralny znacznik vs akcent marki)?
9. Nowy filtr „Brak paragonu” na liście kursów: czy wystarczy filtr po stronie klienta, czy dodać parametr do `GET /driver/trips`?
10. Jak długo ma trwać sesja kierowcy bez ponownego logowania?

---

## 9. Checklist QA

- [ ] Każdy ekran sprawdzony w light i dark na iPhone SE, 16, 16 Pro Max
- [ ] Przełączenie trybu systemowego w trakcie działania aplikacji bez restartu
- [ ] Największy rozmiar tekstu w iOS bez obciętego tekstu
- [ ] Testy w trybie standalone (z ekranu początkowego), nie tylko w karcie Safari
- [ ] Minimalna wersja iOS: 16.4 (Web Push), zalecana 18+ (View Transitions)
- [ ] Utrata sieci w trakcie wysyłki paragonu i ponowienie po powrocie
- [ ] Zamknięcie aplikacji w trakcie kursu i ponowne otwarcie (licznik, stan kursu)
- [ ] VoiceOver: kolejność czytania, etykiety przycisków, animacje oznaczone jako dekoracyjne
- [ ] Reduce Motion: wszystkie sekwencje mają wariant crossfade
- [ ] Kontrasty min. 4.5:1 dla tekstu, 3:1 dla elementów UI
- [ ] Ekran powitalny czytelny w pełnym słońcu (test na zewnątrz, nie tylko w Figmie)
- [ ] Czas od tapu „Zaloguj się” do dashboardu przy dobrej sieci: max 3.5 s łącznie z animacjami

---

## 10. Dokumentacja techniczna (referencje dla implementacji)

**PWA i iOS**
- [Web App Manifest (MDN)](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [Web Push dla aplikacji na iOS i iPadOS (WebKit blog)](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)
- [Push API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Konfiguracja web app w Safari: `apple-touch-icon`, `apple-touch-startup-image`, status bar (Apple)](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)
- [pwa-asset-generator: splash screeny i ikony](https://github.com/elegantapp/pwa-asset-generator)
- [`beforeinstallprompt` (MDN, Android / Chrome)](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeinstallprompt_event)
- [`display-mode` media feature (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/display-mode)

**Layout, tryby i typografia**
- [`prefers-color-scheme` (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme)
- [`color-scheme` (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/color-scheme)
- [`env()` i safe area insets (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/env)
- [VisualViewport API, klawiatura na iOS (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport)
- [`font-variant-numeric` (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/font-variant-numeric)
- [Mona Sans (GitHub, SIL OFL)](https://github.com/github/mona-sans)

**Formularze i logowanie**
- [Atrybut `autocomplete` (MDN)](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete)
- [Atrybut `inputmode` (MDN)](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/inputmode)
- [`<input type="datetime-local">` (MDN)](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/datetime-local)

**Paragony i offline**
- [Atrybut `capture` (MDN)](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/capture)
- [IndexedDB API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Service Worker API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [jscanify: wykrywanie krawędzi dokumentu, etap 2](https://github.com/puffinsoft/jscanify)

**Ruch i animacje**
- [View Transition API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API)
- [`prefers-reduced-motion` (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
- [Rive: runtime web (GitHub)](https://github.com/rive-app/rive-wasm)
- [Screen Wake Lock API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API)

**Nawigacja zewnętrzna**
- [Apple Maps: format linków (Apple)](https://developer.apple.com/library/archive/featuredarticles/iPhoneURLScheme_Reference/MapLinks/MapLinks.html)
- [Google Maps URLs (Google)](https://developers.google.com/maps/documentation/urls/get-started)

**Dostępność**
- [WCAG 2.2: kontrast minimalny (W3C)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
