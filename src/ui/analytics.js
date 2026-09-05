/**
 * Real-time analytics bar: Hole Count, Average Spacing, Page Coverage %, and Estimated Punching Time.
 */

export function updateAnalytics(containerElement, appState) {
  const points = appState.points;
  const page = appState.getPageDimensions();
  const count = points.length;

  // 1. Estimated Punching Time (Speed = 15 holes/min default)
  const speed = appState.settings.punchSpeedPerMin || 15;
  const totalMinutes = Math.round(count / speed);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;

  // 2. Page Coverage %
  const pageAreaSqMm = page.widthMm * page.heightMm;
  const holeRadius = (appState.settings.markerDiameterMm || 0.8) / 2.0;
  const totalHoleAreaSqMm = count * Math.PI * holeRadius * holeRadius;
  const coveragePercent = pageAreaSqMm > 0 ? ((totalHoleAreaSqMm / pageAreaSqMm) * 100).toFixed(1) : '0.0';

  // 3. Average Spacing estimate
  const avgSpacing = count > 1 ? (Math.sqrt(pageAreaSqMm / count)).toFixed(1) : '0.0';

  containerElement.innerHTML = `
    <div class="stat-item">
      <span>Total Holes:</span>
      <span class="stat-val">${count.toLocaleString()}</span>
    </div>
    <div style="width:1px;height:14px;background:var(--border-color)"></div>
    <div class="stat-item">
      <span>Est. Punching Time (@${speed}/min):</span>
      <span class="stat-val" style="color:var(--accent-amber)">~${timeStr}</span>
    </div>
    <div style="width:1px;height:14px;background:var(--border-color)"></div>
    <div class="stat-item">
      <span>Avg Spacing:</span>
      <span class="stat-val">~${avgSpacing} mm</span>
    </div>
    <div style="width:1px;height:14px;background:var(--border-color)"></div>
    <div class="stat-item">
      <span>Page Coverage:</span>
      <span class="stat-val">${coveragePercent}%</span>
    </div>
  `;
}
