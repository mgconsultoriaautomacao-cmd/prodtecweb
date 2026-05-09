function mkChart(id, cfg) {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  if (charts[id]) charts[id].destroy();
  const ctx = canvas.getContext('2d');
  
  if (cfg.type === 'bar' && cfg.data.datasets[0]) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.8)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.05)');
    cfg.data.datasets[0].backgroundColor = gradient;
    cfg.data.datasets[0].borderColor = '#3b82f6';
    cfg.data.datasets[0].borderWidth = 1;
    cfg.data.datasets[0].borderRadius = 8;
    cfg.data.datasets[0].hoverBackgroundColor = '#60a5fa';
  }
