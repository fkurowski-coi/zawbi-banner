# Matomo consent banner + MTM

Gotowy zestaw plików do repo:
- `src/zawbi_banner.js` : banner cookies, tylko `_mtm.push(...)`, bez wywołań metod Matomo
- `src/zawbi_banner.css` : style bannera
- `mtm/bootstrap-consent-state.html` : tag Custom HTML do odczytu stanu z `localStorage`
- `mtm/apply-consent-mode.html` : tag Custom HTML do ustawienia trybu cookies / cookieless i odpalenia pageview
- `examples/implementation.html` : minimalny przykład osadzenia

## Jak osadzić banner na stronie

Dodaj CSS i JS przed snippetem MTM / Matomo:

```html
<link rel="stylesheet" href="/path/to/zawbi_banner.css">
<script src="/path/to/zawbi_banner.js"></script>
<script>
  MatomoConsentSDK.init({
    policyUrl: '/polityka-prywatnosci',
    bannerVersion: '1.0.0'
  });

  MatomoConsentSDK.showBanner();
</script>
```

Dopiero po tym wstaw snippet MTM / Matomo.

## Eventy, które banner wysyła do `_mtm`

- `cookie_banner_display`
- `cookie_accept`
- `cookie_reject`
- `cookie_partial`

Payload:

```js
{
  event,
  consent_id,
  consent_statistics,
  banner_version,
  consent_datetime
}
```

## localStorage używany przez banner

- `matomoConsentChoice:v2` : `accepted` / `declined` / `custom`
- `matomoConsentStatsEnabled:v1` : `1` / `0`
- `matomoConsentId:v1` : prosty identyfikator zgody

## MTM: wymagane zmienne

Utwórz Data Layer Variables:
- `DLV - consent_statistics`
- `DLV - consent_source_event`
- opcjonalnie `DLV - consent_id`
- opcjonalnie `DLV - banner_version`

## MTM: Matomo Configuration Variable

Ustaw:
- Matomo URL
- Site ID
- `Require Tracking Consent = ON`

Nie używaj zwykłego Pageview triggera na tagu Matomo pageview.

## MTM: tagi

### 1. CMP - Bootstrap consent state
Typ: `Custom HTML`

Wklej kod z pliku `mtm/bootstrap-consent-state.html`

Trigger:
- `Pageview - All Pages`

### 2. Matomo - Apply consent mode
Typ: `Custom HTML`

Wklej kod z pliku `mtm/apply-consent-mode.html`

Trigger:
- `Custom Event`
- regex event name:

```text
^cookie_accept$|^cookie_reject$|^cookie_partial$|^cookie_state_bootstrap$
```

### 3. Matomo - Pageview
Typ: standardowy tag Matomo Analytics

Konfiguracja:
- użyj `Matomo Configuration Variable` z `Require Tracking Consent = ON`

Trigger:
- `Custom Event`
- event name: `matomo_track_pageview`

## Logika działania

- przed decyzją usera Matomo czeka i nie wysyła pageview / eventów
- `accept` : `setConsentGiven()` -> tracking z cookies
- `reject` : `disableCookies()`, `deleteCookies()`, `setConsentGiven()` -> tracking bez cookies
- `partial` :
  - gdy `consent_statistics = 1` -> jak accept
  - gdy `consent_statistics = 0` -> jak reject
- przy kolejnej odsłonie bootstrap czyta `localStorage` i ustawia tryb bez ponownego pokazywania bannera

## Testy

### 1. Pierwsza wizyta
Wyczyść:
- `matomoConsentChoice:v2`
- `matomoConsentStatsEnabled:v1`
- `matomoConsentId:v1`
- cookies `_pk_*`

Oczekiwane:
- banner jest widoczny
- brak requestów `matomo.php` przed decyzją

### 2. Accept
Oczekiwane:
- request `matomo.php` po decyzji
- cookies `_pk_*` mogą się pojawić

### 3. Reject
Oczekiwane:
- request `matomo.php` po decyzji
- brak `_pk_*`

### 4. Partial
- z włączoną statystyką -> jak accept
- z wyłączoną statystyką -> jak reject

## Uwagi

- banner nie wywołuje metod Matomo, robi to dopiero MTM
- jeśli user zmieni decyzję w trakcie tej samej odsłony, wcześniejszy pageview mógł już zostać wysłany w poprzednim trybie
- jeśli chcesz wymusić pełne przeliczenie po zmianie zgody, najprościej zrobić reload strony po zmianie decyzji
