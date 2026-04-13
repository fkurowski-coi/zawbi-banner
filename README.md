# Matomo Consent Banner + MTM Integration

Complete consent-based tracking implementation for Matomo Tag Manager.

## 📦 Package Contents

### Core Files

```
zawbi_banner.js         # Banner SDK (UI + localStorage + MTM events)
zawbi_banner.css        # Banner styles
```

### MTM Custom HTML Tags

```
mtm/
  ├── bootstrap-consent-state.html   # Bootstrap tag (page load)
  └── apply-consent-mode.html        # Apply consent tag (user action)
```

### Documentation

```
MTM-SETUP-GUIDE.md      # Complete MTM configuration guide
```

### Testing

```
test-qa.html            # QA test page with MTM simulation
```

---

## 🎯 How It Works

### Architecture

```
┌─────────────────┐
│   User visits   │
│      page       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Banner loads   │ ◄── zawbi_banner.js
│  (before MTM)   │     zawbi_banner.css
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  MTM Container  │
│     loads       │
└────────┬────────┘
         │
         ├──► Bootstrap Tag ──► Check localStorage
         │                      ├─ Consent? → Load matomo.js
         │                      └─ No consent? → Do nothing
         │
         ▼
┌─────────────────┐
│  Banner shows   │
│  (if no consent)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  User decides   │
│  Accept/Reject  │
└────────┬────────┘
         │
         ├──► Push event to _mtm
         │    (cookie_accept / cookie_reject / cookie_partial)
         │
         ▼
┌─────────────────┐
│  Apply Consent  │
│      Tag        │ ◄── Fires on MTM event
└────────┬────────┘
         │
         ├─ Accept? → Load matomo.js
         └─ Reject? → Do nothing
```

---

## 🚀 Implementation

### Step 1: Add Banner to Page

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="/path/to/zawbi_banner.css">
</head>
<body>

  <!-- Your content -->
  
  <!-- Banner (before MTM) -->
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
  
  <!-- MTM Container (after banner) -->
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
  
  <!-- DO NOT add Matomo tracking snippet -->

</body>
</html>
```

### Step 2: Configure MTM

See `MTM-SETUP-GUIDE.md` for complete instructions.

**Quick summary:**

1. Create variable: `DLV - consent_statistics`
2. Create triggers:
   - `Page View - All Pages`
   - `Custom Event - Consent Decision` (regex: `^cookie_accept$|^cookie_reject$|^cookie_partial$`)
3. Create tags:
   - `CMP - Bootstrap consent state` (Custom HTML, paste from `mtm/bootstrap-consent-state.html`)
   - `Matomo - Apply consent mode` (Custom HTML, paste from `mtm/apply-consent-mode.html`)
4. Change Site ID in both tags
5. Publish container

### Step 3: Test

Open `test-qa.html` in browser to verify:

- ❌ No tracking before consent
- ✅ Accept → Matomo loads + tracks
- ❌ Reject → No Matomo, no tracking
- ✅ Return visit → Automatic based on saved consent

---

## 📋 Events

### Banner Events (pushed to _mtm)

```javascript
// Display
{
  event: 'cookie_banner_display',
  consent_id: 'c.xxx.yyy',
  consent_statistics: null,
  banner_version: '2.0.0',
  consent_datetime: '2026-04-10T...'
}

// Accept
{
  event: 'cookie_accept',
  consent_id: 'c.xxx.yyy',
  consent_statistics: 1,
  banner_version: '2.0.0',
  consent_datetime: '2026-04-10T...'
}

// Reject
{
  event: 'cookie_reject',
  consent_id: 'c.xxx.yyy',
  consent_statistics: 0,
  banner_version: '2.0.0',
  consent_datetime: '2026-04-10T...'
}

// Partial
{
  event: 'cookie_partial',
  consent_id: 'c.xxx.yyy',
  consent_statistics: 0 or 1,  // based on checkbox
  banner_version: '2.0.0',
  consent_datetime: '2026-04-10T...'
}
```

---

## 💾 LocalStorage

```javascript
// Consent choice
matomoConsentChoice:v2
// Values: 'accepted', 'declined', 'custom', or null

// Stats enabled flag
matomoConsentStatsEnabled:v1
// Values: '1', '0', or null

// Consent ID
matomoConsentId:v1
// Format: 'c.{timestamp}.{random}'
```

---

## 🧪 Testing

### Manual Testing

1. **First Visit**
   ```
   Clear localStorage + cookies
   Load page
   Expected: Banner shows, no Matomo loaded
   ```

2. **Accept**
   ```
   Click "Zezwól na wszystkie"
   Expected: matomo.js loads, matomo.php request, cookies created
   ```

3. **Return Visit**
   ```
   Reload page (keep localStorage)
   Expected: Matomo loads immediately, no banner
   ```

4. **Reject**
   ```
   Clear localStorage, click "Odrzuć"
   Expected: No matomo.js, no tracking
   ```

### Automated Testing

Open `test-qa.html` and click "Run All Tests"

---

## 🔧 Debugging

### Check Consent State

```javascript
// Console commands
localStorage.getItem('matomoConsentChoice:v2')
localStorage.getItem('matomoConsentStatsEnabled:v1')
typeof Matomo !== 'undefined'  // Is Matomo loaded?
_mtm.filter(item => item.event && item.event.includes('cookie'))
```

### MTM Preview Mode

1. MTM → Container → Preview
2. Enter site URL
3. Check which tags fire and when

---

## 📊 Expected Behavior

| User Action | Matomo Loads? | Tracking? | Cookies? |
|-------------|---------------|-----------|----------|
| No decision | ❌ No | ❌ No | ❌ No |
| Accept | ✅ Yes | ✅ Yes | ✅ Yes |
| Reject | ❌ No | ❌ No | ❌ No |
| Partial (stats=1) | ✅ Yes | ✅ Yes | ✅ Yes |
| Partial (stats=0) | ❌ No | ❌ No | ❌ No |
| Return (accepted) | ✅ Immediate | ✅ Yes | ✅ Yes |
| Return (rejected) | ❌ No | ❌ No | ❌ No |

---

## ⚙️ Configuration Options

### Banner Configuration

```javascript
MatomoConsentSDK.init({
  policyUrl: '/polityka-prywatnosci',     // Cookie policy URL
  bannerVersion: '2.0.0',                  // Version for tracking
  cookieTableEnabled: false,               // Show cookie table
  cookieTableRows: [...]                   // Table data
});
```

### Show Banner

```javascript
// Normal
MatomoConsentSDK.showBanner();

// Force show (e.g., manage consent button)
MatomoConsentSDK.showBanner({
  forceShow: true,
  forceCookiePanel: true
});
```

### Reset Consent

```javascript
MatomoConsentSDK.resetConsent();
location.reload();
```

---

## 🔒 Privacy & Compliance

- ✅ No tracking before user decision
- ✅ Clear accept/reject options
- ✅ Granular control (partial accept)
- ✅ Persistent consent (localStorage)
- ✅ Respects user choice on return visits
- ✅ No "dark patterns" or pre-ticked boxes

---

## 📞 Support

For issues or questions:

1. Check `MTM-SETUP-GUIDE.md`
2. Test with `test-qa.html`
3. Use MTM Preview Mode
4. Check browser console for errors

---

## 📝 License

[Your License Here]

## ✨ Version

2.0.0 - MTM Managed Tracking
