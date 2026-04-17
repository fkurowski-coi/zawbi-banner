# Dodatkowe Zmienne MTM dla Consent Logging

Jeśli chcesz używać tagu `log-consent-event.html` do logowania decyzji consent w Matomo, musisz stworzyć dodatkowe zmienne Data Layer:

## Zmienne do Stworzenia

### 1. DLV - consent_id
```
Name: DLV - consent_id
Type: Data Layer Variable
Data Layer Variable Name: consent_id
Default Value: (puste)
```

### 2. DLV - consent_url
```
Name: DLV - consent_url
Type: Data Layer Variable
Data Layer Variable Name: consent_url
Default Value: (puste)
```

### 3. DLV - banner_version
```
Name: DLV - banner_version
Type: Data Layer Variable
Data Layer Variable Name: banner_version
Default Value: (puste)
```

### 4. DLV - consent_datetime
```
Name: DLV - consent_datetime
Type: Data Layer Variable
Data Layer Variable Name: consent_datetime
Default Value: (puste)
```

### 5. DLV - consent_statistics (już powinna istnieć)
```
Name: DLV - consent_statistics
Type: Data Layer Variable
Data Layer Variable Name: consent_statistics
Default Value: (puste)
```

---

## Trigger dla Log Consent Tag

Stwórz dodatkowy trigger dla wszystkich consent events:

```
Name: Custom Event - All Consent Events
Type: Custom Event
Event Name: (use regex)
  ^cookie_accept$|^cookie_reject$|^cookie_partial$
```

**Uwaga:** Można użyć osobnych triggerów dla każdego eventu jak w innych tagach.

---

## Jak To Działa

1. Banner push'uje event z danymi do `_mtm`:
   ```javascript
   _mtm.push({
     event: 'cookie_accept',
     consent_id: 'c.xxx.yyy',
     consent_statistics: 1,
     consent_url: '/strona',
     banner_version: '2.0.0',
     consent_datetime: '2026-04-17T...'
   });
   ```

2. MTM zmienne odczytują dane z data layer

3. Tag `log-consent-event.html` używa tych zmiennych do stworzenia JSON payload

4. Event wysyłany do Matomo:
   ```javascript
   _paq.push(['trackEvent', 'consent', 'accepted', '{"id":"c.xxx","stats":1,...}']);
   ```

5. W Matomo można analizować:
   - Eventy → Kategoria "consent"
   - Akcje: "accepted", "rejected"
   - Label: JSON z szczegółami

---

## Opcjonalne

Jeśli NIE chcesz logować consent events w Matomo, **pomiń ten tag**.

Wystarczą tylko:
- Bootstrap consent state tag
- Apply consent mode tag

Te dwa tagi zapewniają podstawowe działanie (warunkowe ładowanie Matomo).

Tag `log-consent-event.html` jest **dodatkowy** dla analizy consent decisions.
