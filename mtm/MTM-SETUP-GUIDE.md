# 📋 Matomo Tag Manager - Complete Setup Guide

## Overview

This setup implements consent-based Matomo tracking:

- ✅ **Accept** → Matomo loads and tracks with cookies (normal tracking with visitor ID)
- ✅ **Partial Accept (analytics enabled)** → Same as Accept
- ❌ **Reject** → Matomo doesn't load at all (no tracking)
- ❌ **Partial Reject (analytics disabled)** → Same as Reject

**Key Principles:**
- Banner only pushes events to `_mtm` (no direct Matomo calls)
- MTM manages all Matomo loading and tracking
- No tracking before user decision
- No Matomo consent API (no `requireConsent`, `setCookieConsentGiven`, etc.)
- Normal cookie-based tracking when consent granted

---

## HTML Implementation

### Page Structure

```html
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <title>Your Site</title>
  
  <!-- Banner CSS -->
  <link rel="stylesheet" href="/path/to/zawbi_banner.css">
</head>
<body>

  <!-- Your content -->
  <h1>Your Website</h1>
  
  <!-- Consent management link (optional) -->
  <a href="#" id="manage-consent">Zarządzaj zgodami</a>
  
  <!-- ══════════════════════════════════════════ -->
  <!-- Banner SDK (before MTM)                    -->
  <!-- ══════════════════════════════════════════ -->
  <script src="/path/to/zawbi_banner.js"></script>
  <script>
    MatomoConsentSDK.init({
      policyUrl: '/web/gov/polityka-dotyczaca-cookies',
      cookieTableEnabled: false,
    });
    
    // Show banner (skip on policy page)
    if (!window.location.pathname.includes('/web/gov/polityka-dotyczaca-cookies')) {
      MatomoConsentSDK.showBanner();
    }
    
    // Manage consent button
    document.getElementById('manage-consent').addEventListener('click', function(e) {
      e.preventDefault();
      MatomoConsentSDK.showBanner({
        forceShow: true,
        forceCookiePanel: true
      });
    });
  </script>
  
  <!-- ══════════════════════════════════════════ -->
  <!-- MTM Container (after Banner)               -->
  <!-- ══════════════════════════════════════════ -->
  <script>
    var _mtm = window._mtm = window._mtm || [];
    _mtm.push({'mtm.startTime': (new Date().getTime()), 'event': 'mtm.Start'});
    (function() {
      var d=document, g=d.createElement('script'), s=d.getElementsByTagName('script')[0];
      g.async=true; 
      g.src='https://pi-ogp.coi.gov.pl/js/container_YOUR_ID.js'; 
      s.parentNode.insertBefore(g,s);
    })();
  </script>
  
  <!-- ⚠️ DO NOT add Matomo tracking snippet here! -->
  <!-- MTM will load matomo.js conditionally -->

</body>
</html>
```

**CRITICAL:** Do NOT include standard Matomo tracking snippet. MTM loads `matomo.js` conditionally.

---

## MTM Configuration

### Step 1: Create Data Layer Variable

**MTM → Variables → New Variable**

```
Name: DLV - consent_statistics
Type: Data Layer Variable
Data Layer Variable Name: consent_statistics
Default Value: (leave empty)
```

Click **[Create Variable]**

---

### Step 2: Create Triggers

#### Trigger A: Page View - All Pages

```
Name: Page View - All Pages
Type: Page View
Fire on: All Page Views
```

This trigger likely already exists in MTM.

#### Trigger B: Consent Events

```
Name: Custom Event - Consent Decision
Type: Custom Event
Event Name: (use regex matching)
  ^cookie_accept$|^cookie_reject$|^cookie_partial$
```

**Important:** Enable regex matching for event name.

---

### Step 3: Create Custom HTML Tags

#### Tag 1: CMP - Bootstrap consent state

**MTM → Tags → New Tag**

```
Name: CMP - Bootstrap consent state
Type: Custom HTML
HTML: [Paste content from mtm/bootstrap-consent-state.html]
Fire on: Page View - All Pages

⚠️ CRITICAL: Change Site ID in the HTML code!
Line: _paq.push(['setSiteId', '1']);
```

See file: `mtm/bootstrap-consent-state.html`

#### Tag 2: Matomo - Apply consent mode

**MTM → Tags → New Tag**

```
Name: Matomo - Apply consent mode
Type: Custom HTML
HTML: [Paste content from mtm/apply-consent-mode.html]
Fire on: Custom Event - Consent Decision

⚠️ CRITICAL: Change Site ID in the HTML code!
Line: _paq.push(['setSiteId', '1']);
```

See file: `mtm/apply-consent-mode.html`

---

### Step 4: Change Site ID

**In BOTH custom HTML tags, find this line:**

```javascript
_paq.push(['setSiteId', '1']); // ← CHANGE THIS!
```

**Change `'1'` to your actual Matomo Site ID.**

Find your Site ID in:
**Matomo → Administration → Websites → Manage**

---

### Step 5: Publish Container

**MTM → Versions → Publish**

```
Version Name: Consent-based tracking v2.0
Description: Banner manages consent, MTM manages Matomo loading.
             No tracking before consent. Accept = cookies + tracking.
             Reject = no Matomo at all.
```

Click **[Publish]**

---

## How It Works

### Scenario 1: First Visit (No Decision Yet)

```
1. User lands on page
2. MTM container loads
3. Bootstrap tag fires → No consent → Does nothing
4. Banner shows
5. No tracking happens
✅ CORRECT: No tracking before decision
```

### Scenario 2: User Clicks "Accept"

```
1. User clicks "Zezwól na wszystkie"
2. Banner saves to localStorage
3. Banner pushes event to _mtm:
   { event: 'cookie_accept', consent_statistics: 1, ... }
4. Apply consent tag fires
5. Tag loads matomo.js dynamically
6. After load: trackPageView sent
7. Request to matomo.php WITH cookies and visitor ID
✅ Normal tracking
```

### Scenario 3: User Clicks "Reject"

```
1. User clicks "Odrzuć"
2. Banner saves to localStorage
3. Banner pushes event to _mtm:
   { event: 'cookie_reject', consent_statistics: 0, ... }
4. Apply consent tag fires
5. Tag checks: consent_statistics = 0 → Does nothing
6. No matomo.js loaded
7. No tracking
✅ CORRECT: User rejected, no tracking
```

### Scenario 4: Return Visit (Consent Already Given)

```
1. User lands on page
2. Bootstrap tag fires
3. Tag checks localStorage → consent found
4. Tag loads matomo.js immediately
5. trackPageView sent
6. Banner doesn't show
✅ Tracking from first pageview
```

---

## Testing & Verification

### Test 1: First Visit (No Consent)

**Setup:** Clear localStorage + cookies

**Expected:**
- ❌ No `matomo.js` request
- ❌ No `matomo.php` request
- ✅ Banner visible

```javascript
typeof Matomo === 'undefined' // true
localStorage.getItem('matomoConsentChoice:v2') // null
```

### Test 2: Accept

**Steps:** Click "Zezwól na wszystkie"

**Expected:**
- ✅ `matomo.js` loads
- ✅ `matomo.php` request sent
- ✅ Cookies created: `_pk_id`, `_pk_ses`
- ✅ Banner closes

```javascript
typeof Matomo !== 'undefined' // true
localStorage.getItem('matomoConsentChoice:v2') // 'accepted'
document.cookie.includes('_pk_id') // true
```

### Test 3: Return Visit After Accept

**Setup:** Keep localStorage, reload page

**Expected:**
- ✅ `matomo.js` loads IMMEDIATELY
- ✅ `matomo.php` sent IMMEDIATELY
- ✅ Banner does NOT show

### Test 4: Reject

**Setup:** Clear localStorage, reload, click "Odrzuć"

**Expected:**
- ❌ No `matomo.js`
- ❌ No `matomo.php`
- ❌ No cookies

```javascript
typeof Matomo === 'undefined' // true
localStorage.getItem('matomoConsentChoice:v2') // 'declined'
```

### Test 5: Partial Accept (Analytics = ON)

**Steps:** Click "Spersonalizuj" → Check "Statystyczne" → "Zapisz"

**Expected:**
- ✅ Same as Accept

```javascript
localStorage.getItem('matomoConsentChoice:v2') // 'custom'
localStorage.getItem('matomoConsentStatsEnabled:v1') // '1'
```

### Test 6: Partial Reject (Analytics = OFF)

**Steps:** Click "Spersonalizuj" → Uncheck "Statystyczne" → "Zapisz"

**Expected:**
- ❌ Same as Reject

```javascript
localStorage.getItem('matomoConsentChoice:v2') // 'custom'
localStorage.getItem('matomoConsentStatsEnabled:v1') // '0'
```

---

## Debug Commands

```javascript
// Check consent state
localStorage.getItem('matomoConsentChoice:v2')
localStorage.getItem('matomoConsentStatsEnabled:v1')

// Check if Matomo loaded
typeof Matomo !== 'undefined'

// Check MTM events
_mtm.filter(item => item.event && item.event.includes('cookie'))

// Check cookies
document.cookie.split(';').filter(c => c.includes('_pk_'))

// Force show banner
MatomoConsentSDK.showBanner({ forceShow: true, forceCookiePanel: true });

// Reset consent
MatomoConsentSDK.resetConsent();
location.reload();
```

---

## Troubleshooting

### Matomo loads before consent
- Remove standard Matomo snippet from HTML
- Check all MTM tags
- Search HTML for `matomo.js`

### Matomo doesn't load after accept
- Check console for JavaScript errors
- Verify Site ID in both custom HTML tags
- Check MTM Preview mode
- Verify variable `{{DLV - consent_statistics}}` exists

### No cookies after accept
- Check browser cookie settings
- Verify normal tracking (no `requireCookieConsent`)

### Duplicate pageviews
- Check MTM Preview to see which tags fire
- Apply consent tag has duplicate check built-in

---

## Summary

### Configuration Checklist

- [ ] 1 Variable: `DLV - consent_statistics`
- [ ] 2 Triggers: Page View + Custom Event (regex)
- [ ] 2 Custom HTML Tags: Bootstrap + Apply Consent
- [ ] Site ID changed in BOTH tags
- [ ] Container published
- [ ] No standard Matomo snippet in HTML
- [ ] Banner loads before MTM

### Expected Behavior

| User Action | Matomo? | Tracking? | Cookies? |
|-------------|---------|-----------|----------|
| No decision | ❌ No | ❌ No | ❌ No |
| Accept | ✅ Yes | ✅ Yes | ✅ Yes |
| Reject | ❌ No | ❌ No | ❌ No |
| Partial (stats=1) | ✅ Yes | ✅ Yes | ✅ Yes |
| Partial (stats=0) | ❌ No | ❌ No | ❌ No |
| Return (accepted) | ✅ Immediate | ✅ Yes | ✅ Yes |
| Return (rejected) | ❌ No | ❌ No | ❌ No |

**Ready for production!** 🚀
