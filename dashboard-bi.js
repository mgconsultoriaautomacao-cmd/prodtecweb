/* PRODTECH — dashboard-bi.js : aparência gerencial dos gráficos (Chart.js). Não altera dados nem cálculos.
   Qualquer erro aqui é capturado e o gráfico original continua sendo desenhado. Para desativar: remova a tag <script>. */
(function () {
  var HIDE_COMPARISON = true; // true: a comparação "atual × anterior" vira % dentro do KPI (false mantém o gráfico)
  function css(n, f) { var v = getComputedStyle(document.documentElement).getPropertyValue(n).trim(); return v || f; }
  function fmt(v) { return v.toLocaleString('pt-BR', { maximumFractionDigits: v % 1 ? 1 : 0 }); }
  function tr(fn) { try { fn(); } catch (e) { /* nunca quebrar o gráfico */ } }

  function init() {
    if (!window.Chart || !Chart.register) { if ((init.n = (init.n || 0) + 1) < 60) setTimeout(init, 150); return; }
    tr(function () { Chart.defaults.font.family = getComputedStyle(document.body).fontFamily; Chart.defaults.font.size = 11; });
    Chart.register({
      id: 'prodtechBI',
      beforeUpdate: function (chart) {
        var o = chart.options, type = chart.config.type, acc = css('--blue', '#4cc38a'), mut = css('--muted', '#93a29a'),
            bor = css('--border', '#26302b'), card = css('--card', '#151b18'), txt = css('--text', '#e7ece8');
        var round = type === 'doughnut' || type === 'pie';
        tr(function () { o.animation = { duration: 350, easing: 'easeOutQuart' }; });
        tr(function () {
          var l = o.plugins.legend.labels; l.color = mut; l.usePointStyle = true; l.boxWidth = 8; l.padding = 14;
          var t = o.plugins.tooltip; t.backgroundColor = card; t.titleColor = txt; t.bodyColor = txt; t.borderColor = bor; t.borderWidth = 1; t.padding = 10; t.cornerRadius = 6;
        });
        tr(function () {
          var cat = o.indexAxis === 'y' ? 'y' : 'x';
          Object.keys(o.scales || {}).forEach(function (k) {
            var s = o.scales[k]; if (!s) return;
            if (round) { s.display = false; return; }
            s.ticks.color = mut; s.grid.color = bor; s.grid.display = (k !== cat);
            if (s.border) s.border.display = false; else s.grid.drawBorder = false;
          });
        });
        tr(function () { if (type === 'bar') { o.layout.padding = o.indexAxis === 'y' ? { right: 38 } : { top: 18 }; } });
        tr(function () { if (round) o.cutout = '68%'; });
        chart.data.datasets.forEach(function (ds) {
          if (type === 'bar') {
            if (typeof CanvasGradient !== 'undefined' && ds.backgroundColor instanceof CanvasGradient) { ds.backgroundColor = acc; ds.borderColor = acc; ds.hoverBackgroundColor = acc; }
            ds.borderWidth = 0; ds.borderRadius = 3; ds.maxBarThickness = 26;
          } else if (round) { ds.borderWidth = 2; ds.borderColor = card; ds.hoverOffset = 4; }
          else if (type === 'line') { ds.tension = 0.3; ds.pointRadius = 2; ds.borderWidth = 2; }
        });
      },
      afterUpdate: function (chart) {
        if (!chart.canvas || chart.canvas.id !== 'chartComparison') return;
        tr(function () {
          var d = chart.data.datasets[0].data, prev = +d[0] || 0, cur = +d[1] || 0;
          var k = document.getElementById('kpiTotalDia'); if (!k) return;
          var host = k.parentNode, el = host.querySelector('.kdelta');
          if (!el) { el = document.createElement('div'); var sub = host.querySelector('.ksub'); (sub || k).insertAdjacentElement('afterend', el); }
          if (prev > 0) {
            var p = (cur - prev) / prev * 100;
            el.className = 'kdelta ' + (p >= 0 ? 'up' : 'down');
            el.textContent = (p >= 0 ? '▲ ' : '▼ ') + Math.abs(p).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '% vs período anterior';
          } else { el.className = 'kdelta'; el.textContent = 'Sem período anterior para comparar'; }
          if (HIDE_COMPARISON) { var c = chart.canvas.closest('.card'); if (c) c.style.display = 'none'; }
        });
      },
      afterDatasetsDraw: function (chart) {
        tr(function () {
          if (chart.config.type !== 'bar' || (chart.data.labels || []).length > 24) return;
          var ctx = chart.ctx, horiz = chart.options.indexAxis === 'y';
          ctx.save(); ctx.font = '600 11px ' + Chart.defaults.font.family; ctx.fillStyle = css('--text', '#e7ece8');
          chart.data.datasets.forEach(function (ds, di) {
            if (!chart.isDatasetVisible(di)) return;
            chart.getDatasetMeta(di).data.forEach(function (el, i) {
              var v = ds.data[i]; if (typeof v !== 'number' || !v) return;
              var p = el.getProps(['x', 'y'], true);
              if (horiz) { ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(fmt(v), p.x + 6, p.y); }
              else { ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(fmt(v), p.x, p.y - 4); }
            });
          });
          ctx.restore();
        });
      }
    });
  }
  init();
})();
