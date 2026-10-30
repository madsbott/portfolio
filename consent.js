/*! Cookie consent card for madsbott.com
 *
 *  Gate a third-party script until the visitor agrees to a category:
 *    <script type="text/plain" data-consent="statistics" src="https://example.com/analytics.js"></script>
 *  Categories: preferences | statistics | marketing
 *  Reopen the card from any element with:  data-consent-open
 *  Listen for changes:  window.addEventListener('consentchange', e => e.detail)
 */
(function () {
  'use strict';

  var KEY = 'mb_consent';
  var MAX_AGE = 60 * 60 * 24 * 365; // 12 months, in seconds
  var VERSION = 1; // bump to ask everyone again after a policy change

  var CATEGORIES = [
    { id: 'necessary', label: 'Necessary', locked: true,
      text: 'Remembers your cookie choice. The site cannot do without it.' },
    { id: 'preferences', label: 'Preferences',
      text: 'Would remember settings such as language or theme. Not used today.' },
    { id: 'statistics', label: 'Statistics',
      text: 'Would count visits in aggregate to improve the site. Not used today.' },
    { id: 'marketing', label: 'Marketing',
      text: 'Would follow visitors across sites for advertising. Not used today.' }
  ];

  var COOKIES = [
    { name: 'mb_consent', purpose: 'Stores your cookie choice', expiry: '12 months', type: 'Cookie / local storage' }
  ];

  var card, lastFocus = null;

  /* ------------------------------------------------------------ storage */
  // Cookie first; local and session storage as fallbacks, because some
  // browsers do not keep cookies for pages opened straight from disk.
  function readRaw() {
    var m = document.cookie.match(/(?:^|; )mb_consent=([^;]*)/);
    if (m) { try { return decodeURIComponent(m[1]); } catch (e) {} }
    try { var a = localStorage.getItem(KEY); if (a) return a; } catch (e) {}
    try { var b = sessionStorage.getItem(KEY); if (b) return b; } catch (e) {}
    return null;
  }

  function read() {
    var raw = readRaw();
    if (!raw) return null;
    try {
      var c = JSON.parse(raw);
      if (!c || c.v !== VERSION) return null;
      if (c.ts && (Date.now() - Date.parse(c.ts)) / 1000 > MAX_AGE) return null;
      return c;
    } catch (e) { return null; }
  }

  function write(choice) {
    choice.v = VERSION;
    choice.necessary = true;
    choice.ts = new Date().toISOString();
    var raw = JSON.stringify(choice);
    try {
      document.cookie = KEY + '=' + encodeURIComponent(raw) + '; max-age=' + MAX_AGE +
        '; path=/; SameSite=Lax' + (location.protocol === 'https:' ? '; Secure' : '');
    } catch (e) {}
    try { localStorage.setItem(KEY, raw); } catch (e) {}
    try { sessionStorage.setItem(KEY, raw); } catch (e) {}
  }

  /* ------------------------------------------------------ script gating */
  function activate(choice) {
    var nodes = document.querySelectorAll('script[type="text/plain"][data-consent]');
    Array.prototype.forEach.call(nodes, function (old) {
      if (old.getAttribute('data-activated')) return;
      if (!choice[old.getAttribute('data-consent')]) return;
      var s = document.createElement('script');
      Array.prototype.forEach.call(old.attributes, function (a) {
        if (a.name !== 'type' && a.name !== 'data-consent' && a.name !== 'data-activated') s.setAttribute(a.name, a.value);
      });
      s.text = old.text;
      old.setAttribute('data-activated', '1');
      old.parentNode.insertBefore(s, old.nextSibling);
    });
    window.dispatchEvent(new CustomEvent('consentchange', { detail: choice }));
  }

  /* ----------------------------------------------------------------- UI */
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function rows() {
    return CATEGORIES.map(function (c) {
      return '<li class="cb-row">' +
        '<div class="cb-row-text"><strong>' + esc(c.label) + '</strong><span>' + esc(c.text) + '</span></div>' +
        '<label class="cb-switch"><input type="checkbox" data-cat="' + c.id + '"' + (c.locked ? ' checked disabled' : '') + '>' +
        '<span class="cb-track" aria-hidden="true"></span><span class="cb-sr">' + esc(c.label) + (c.locked ? ' (always on)' : '') + '</span></label>' +
        '</li>';
    }).join('');
  }

  function cookieTable() {
    return '<div class="cb-table-wrap"><table><thead><tr><th>Name</th><th>Purpose</th><th>Expiry</th><th>Type</th></tr></thead><tbody>' +
      COOKIES.map(function (k) {
        return '<tr><td>' + esc(k.name) + '</td><td>' + esc(k.purpose) + '</td><td>' + esc(k.expiry) + '</td><td>' + esc(k.type) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function build() {
    card = document.createElement('section');
    card.className = 'cb-card';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'false');
    card.setAttribute('aria-labelledby', 'cb-title');
    card.tabIndex = -1;
    card.hidden = true;
    card.innerHTML =
      '<h2 id="cb-title">Cookies, briefly</h2>' +
      '<p class="cb-lead">This site sets one cookie, to remember your choice. Anything else only loads if you say yes.</p>' +
      '<div class="cb-main">' +
        '<button type="button" class="cb-btn cb-primary" data-cb="all">Accept all</button>' +
        '<button type="button" class="cb-btn" data-cb="deny">Only necessary</button>' +
      '</div>' +
      '<button type="button" class="cb-more" aria-expanded="false" aria-controls="cb-panel"><span>Customize</span><svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" focusable="false"><path d="M2 4.5 6 8.5 10 4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      '<div id="cb-panel" class="cb-panel" hidden>' +
        '<ul class="cb-rows">' + rows() + '</ul>' +
        '<details class="cb-cookies"><summary>Cookies in use (' + COOKIES.length + ')</summary>' + cookieTable() + '</details>' +
        '<button type="button" class="cb-btn cb-save" data-cb="selection">Save my choices</button>' +
      '</div>' +
      '<p class="cb-foot">You can change this any time via &ldquo;Cookie Settings&rdquo; in the footer. <a href="privacy-policy.html">Privacy Policy</a></p>';

    var skip = document.querySelector('.skip');
    if (skip && skip.parentNode) skip.parentNode.insertBefore(card, skip.nextSibling);
    else document.body.insertBefore(card, document.body.firstChild);

    card.addEventListener('click', onClick);
    card.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && read()) close();
    });
  }

  function togglePanel(force) {
    var btn = card.querySelector('.cb-more');
    var panel = card.querySelector('#cb-panel');
    var open = typeof force === 'boolean' ? force : panel.hidden;
    panel.hidden = !open;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.querySelector('span').textContent = open ? 'Hide options' : 'Customize';
    btn.classList.toggle('is-open', open);
  }

  function currentChoice() {
    var c = { necessary: true };
    Array.prototype.forEach.call(card.querySelectorAll('input[data-cat]'), function (i) {
      c[i.getAttribute('data-cat')] = i.checked;
    });
    return c;
  }

  function setSwitches(choice) {
    Array.prototype.forEach.call(card.querySelectorAll('input[data-cat]'), function (i) {
      var id = i.getAttribute('data-cat');
      i.checked = id === 'necessary' ? true : !!(choice && choice[id]);
    });
  }

  function save(choice) {
    var before = read();
    write(choice);
    // A script that already ran cannot be unloaded, so reload if something was withdrawn.
    var withdrawn = before && CATEGORIES.some(function (c) { return before[c.id] && !choice[c.id]; });
    close();
    if (withdrawn) { location.reload(); return; }
    activate(choice);
  }

  function onClick(ev) {
    if (ev.target.closest('.cb-more')) { togglePanel(); return; }
    var btn = ev.target.closest('[data-cb]');
    if (!btn) return;
    var kind = btn.getAttribute('data-cb');
    if (kind === 'all') save({ necessary: true, preferences: true, statistics: true, marketing: true });
    else if (kind === 'deny') save({ necessary: true, preferences: false, statistics: false, marketing: false });
    else save(currentChoice());
  }

  function open(userInitiated) {
    if (!card) build();
    lastFocus = userInitiated ? document.activeElement : null;
    setSwitches(read());
    togglePanel(!!read()); // reopened from the footer: show the options straight away
    card.hidden = false;
    // On a first visit the card is first in tab order and is not forced onto the visitor.
    if (userInitiated) card.focus();
  }

  function close() {
    card.hidden = true;
    var target = lastFocus && document.contains(lastFocus) ? lastFocus : document.getElementById('main');
    if (target) {
      if (!target.hasAttribute('tabindex') && target.id === 'main') target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    }
    lastFocus = null;
  }

  /* --------------------------------------------------------------- init */
  document.addEventListener('click', function (ev) {
    var t = ev.target.closest && ev.target.closest('[data-consent-open]');
    if (t) { ev.preventDefault(); open(true); }
  });

  function init() {
    build();
    var saved = read();
    if (saved) activate(saved);
    else open(false);
  }

  window.MBConsent = { open: function () { open(true); }, get: read };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
