# Przejścia ekranów · RS Moto Taxi - Kierowca

Dwa zatwierdzone przejścia:
- **1a**: zmiana zakładki w dolnej nawigacji (przenikanie z kierunkiem)
- **1c**: wejście w szczegóły z listy (wjazd z prawej) i powrót gestem od krawędzi

Podgląd: otwórz `demo.html` w przeglądarce (najlepiej Safari na iPhonie lub w trybie urządzenia). Kliknij zakładki; w „Kursy” kliknij kartę, wróć przyciskiem albo przesuwając od lewej krawędzi.

## Pliki
- `src/motion.ts`: tokeny ruchu (czasy, krzywe, progi gestu)
- `src/tabTransition.ts`: 1a, niezależne od frameworka (Web Animations API)
- `src/stackTransition.ts`: 1c, push/pop + gest powrotu od krawędzi
- `src/react/TabPanes.tsx`, `src/react/StackView.tsx`: przykładowa integracja z Reactem
- `demo.html`: samodzielny podgląd (ta sama logika bez typów)

Bez zależności. Animujemy tylko `transform` i `opacity`, więc całość działa w 60 fps także na starszych iPhone'ach.

## 1a · Zakładki

| | Wyjście (stary ekran) | Wejście (nowy ekran) |
|---|---|---|
| opacity | 1 → 0 | 0 → 1 |
| translateX | 0 → ∓12 px | ±20 px → 0 |
| czas | 90 ms | 210 ms, start po 90 ms |
| krzywa | `cubic-bezier(.4, 0, 1, 1)` | `cubic-bezier(.2, .8, .2, 1)` |

- Kierunek z indeksu zakładki: nowa po prawej to wejście z prawej (+20 px), stara odjeżdża w lewo (−12 px). I odwrotnie.
- Nie animujemy status baru, nawigacji ani niczego poza obszarem treści. Podświetlenie zakładki w nawigacji zmienia się od razu przy tapnięciu.
- Wszystkie zakładki zostają zamontowane (ukryte przez `hidden`), więc pamiętają przewinięcie i stan.
- Tapnięcie w aktywną zakładkę przewija ją płynnie na górę.
- Szybkie kolejne tapnięcia: poprzednie przejście przeskakuje do stanu końcowego (`finish()`), nowe startuje od razu.

## 1c · Szczegóły z listy

- Wejście: szczegóły `translateX(100%) → 0`, lista `0 → −25%`, warstwa przyciemnienia `0 → 12%` (`#020407`). 380 ms, `cubic-bezier(.32, .72, 0, 1)`. Cień na lewej krawędzi szczegółów: `-12px 0 32px rgba(2,4,7,.14)`.
- Powrót przyciskiem: to samo w odwrotnej kolejności.
- Powrót gestem:
  - start tylko w pierwszych 24 px od lewej krawędzi
  - ekran podąża 1:1 za palcem (lista i przyciemnienie proporcjonalnie)
  - ruch pionowy wygrywa, więc przewijanie działa normalnie
  - po puszczeniu: za 35% szerokości albo szybki ruch (> 0,5 px/ms) kończy powrót, w przeciwnym razie ekran wraca na miejsce
  - czas domknięcia proporcjonalny do pozostałej drogi, min. 180 ms
- Status bar stoi. Szczegóły są bez dolnej nawigacji; nawigacja odjeżdża razem z listą.
- Na detalu: `touch-action: pan-y` (żeby gest poziomy trafiał do nas) i `overscroll-behavior: contain`.
- Historia: przy otwarciu `history.pushState`, zamknięcie na `popstate`. Dzięki temu przycisk wstecz na Androidzie i w przeglądarce działa. W trybie standalone na iOS nie ma systemowego gestu wstecz, więc nasz gest od krawędzi go zastępuje.
- Obowiązuje dla wszystkich list: Kursy, Koszty, Wypłaty (szczegóły tygodnia i miesiąca), Zmiany.

## Ograniczony ruch
Przy `prefers-reduced-motion: reduce` oba przejścia to przenikanie 150 ms bez przesunięcia. Gest powrotu nadal działa.

## Poza zakresem
Bottom sheety, toasty, skeletony i pull to refresh mają własne zasady (patrz główny brief).
