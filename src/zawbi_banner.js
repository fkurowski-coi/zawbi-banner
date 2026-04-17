/**
 * Matomo Consent Banner SDK
 * Wersja: 2.0.0 - Zarządzanie przez MTM
 */

"use strict";

function _typeof(obj) { 
  if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { 
    _typeof = function _typeof(obj) { return typeof obj; }; 
  } else { 
    _typeof = function _typeof(obj) { 
      return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; 
    }; 
  } 
  return _typeof(obj); 
}

(function (root, factory) {
  if ((typeof module === "undefined" ? "undefined" : _typeof(module)) === 'object' && module.exports) {
    module.exports = factory(); // CommonJS (Node, bundlery)
  } else {
    root.MatomoConsentSDK = factory(); // global w przeglądarce
  }
})(typeof self !== 'undefined' ? self : void 0, function () {
  
  var DEFAULT_CONFIG = {
    // Czy wymusić pokazanie bannera nawet jeśli decyzja już była zapisana
    forceShow: false,
    // Czy pokazać panel szczegółów i ustawień od razu
    forceCookiePanel: false,
    // Czy przed pokazaniem wyczyścić wybór i zgody (do testów)
    resetChoice: false,
    // Link do polityki prywatności
    policyUrl: "/polityka-prywatnosci",
    // Wersja bannera - logowana w eventach
    bannerVersion: "2.0.0",
    // Tabela cookies - włącz/wyłącz
    cookieTableEnabled: true,
    // Wiersze tabeli cookies
    cookieTableRows: [
      {
        name: "_pk_id",
        purpose: "Identyfikator odwiedzającego (statystyki)",
        type: "First-party, statystyczne",
        duration: "~13 mies."
      },
      {
        name: "_pk_ses",
        purpose: "Sesja Matomo",
        type: "First-party, statystyczne",
        duration: "~30 min"
      },
      {
        name: "_pk_ref",
        purpose: "Źródło wejścia",
        type: "First-party, statystyczne",
        duration: "~6 mies."
      },
      {
        name: "mtm_consent",
        purpose: "Pamięć zgody",
        type: "First-party, funkcjonalne",
        duration: "zgodnie z remember*"
      },
      {
        name: "matomo_sessid",
        purpose: "Techniczne sesyjne",
        type: "First-party, techniczne",
        duration: "sesja"
      }
    ]
  };

  // Klucze localStorage
  var LS_KEY_CHOICE = 'matomoConsentChoice:v2'; // 'accepted' | 'declined' | 'custom'
  var LS_KEY_ID = 'matomoConsentId:v1';
  var LS_KEY_STATS = 'matomoConsentStatsEnabled:v1'; // '1' | '0'

  var runtimeConfig = Object.assign({}, DEFAULT_CONFIG);
  var bannerEl = null;
  var handlersBound = false;

  // ---- FUNKCJE POMOCNICZE ----

  /**
   * Pobierz lub stwórz unikalny ID zgody
   */
  function getOrCreateConsentId() {
    var id = null;

    try {
      id = localStorage.getItem(LS_KEY_ID);
    } catch (e) {}

    if (!id) {
      // Generuj ID w formacie: c.timestamp.random
      id = 'c.' + Date.now().toString(36) + '.' + Math.random().toString(36).slice(2, 8);

      try {
        localStorage.setItem(LS_KEY_ID, id);
      } catch (e) {}
    }

    return id;
  }

  /**
   * Push event zgody do _mtm data layer
   * To jest JEDYNE połączenie z analytics - wszystko przez MTM
   */
  function pushConsentEvent(eventName, statsEnabled) {
    var cfg = runtimeConfig || DEFAULT_CONFIG;
    
    // Przygotuj dane eventu
    var eventData = {
      event: eventName,
      consent_id: getOrCreateConsentId(),
      consent_statistics: typeof statsEnabled === 'boolean' ? (statsEnabled ? 1 : 0) : null,
      consent_url: location.pathname,
      banner_version: cfg.bannerVersion || '2.0.0',
      consent_datetime: new Date().toISOString()
    };

    // Push do MTM data layer
    window._mtm = window._mtm || [];
    window._mtm.push(eventData);
  }

  /**
   * Zbuduj HTML bannera
   */
  function ensureHtml() {
    var existing = document.getElementById('cb2-banner');
    if (existing) return existing;
    
    var cfg = runtimeConfig || DEFAULT_CONFIG;
    var tableHtml = "";

    // Zbuduj tabelę cookies jeśli włączona
    if (cfg.cookieTableEnabled !== false && Array.isArray(cfg.cookieTableRows) && cfg.cookieTableRows.length) {
      var rowsHtml = cfg.cookieTableRows.map(function (row) {
        return '<tr>' + 
          '<td>' + (row.name || '') + '</td>' + 
          '<td>' + (row.purpose || '') + '</td>' + 
          '<td>' + (row.type || '') + '</td>' + 
          '<td>' + (row.duration || '') + '</td>' + 
        '</tr>';
      }).join('');
      
      tableHtml = 
        '<div class="cb2-table-container">' + 
          '<table class="cb2-table" cellspacing="0" cellpadding="0" aria-label="Szczegóły plików cookie Matomo">' + 
            '<thead><tr><th>Nazwa</th><th>Cel</th><th>Typ</th><th>Okres</th></tr></thead>' + 
            '<tbody>' + rowsHtml + '</tbody>' + 
          '</table>' + 
        '</div>';
    }

    var div = document.createElement('div');
    div.id = 'cb2-banner';
    div.className = 'cb2-wrap';
    div.setAttribute('role', 'dialog');
    div.setAttribute('aria-live', 'polite');
    div.setAttribute('aria-label', 'Ustawienia plików cookie');
    div.setAttribute('data-open', 'false');
    div.style.display = 'none';
    
    div.innerHTML = 
      '<div class="cb2-inner">' + 
      '  <div class="cb2-row">' + 
      '    <div class="cb2-col-text" id="cb2-desc">' + 
      '      <div class="cb2-title">Dbamy o Twoją prywatność</div>' + 
      '      <div class="cb2-desc">' + 
      '        Wykorzystujemy pliki cookie w celu zapewnienia prawidłowego funkcjonowania naszej witryny oraz do analizy ruchu i optymalizacji działania strony.' +
      '        Dzięki nim możemy lepiej dostosować treści do potrzeb użytkowników i stale ulepszać nasze usługi.' +
      '        Pamiętaj, że informacje przechowywane w plikach cookie mogą pozwalać na identyfikację konkretnego urządzenia lub przeglądarki użytkownika, a więc potencjalnie stanowić dane osobowe.' +
      '        <span class="cb2-hint"><a class="cb2-link" href="' + cfg.policyUrl + '" rel="nofollow noopener">Polityka cookies</a></span>' + 
      '      </div>' + 
      '      <div id="cb2-panel" class="cb2-panel form" hidden aria-label="Szczegóły i ustawienia">' + 
      '        <ul class="cb2-cats">' + 
      '          <li class="cb2-switch custom-checkbox">' + 
      '            <input type="checkbox" id="cb2-necessary" checked disabled>' + 
      '            <label for="cb2-necessary"><strong>Niezbędne</strong> - zawsze aktywne, wymagane do prawidłowego działania strony.</label>' + 
      '          </li>' + 
      '          <li class="cb2-switch custom-checkbox">' + 
      '            <input type="checkbox" id="cb2-stats">' + 
      '            <label for="cb2-stats"><strong>Statystyczne</strong> - pomagają analizować sposób korzystania z serwisu i ulepszać jego działanie.</label>' + 
      '          </li>' + 
      '        </ul>' + 
      tableHtml + 
      '        <div class="cb2-save-container">' + 
      '          <button id="cb2-save" class="btn btn-secondary"><span>Zapisz wybór</span></button>' + 
      '        </div>' + 
      '      </div>' + 
      '    </div>' + 
      '    <div class="cb2-actions" aria-label="Wybór zgody">' + 
      '      <button id="cb2-reject" class="btn btn-secondary"><span>Odrzuć</span></button>' + 
      '      <button id="cb2-adjust" class="btn btn-secondary" aria-expanded="false" aria-controls="cb2-panel"><span>Spersonalizuj' + 
      '        <svg xmlns="http://www.w3.org/2000/svg" width="8" height="14" viewBox="0 0 8 14" fill="none" style="margin-left:10px">' + 
      '          <path d="M0.7475 13.4975C0.5575 13.4975 0.3675 13.4275 0.2175 13.2775C-0.0725 12.9875 -0.0725 12.5075 0.2175 12.2175L5.6875 6.7475L0.2175 1.2775C-0.0725 0.9875 -0.0725 0.5075 0.2175 0.2175C0.5075 -0.0725 0.987499 -0.0725 1.2775 0.2175L7.2775 6.2175C7.4175 6.3575 7.4975 6.5475 7.4975 6.7475C7.4975 6.9475 7.4175 7.1375 7.2775 7.2775L1.2775 13.2775C1.1275 13.4275 0.9375 13.4975 0.7475 13.4975Z" fill="#0452A8"/>' + 
      '        </svg></span></button>' + 
      '      <button id="cb2-accept" class="btn btn-primary"><span>Zezwól na wszystkie</span></button>' + 
      '    </div>' + 
      '  </div>' + 
      '</div>';
    
    document.body.appendChild(div);
    return div;
  }

  /**
   * Otwórz banner
   */
  function openBanner() {
    if (!bannerEl) return;
    bannerEl.style.display = 'block';
    bannerEl.setAttribute('data-open', 'true');
  }

  /**
   * Zamknij banner
   */
  function closeBanner() {
    if (!bannerEl) return;
    bannerEl.setAttribute('data-open', 'false');
    bannerEl.style.display = 'none';
  }

  /**
   * Wyczyść wybór jeśli potrzeba (do testów)
   */
  function resetChoiceIfNeeded() {
    var cfg = runtimeConfig || DEFAULT_CONFIG;
    if (!cfg.resetChoice) return;

    try {
      localStorage.removeItem(LS_KEY_CHOICE);
    } catch (e) {}

    try {
      localStorage.removeItem(LS_KEY_ID);
    } catch (e) {}

    try {
      localStorage.removeItem(LS_KEY_STATS);
    } catch (e) {}
  }

  /**
   * Podepnij event handlery do przycisków bannera
   */
  function bindHandlersOnce() {
    if (!bannerEl || handlersBound) return;
    
    var btnAcc = bannerEl.querySelector('#cb2-accept');
    var btnRej = bannerEl.querySelector('#cb2-reject');
    var btnAdj = bannerEl.querySelector('#cb2-adjust');
    var btnSave = bannerEl.querySelector('#cb2-save');
    var panel = bannerEl.querySelector('#cb2-panel');
    var cbStats = bannerEl.querySelector('#cb2-stats');

    if (!btnAcc || !btnRej || !btnAdj || !btnSave || !panel || !cbStats) {
      return;
    }

    // Spersonalizuj - otwiera/zamyka panel
    btnAdj.addEventListener('click', function () {
      panel.hidden = !panel.hidden;
      btnAdj.setAttribute('aria-expanded', String(!panel.hidden));

      if (!panel.hidden && window.matchMedia('(max-width:640px)').matches) {
        panel.scrollIntoView({ block: 'nearest' });
      }
    });

    // Akceptacja wszystkich - event: cookie_accept
    btnAcc.addEventListener('click', function () {
      cbStats.checked = true;

      // Zapisz do localStorage
      try {
        localStorage.setItem(LS_KEY_CHOICE, 'accepted');
      } catch (e) {}

      try {
        localStorage.setItem(LS_KEY_STATS, '1');
      } catch (e) {}

      // Push event do MTM (MTM obsłuży ładowanie Matomo)
      pushConsentEvent('cookie_accept', true);
      
      closeBanner();
    });

    // Odrzucenie - event: cookie_reject
    btnRej.addEventListener('click', function () {
      cbStats.checked = false;

      // Zapisz do localStorage
      try {
        localStorage.setItem(LS_KEY_CHOICE, 'declined');
      } catch (e) {}

      try {
        localStorage.setItem(LS_KEY_STATS, '0');
      } catch (e) {}

      // Push event do MTM
      pushConsentEvent('cookie_reject', false);
      
      closeBanner();
    });

    // Zapisz wybór z panelu - event: cookie_partial
    btnSave.addEventListener('click', function () {
      var enableStats = cbStats.checked;

      // Zapisz do localStorage
      try {
        localStorage.setItem(LS_KEY_CHOICE, 'custom');
      } catch (e) {}

      try {
        localStorage.setItem(LS_KEY_STATS, enableStats ? '1' : '0');
      } catch (e) {}

      // Push event do MTM
      pushConsentEvent('cookie_partial', enableStats);
      
      closeBanner();
    });

    handlersBound = true;
  }

  // ---- PUBLICZNE API ----

  /**
   * Inicjalizuj SDK z opcjami
   */
  function init(options) {
    runtimeConfig = Object.assign({}, runtimeConfig, options || {});
    return runtimeConfig;
  }

  /**
   * Pokaż banner (główny entry point)
   */
  function showBanner(options) {
    runtimeConfig = Object.assign({}, runtimeConfig, options || {});
    bannerEl = ensureHtml();

    // Wymuś otwarcie panelu jeśli potrzeba
    if (runtimeConfig.forceCookiePanel === true) {
      var panel = bannerEl.querySelector('#cb2-panel');
      var btnAdj = bannerEl.querySelector('#cb2-adjust');
      if (panel && btnAdj) {
        panel.hidden = false;
        btnAdj.setAttribute('aria-expanded', 'true');
      }
    }

    // Reset jeśli potrzeba
    resetChoiceIfNeeded();

    // Sprawdź czy już była decyzja
    var saved = null;
    try {
      saved = localStorage.getItem(LS_KEY_CHOICE);
    } catch (e) {}

    // Ustaw checkbox zgodnie z zapisanym stanem
    try {
      var savedStats = localStorage.getItem(LS_KEY_STATS);
      var cb = bannerEl.querySelector('#cb2-stats');
      if (cb && savedStats) {
        cb.checked = (savedStats === '1');
      }
    } catch (e) {}

    // Pokaż banner jeśli nie było decyzji lub wymuszono pokazanie
    if (!saved || runtimeConfig.forceShow) {
      openBanner();
    }

    // Podepnij handlery
    bindHandlersOnce();
    
    return bannerEl;
  }

  /**
   * Wyczyść consent (do testów)
   */
  function resetConsent() {
    try {
      localStorage.removeItem(LS_KEY_CHOICE);
    } catch (e) {}

    try {
      localStorage.removeItem(LS_KEY_ID);
    } catch (e) {}

    try {
      localStorage.removeItem(LS_KEY_STATS);
    } catch (e) {}
  }

  /**
   * Pobierz aktualny stan zgody
   */
  function getConsentState() {
    try {
      return localStorage.getItem(LS_KEY_CHOICE);
    } catch (e) {
      return null;
    }
  }

  // Eksportuj publiczne API
  return {
    init: init,
    showBanner: showBanner,
    resetConsent: resetConsent,
    getConsentState: getConsentState,
    _getCurrentConfig: function () {
      return runtimeConfig;
    }
  };
});
