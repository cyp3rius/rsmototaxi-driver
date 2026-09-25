# QA checklist — RS Driver v2 (SPEC §9)

- [ ] Każdy ekran light/dark: SE, 16, Pro Max
- [ ] Przełączenie trybu systemowego bez restartu
- [ ] Duży tekst iOS bez obcięć
- [ ] Standalone (home screen), nie tylko Safari tab
- [ ] iOS ≥ 16.4 (push), zalecane 18+
- [ ] Offline w trakcie uploadu paragonu + ponowienie
- [ ] Zamknięcie w trakcie kursu live i powrót
- [ ] VoiceOver: kolejność, etykiety, dekoracyjne animacje
- [ ] Reduce Motion: crossfade zamiast Ken Burns / reflektorów
- [ ] Kontrast WCAG AA
- [ ] Powitanie czytelne na słońcu
- [ ] Login → dashboard ≤ 3.5 s (z animacjami)
- [ ] Sesja przetrwa zamknięcie aplikacji (HttpOnly refresh cookie + BFF)
- [ ] Tokeny nie są widoczne w JS / Application → Local Storage / IndexedDB (auth)
- [ ] Wszystkie requesty z sieci przeglądarki idą na same-origin `/api/...` (nie bezpośrednio na CRM)
