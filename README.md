# Matomo Consent Banner + MTM

Kompletna implementacja consent-based trackingu dla Matomo Tag Manager.

## 📦 Zawartość Paczki

### Pliki Core

```
zawbi_banner.js         # Banner SDK (UI + localStorage + eventy MTM)
zawbi_banner.css        # Style bannera
```

### Tagi MTM Custom HTML

```
mtm/
  ├── bootstrap-consent-state.html       # Bootstrap tag (page load)
  ├── apply-consent-mode.html            # Apply consent tag (akcja usera)
  └── log-consent-event.html             # Logowanie consent events (opcjonalny)
```

### Dokumentacja

```
INSTALACJA-MTM.md       # Kompletna instrukcja konfiguracji MTM
SZYBKI-START.md         # Karta referencyjna
```

### Testowanie

```
test-qa.html            # Strona testowa z symulacją MTM
```

---

## 🎯 Jak To Działa

### Architektura

```
┌─────────────────┐
│ User odwiedza   │
│    stronę       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Banner ładuje  │ ◄── zawbi_banner.js
│  się (przed MTM)│     zawbi_banner.css
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  MTM Container  │
│   ładuje się    │
└────────┬────────┘
         │
         ├──► Bootstrap Tag ──► Sprawdza localStorage
         │                      ├─ Consent? → Ładuje matomo.js
         │                      └─ Brak? → Nic nie robi
         │
         ▼
┌─────────────────┐
│  Banner pojawia │
│  się (brak      │
│  consent)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ User decyduje   │
│ Accept/Reject   │
└────────┬────────┘
         │
         ├──► Push event do _mtm
         │    (cookie_accept / cookie_reject / cookie_partial)
         │
         ▼
┌─────────────────┐
│  Apply Consent  │
│      Tag        │ ◄── Odpala na event MTM
└────────┬────────┘
         │
         ├─ Accept? → Ładuje matomo.js
         └─ Reject? → Nic nie robi
```

---

## 🚀 Implementacja

### Krok 1: Dodaj Banner do Strony

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="/path/to/zawbi_banner.css">
</head>
<body>

  <!-- Twoja treść -->
  
  <!-- Banner (przed MTM) -->
  <script src="/path/to/zawbi_banner.js"></script>
  <script>
    MatomoConsentSDK.init({
      policyUrl: '/polityka-prywatnosci',
      cookieTableEnabled: false,
    });
    
    if (!window.location.pathname.includes('/polityka-prywatnosci')) {
      MatomoConsentSDK.showBanner();
    }
  </script>
  
  <!-- MTM Container (po bannerze) -->
  <script>
    var _mtm = window._mtm = window._mtm || [];
    _mtm.push({'mtm.startTime': (new Date().getTime()), 'event': 'mtm.Start'});
    (function() {
      var d=document, g=d.createElement('script'), s=d.getElementsByTagName('script')[0];
      g.async=true; 
      g.src='https://pi-ogp.coi.gov.pl/js/container_TWOJ_ID.js'; 
      s.parentNode.insertBefore(g,s);
    })();
  </script>
  
  <!-- NIE dodawaj snippetu Matomo -->

</body>
</html>
```

### Krok 2: Konfiguracja MTM

Zobacz `INSTALACJA-MTM.md` dla pełnej instrukcji.

**Krótkie podsumowanie:**

1. Stwórz zmienną: `DLV - consent_statistics`
2. Stwórz triggery:
   - `Page View - All Pages`
   - `Custom Event - Consent Accept` (event: `cookie_accept`)
   - `Custom Event - Consent Partial Accept` (event: `cookie_partial`, gdy `consent_statistics = 1`)
3. Stwórz tagi:
   - `CMP - Bootstrap consent state` (Custom HTML, wklej z `mtm/bootstrap-consent-state.html`)
   - `Matomo - Apply consent mode` (Custom HTML, wklej z `mtm/apply-consent-mode.html`)
4. Zmień Site ID w obu tagach
5. Opublikuj container

### Krok 3: Test

Otwórz `test-qa.html` w przeglądarce aby sprawdzić:

- ❌ Brak trackingu przed decyzją
- ✅ Accept → Matomo ładuje się + trackuje
- ❌ Reject → Brak Matomo, brak trackingu
- ✅ Return visit → Automatyczny tracking na podstawie zapisanej zgody

---

## 📋 Eventy

### Eventy Bannera (push do _mtm)

```javascript
// Wyświetlenie
{
  event: 'cookie_banner_display',
  consent_id: 'c.xxx.yyy',
  consent_statistics: null,
  consent_url: '/strona',
  banner_version: '2.0.0',
  consent_datetime: '2026-04-17T...'
}

// Akceptacja
{
  event: 'cookie_accept',
  consent_id: 'c.xxx.yyy',
  consent_statistics: 1,
  consent_url: '/strona',
  banner_version: '2.0.0',
  consent_datetime: '2026-04-17T...'
}

// Odrzucenie
{
  event: 'cookie_reject',
  consent_id: 'c.xxx.yyy',
  consent_statistics: 0,
  consent_url: '/strona',
  banner_version: '2.0.0',
  consent_datetime: '2026-04-17T...'
}

// Spersonalizowane
{
  event: 'cookie_partial',
  consent_id: 'c.xxx.yyy',
  consent_statistics: 0 lub 1,  // zależnie od checkboxa
  consent_url: '/strona',
  banner_version: '2.0.0',
  consent_datetime: '2026-04-17T...'
}
```

### Logowanie Consent Events w Matomo (Opcjonalnie)

Jeśli chcesz logować decyzje consent jako eventy w Matomo:

1. Stwórz dodatkowe zmienne MTM (zobacz `mtm/CONSENT-LOGGING-VARIABLES.md`)
2. Dodaj tag `mtm/log-consent-event.html`

W Matomo zobaczysz:
- Events → Kategoria "consent"
- Akcje: "accepted", "rejected"
- Label: JSON z szczegółami

---

## 💾 LocalStorage

```javascript
// Wybór zgody
matomoConsentChoice:v2
// Wartości: 'accepted', 'declined', 'custom', lub null

// Flaga zgody na statystyki
matomoConsentStatsEnabled:v1
// Wartości: '1', '0', lub null

// ID zgody
matomoConsentId:v1
// Format: 'c.{timestamp}.{random}'
```

---

## 🧪 Testowanie

### Testowanie Manualne

1. **Pierwsza wizyta**
   ```
   Wyczyść localStorage + cookies
   Załaduj stronę
   Oczekiwane: Banner pojawia się, Matomo nie ładuje się
   ```

2. **Akceptacja**
   ```
   Kliknij "Zezwól na wszystkie"
   Oczekiwane: matomo.js ładuje się, request matomo.php, cookies stworzone
   ```

3. **Return Visit**
   ```
   Przeładuj stronę (zostaw localStorage)
   Oczekiwane: Matomo ładuje się od razu, brak bannera
   ```

4. **Odrzucenie**
   ```
   Wyczyść localStorage, kliknij "Odrzuć"
   Oczekiwane: Brak matomo.js, brak trackingu
   ```

### Automatyczne Testowanie

Otwórz `test-qa.html` i kliknij "Run All Tests"

---

## 🔧 Debugging

### Sprawdź Stan Zgody

```javascript
// Komendy console
localStorage.getItem('matomoConsentChoice:v2')
localStorage.getItem('matomoConsentStatsEnabled:v1')
typeof Matomo !== 'undefined'  // Czy Matomo załadowane?
_mtm.filter(item => item.event && item.event.includes('cookie'))
```

### MTM Preview Mode

1. MTM → Container → Preview
2. Wpisz URL strony
3. Sprawdź które tagi się uruchamiają i kiedy

---

## 📊 Oczekiwane Zachowanie

| Akcja Usera | Matomo Ładuje? | Tracking? | Cookies? |
|-------------|----------------|-----------|----------|
| Brak decyzji | ❌ Nie | ❌ Nie | ❌ Nie |
| Accept | ✅ Tak | ✅ Tak | ✅ Tak |
| Reject | ❌ Nie | ❌ Nie | ❌ Nie |
| Partial (stats=1) | ✅ Tak | ✅ Tak | ✅ Tak |
| Partial (stats=0) | ❌ Nie | ❌ Nie | ❌ Nie |
| Return (accepted) | ✅ Natychmiast | ✅ Tak | ✅ Tak |
| Return (rejected) | ❌ Nie | ❌ Nie | ❌ Nie |

---

## ⚙️ Opcje Konfiguracji

### Konfiguracja Bannera

```javascript
MatomoConsentSDK.init({
  policyUrl: '/polityka-prywatnosci',     // URL polityki cookies
  bannerVersion: '2.0.0',                  // Wersja do trackingu
  cookieTableEnabled: false,               // Pokaż tabelę cookies
  cookieTableRows: [...]                   // Dane tabeli
});
```

### Pokaż Banner

```javascript
// Normalnie
MatomoConsentSDK.showBanner();

// Wymuszenie pokazania (np. przycisk "zarządzaj zgodami")
MatomoConsentSDK.showBanner({
  forceShow: true,
  forceCookiePanel: true
});
```

### Reset Zgody

```javascript
MatomoConsentSDK.resetConsent();
location.reload();
```

---

## 🔒 Prywatność & Compliance

- ✅ Brak trackingu przed decyzją usera
- ✅ Jasne opcje accept/reject
- ✅ Kontrola granularna (partial accept)
- ✅ Trwała zgoda (localStorage)
- ✅ Respektowanie wyboru przy powrotach
- ✅ Bez "dark patterns" czy pre-zaznaczonych checkboxów

---

## 📞 Wsparcie

W razie problemów:

1. Sprawdź `INSTALACJA-MTM.md`
2. Przetestuj z `test-qa.html`
3. Użyj MTM Preview Mode
4. Sprawdź console przeglądarki pod kątem błędów

---

## ✨ Wersja

2.0.0 - Zarządzanie przez MTM
