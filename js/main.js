/* ============================================================
 * main.js — запуск приложения
 * ============================================================ */
(function (root) {
  'use strict';
  var LAB = root.LAB, S = LAB.state;

  LAB.renderFooter = function () {
    var f = LAB.$('#footer');
    if (!f) return;
    f.innerHTML = '<div class="in"><span>' + LAB.icon('bolt') + ' ' + LAB.esc(LAB.t('app.name')) + ' · ' + LAB.esc(LAB.t('foot.sub')) + ' · ' + (LAB.cfg.YEAR || new Date().getFullYear()) + '</span>' +
      '<span class="muted">' + LAB.esc(LAB.t('foot.note')) + '</span></div>';
  };
  var baseHeader = LAB.renderHeader;
  LAB.renderHeader = function () { baseHeader(); LAB.renderFooter(); };

  function start() {
    LAB.applyTheme();
    LAB.applyLang();
    LAB.renderHeader();
    if (!location.hash) location.hash = '#/home';
    LAB.route();
    // проверяем сессию и подтягиваем настройки/прогресс с сервера
    if (S.token && LAB.apiReady()) {
      LAB.api('me').then(function (d) {
        if (d.user) { LAB.setSession(S.token, d.user); LAB.renderHeader(); }
        return LAB.api('settingsGet');
      }).then(function (st) { S.settings = st; }).catch(function () {});
      LAB.progress.sync().then(function () { if (/^#\/(home|learn|trainer)?$/.test(location.hash)) LAB.route(true); });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})(window);
