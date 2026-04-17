# 📇 Szybki Start - Karta Referencyjna

## Konfiguracja w Skrócie

```
┌─────────────────────────────────────────────────────────────┐
│ KONFIGURACJA MTM - PODSUMOWANIE                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ZMIENNE (1):                                                │
│ • DLV - consent_statistics (Data Layer Variable)           │
│                                                             │
│ TRIGGERY (3):                                               │
│ 1. Page View - All Pages                                   │
│ 2. Custom Event - Consent Accept                           │
│    └─ Event: cookie_accept                                 │
│ 3. Custom Event - Consent Partial Accept                   │
│    └─ Event: cookie_partial                                │
│    └─ Warunek: consent_statistics = 1                      │
│                                                             │
│ TAGI (2):                                                   │
│ 1. CMP - Bootstrap consent state (Custom HTML)             │
│    └─ Uruchamia się na: Page View - All Pages              │
│    └─ Site ID: [ZMIEŃ TO!]                                 │
│                                                             │
│ 2. Matomo - Apply consent mode (Custom HTML)               │
│    └─ Uruchamia się na: Consent Accept + Partial Accept    │
│    └─ Site ID: [ZMIEŃ TO!]                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Flow Eventów

```
Event Bannera         Trigger MTM             Rezultat
─────────────────────────────────────────────────────────────
cookie_accept     →   Consent Accept      →   Matomo ładuje się
cookie_reject     →   (brak triggera)     →   Brak Matomo
cookie_partial          Partial Accept    →   Matomo ładuje się
  (stats=1)       →     (jeśli stats=1)
cookie_partial    →   (brak triggera)     →   Brak Matomo
  (stats=0)
```

---

## Checklist

### Przed Wdrożeniem
- [ ] Zmienna stworzona: `DLV - consent_statistics`
- [ ] 3 triggery stworzone i skonfigurowane
- [ ] 2 tagi stworzone z plików HTML
- [ ] Site ID zmienione w **OBU** tagach
- [ ] Apply Consent tag ma **2 triggery** przypisane
- [ ] Container opublikowany

### Po Wdrożeniu
- [ ] Banner pojawia się przy pierwszej wizycie
- [ ] Brak Matomo przed decyzją
- [ ] Accept → matomo.js ładuje się
- [ ] Reject → brak matomo.js
- [ ] Return visit → automatyczny tracking
- [ ] Brak błędów w console

---

## Częste Błędy

❌ **Zapomnienie przypisania OBU triggerów do Apply Consent tag**
→ Tag uruchamia się tylko na Accept, nie na Partial Accept

❌ **Nie zmieniono Site ID w tagach**
→ Tracking idzie do złego site lub failuje

❌ **Pozostawienie standardowego snippetu Matomo w HTML**
→ Matomo ładuje się przed consent

❌ **Użycie regex triggera zamiast osobnych triggerów**
→ Stare podejście v1.0, nie działa z nowym kodem

---

## Szybki Debug

```javascript
// 1. Sprawdź stan zgody
localStorage.getItem('matomoConsentChoice:v2')
// 'accepted', 'declined', 'custom', null

// 2. Sprawdź czy Matomo załadowane
typeof Matomo !== 'undefined'
// true = załadowane, false = nie załadowane

// 3. Sprawdź ostatnie eventy MTM
_mtm.slice(-5)
// Ostatnie 5 itemów push'niętych do MTM

// 4. Sprawdź który trigger powinien się uruchomić
var stats = localStorage.getItem('matomoConsentStatsEnabled:v1');
var choice = localStorage.getItem('matomoConsentChoice:v2');

console.log('Powinien uruchomić się:', 
  choice === 'accepted' ? 'Accept' :
  choice === 'custom' && stats === '1' ? 'Partial Accept' :
  'Żaden'
);
```

---

## Lokalizacje Site ID

Oba tagi potrzebują zmiany Site ID!

**Plik: mtm/bootstrap-consent-state.html**
```javascript
Linia ~35: _paq.push(['setSiteId', '1']); ← Zmień to!
```

**Plik: mtm/apply-consent-mode.html**
```javascript
Linia ~36: _paq.push(['setSiteId', '1']); ← Zmień to!
```

---

## MTM Preview Checklist

Przy debugowaniu z MTM Preview:

**Sprawdź zakładkę Variables:**
- [ ] `consent_statistics` pokazuje poprawną wartość (0, 1, lub undefined)

**Sprawdź zakładkę Tags:**
- [ ] Bootstrap uruchamia się przy każdym page view
- [ ] Apply Consent uruchamia się tylko gdy consent udzielony
- [ ] Żaden tag nie uruchamia się przed decyzją usera

**Sprawdź zakładkę Triggers:**
- [ ] Page View trigger uruchamia się natychmiast
- [ ] Accept trigger uruchamia się na event cookie_accept
- [ ] Partial Accept uruchamia się na cookie_partial + stats=1

---

## Pliki Wsparcia

- `INSTALACJA-MTM.md` - Pełna instrukcja konfiguracji
- `README.md` - Ogólna dokumentacja
- `test-qa.html` - Strona testowa
- `mtm/CONSENT-LOGGING-VARIABLES.md` - Opcjonalne logowanie

---

**Wydrukuj tę kartę dla szybkiej referencji podczas konfiguracji!** 🖨️
