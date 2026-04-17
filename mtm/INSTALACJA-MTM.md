# 📋 Matomo Tag Manager - Instrukcja Instalacji

## Przegląd

Implementacja consent-based trackingu dla Matomo:

- ✅ **Accept** → Matomo ładuje się i trackuje z cookies + visitor ID
- ✅ **Partial Accept (analytics włączone)** → Jak Accept
- ❌ **Reject** → Matomo się w ogóle nie ładuje
- ❌ **Partial Reject (analytics wyłączone)** → Jak Reject

**Kluczowe Zasady:**
- Banner tylko push'uje eventy do `_mtm`
- MTM zarządza ładowaniem Matomo
- Brak trackingu przed decyzją usera
- Normalne trackowanie z cookies (bez Matomo consent API)
- Triggery używają warunków, NIE zmiennej {{Event}}

---

## Implementacja HTML

```html
<!DOCTYPE html>
<html lang="pl">
<head>
  <link rel="stylesheet" href="/path/to/zawbi_banner.css">
</head>
<body>

  <!-- Twoja treść -->
  
  <!-- Banner SDK (przed MTM) -->
  <script src="/path/to/zawbi_banner.js"></script>
  <script>
    MatomoConsentSDK.init({
      policyUrl: '/polityka-prywatnosci',
      cookieTableEnabled: false,
    });
    
    if (!window.location.pathname.includes('/polityka-prywatnosci')) {
      MatomoConsentSDK.showBanner();
    }
    
    // Opcjonalnie: Przycisk zarządzania zgodami
    document.getElementById('manage-consent').addEventListener('click', function(e) {
      e.preventDefault();
      MatomoConsentSDK.showBanner({
        forceShow: true,
        forceCookiePanel: true
      });
    });
  </script>
  
  <!-- MTM Container (po Bannerze) -->
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
  
  <!-- NIE dodawaj snippetu Matomo! -->

</body>
</html>
```

---

## Konfiguracja MTM

### Krok 1: Stwórz Zmienną Data Layer

**MTM → Variables → New Variable**

```
Name: DLV - consent_statistics
Type: Data Layer Variable
Data Layer Variable Name: consent_statistics
Default Value: (zostaw puste)
```

---

### Krok 2: Stwórz Triggery

Potrzebujesz **3 triggery** w sumie.

#### Trigger 1: Page View - All Pages

```
Name: Page View - All Pages
Type: Page View
Fire on: All Page Views
```

(Ten trigger prawdopodobnie już istnieje)

#### Trigger 2: Consent Accept

```
Name: Custom Event - Consent Accept
Type: Custom Event
Event Name: cookie_accept
```

Prosty - uruchamia się gdy banner push'uje event `cookie_accept`.

#### Trigger 3: Consent Partial Accept

```
Name: Custom Event - Consent Partial Accept
Type: Custom Event
Event Name: cookie_partial

Warunki:
  Fire when: {{DLV - consent_statistics}} equals 1
```

Uruchamia się na `cookie_partial` ALE tylko gdy analytics włączone.

---

### Krok 3: Stwórz Tagi

#### Tag 1: CMP - Bootstrap consent state

**MTM → Tags → New Tag**

```
Name: CMP - Bootstrap consent state
Type: Custom HTML
HTML: [Wklej z mtm/bootstrap-consent-state.html]

Fire on: Page View - All Pages

⚠️ ZMIEŃ SITE ID w HTML:
   _paq.push(['setSiteId', '1']);  ← Twoje Site ID
```

#### Tag 2: Matomo - Apply consent mode

**MTM → Tags → New Tag**

```
Name: Matomo - Apply consent mode
Type: Custom HTML
HTML: [Wklej z mtm/apply-consent-mode.html]

Fire on (wybierz OBA):
  1. Custom Event - Consent Accept
  2. Custom Event - Consent Partial Accept

⚠️ ZMIEŃ SITE ID w HTML:
   _paq.push(['setSiteId', '1']);  ← Twoje Site ID
```

**Ważne:** Ten tag potrzebuje **DWÓCH triggerów** (Accept + Partial Accept).

---

### Krok 4: Zmień Site ID

W **OBU** custom HTML tagach, znajdź i zmień:

```javascript
_paq.push(['setSiteId', '1']); // ← Zmień '1' na swoje Site ID!
```

Znajdź swoje Site ID: **Matomo → Administration → Websites → Manage**

---

### Krok 5: Opublikuj

**MTM → Versions → Publish**

```
Version Name: Consent-based tracking v2.0
Description: Warunkowe ładowanie Matomo na podstawie consent
```

---

## Podsumowanie Konfiguracji

### Zmienne (1)
```
DLV - consent_statistics
```

### Triggery (3)
```
1. Page View - All Pages
2. Custom Event - Consent Accept (event: cookie_accept)
3. Custom Event - Consent Partial Accept (event: cookie_partial, gdy stats=1)
```

### Tagi (2)
```
1. Bootstrap (Custom HTML, uruchamia się na Page View)
2. Apply Consent (Custom HTML, uruchamia się na triggerach Accept)
```

---

## Opcjonalnie: Logowanie Consent Events

Jeśli chcesz logować decyzje consent w Matomo jako eventy:

1. Stwórz dodatkowe zmienne (zobacz `mtm/CONSENT-LOGGING-VARIABLES.md`)
2. Dodaj tag z `mtm/log-consent-event.html`

---

## Testowanie

### Test 1: Pierwsza Wizyta
```
Wyczyść localStorage + cookies
Załaduj stronę
Oczekiwane: Brak matomo.js, banner pojawia się
```

### Test 2: Accept
```
Kliknij "Zezwól na wszystkie"
Oczekiwane: matomo.js ładuje się, request matomo.php, cookies stworzone
```

### Test 3: Return Visit
```
Przeładuj (zostaw localStorage)
Oczekiwane: matomo.js ładuje się natychmiast, brak bannera
```

### Test 4: Reject
```
Wyczyść localStorage, kliknij "Odrzuć"
Oczekiwane: Brak matomo.js, brak trackingu
```

### Test 5: Partial Accept (stats=1)
```
"Spersonalizuj" → Zaznacz "Statystyczne" → "Zapisz"
Oczekiwane: Jak Accept
```

### Test 6: Partial Reject (stats=0)
```
"Spersonalizuj" → Odznacz "Statystyczne" → "Zapisz"
Oczekiwane: Jak Reject
```

---

## Komendy Debug

```javascript
// Sprawdź consent
localStorage.getItem('matomoConsentChoice:v2')
localStorage.getItem('matomoConsentStatsEnabled:v1')

// Sprawdź Matomo
typeof Matomo !== 'undefined'

// Sprawdź eventy
_mtm.filter(item => item.event && item.event.includes('cookie'))

// Sprawdź cookies
document.cookie.split(';').filter(c => c.includes('_pk_'))
```

---

## Troubleshooting

### Matomo ładuje się przed consent
- Usuń standardowy snippet Matomo z HTML
- Sprawdź czy żaden inny tag nie ładuje Matomo

### Matomo nie ładuje się po accept
- Sprawdź console pod kątem błędów
- Zweryfikuj Site ID w obu tagach
- Użyj MTM Preview aby zobaczyć które tagi się uruchamiają
- Zweryfikuj że zmienna `{{DLV - consent_statistics}}` istnieje

### Apply Consent tag się nie uruchamia
- Sprawdź czy ma OBA triggery (Accept + Partial Accept)
- Zweryfikuj że triggery są poprawnie skonfigurowane
- Użyj MTM Preview do debugowania

---

## Oczekiwane Zachowanie

| Akcja Usera | Matomo? | Tracking? | Cookies? | Visitor ID? |
|-------------|---------|-----------|----------|-------------|
| Brak decyzji | ❌ | ❌ | ❌ | ❌ |
| Accept | ✅ | ✅ | ✅ | ✅ |
| Reject | ❌ | ❌ | ❌ | ❌ |
| Partial (stats=1) | ✅ | ✅ | ✅ | ✅ |
| Partial (stats=0) | ❌ | ❌ | ❌ | ❌ |
| Return (accepted) | ✅ Natychmiast | ✅ | ✅ | ✅ |
| Return (rejected) | ❌ | ❌ | ❌ | ❌ |

---

**Gotowe do produkcji!** 🚀
