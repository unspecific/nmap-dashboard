function renderSVGBarChart(container, data, options = {}) {
  if (typeof container === "string") {
    container = document.getElementById(container);
  }
  if (!container) return;

  const MAX_WIDTH = options.maxWidth || 400;
  const BAR_HEIGHT = options.barHeight || 20;
  const GAP = options.gap || 8;
  const FONT_SIZE = options.fontSize || 12;
  const CHART_MARGIN = options.margin || 60;
  const MAX_BARS = options.maxBars || 10;

  const BAR_COLOR = options.barColor || '#4fc3f7';
  const TEXT_COLOR = options.textColor || '#333';
  const LABEL_COLOR = options.labelColor || '#999';

  const title = options.title || '';
  const xLabel = options.xLabel || '';
  const yLabel = options.yLabel || '';
  const scale = options.scale || 1.0;

  const entries = Object.entries(data)
    .filter(([_, val]) => typeof val === 'number' && !isNaN(val))
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_BARS);

  container.innerHTML = "";
  if (entries.length === 0) {
    container.innerHTML = '<div>No data to display</div>';
    return;
  }

  const maxValue = Math.max(...entries.map(([_, val]) => val), 1);
  const totalHeight = Math.round(((BAR_HEIGHT + GAP) * entries.length + 80) * scale);
  const totalWidth = Math.round((MAX_WIDTH + CHART_MARGIN + 40) * scale);

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${totalWidth} ${totalHeight}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.setAttribute("xmlns", svgNS);
  svg.setAttribute("font-family", "sans-serif");

  const appendText = (attrs, text) => {
    const el = document.createElementNS(svgNS, "text");
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    el.textContent = text;
    svg.appendChild(el);
  };

  // <defs> with drop shadow
  const defs = document.createElementNS(svgNS, "defs");
  defs.innerHTML = `
    <filter id="text-shadow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0.75" dy="0.75" stdDeviation="0.75" flood-color="black" flood-opacity="0.75"/>
    </filter>
  `;
  svg.appendChild(defs);

  if (title) {
    appendText({
      x: totalWidth / 2,
      y: 20,
      "font-size": "16",
      "text-anchor": "middle",
      fill: TEXT_COLOR
    }, title);
  }

  let y = 40;
  for (const [label, value] of entries) {
    const barWidth = Math.round((value / maxValue) * MAX_WIDTH);
    const labelY = y + BAR_HEIGHT / 2;

    const rect = document.createElementNS(svgNS, "rect");
    rect.setAttribute("x", CHART_MARGIN);
    rect.setAttribute("y", y);
    rect.setAttribute("width", barWidth);
    rect.setAttribute("height", BAR_HEIGHT);
    rect.setAttribute("fill", BAR_COLOR);
    rect.innerHTML = `<title>${label}: ${value}</title>`;
    svg.appendChild(rect);

    appendText({
      x: CHART_MARGIN + 5,
      y: labelY + 2,
      "font-size": FONT_SIZE,
      fill: "white",
      filter: "url(#text-shadow)",
      "dominant-baseline": "middle"
    }, label.length > 40 ? label.slice(0, 40) + '…' : label);

    appendText({
      x: Math.min(CHART_MARGIN + barWidth - 10, MAX_WIDTH + CHART_MARGIN - 10),
      y: labelY,
      "font-size": FONT_SIZE,
      fill: TEXT_COLOR,
      filter: "url(#text-shadow)",
      "dominant-baseline": "middle"
    }, value);
    
    y += BAR_HEIGHT + GAP;
  }

  if (xLabel) {
    appendText({
      x: CHART_MARGIN + MAX_WIDTH / 2,
      y: totalHeight - 10,
      "text-anchor": "middle",
      "font-size": FONT_SIZE,
      fill: LABEL_COLOR
    }, xLabel);
  }

  if (yLabel) {
    appendText({
      x: 15,
      y: totalHeight / 2,
      "text-anchor": "middle",
      "font-size": FONT_SIZE,
      fill: LABEL_COLOR,
      transform: `rotate(-90, 15, ${totalHeight / 2})`
    }, yLabel);
  }

  container.appendChild(svg);
}


function updatePortDistributionChartJS(scanDate) {
  const container = document.getElementById("port-chart");
  if (!container || !window.cachedScanData) return;

  const portData = window.cachedScanData.port_distribution;
  if (!portData) {
    container.innerHTML = "<div>No port distribution data available</div>";
    return;
  }

  const chartType = document.querySelector('select.chart-toggle[data-chart-id="port-chart"]')?.value || "bar";

  const options = {
    title: "Top 10 Ports Found",
    xLabel: "Number of Hosts",
    yLabel: "Ports"
  };

  if (chartType === "pie") {
    window.renderSVGPieChart(container, portData, options);
  } else {
    window.renderSVGBarChart(container, portData, options);
  }

  const svgElem = container.querySelector("svg");
  const overlay = container.parentElement?.querySelector(".svg-click-overlay");
  if (svgElem && overlay) {
    overlay.onclick = () => {
      openLightboxWithGraph(svgElem.outerHTML, "Top 10 Ports");
    };
  }
}


function updateOSDistributionChartJS(scanDate) {
  const container = document.getElementById("os-chart");
  if (!container || !window.cachedScanData) return;

  const osData = window.cachedScanData.os_distribution;
  if (!osData) {
    container.innerHTML = "<div>No OS distribution data available</div>";
    return;
  }

  renderSVGBarChart("os-chart", osData, {
    title: "Top 10 OSs Found",
    xLabel: "Number of Entries",
    yLabel: "Operating Systems"
  });

  const svgElem = container.querySelector("svg");
  const overlay = container.parentElement?.querySelector(".svg-click-overlay");
  if (svgElem && overlay) {
    overlay.onclick = () => {
      openLightboxWithGraph(svgElem.outerHTML, "Top 10 OSs");
    };
  }
}


function attachOverlayZoom(containerId, title) {
  const container = document.getElementById(containerId);
  const overlay = container?.parentElement?.querySelector(".svg-click-overlay");
  if (overlay) {
    overlay.onclick = () => {
      const svg = container.querySelector("svg");
      if (svg) {
        openLightboxWithGraph(svg.outerHTML, title);
      }
    };
  }
}


function renderSVGPieChart(container, data, options = {}) {
  container.innerHTML = "";

  const total = Object.values(data).reduce((sum, val) => sum + val, 0);
  const scale = options.scale || 1.0;
  const baseSize = 350;
  const width = baseSize * scale;
  const height = baseSize * scale;
  const radius = (Math.min(width, height) / 2);
  const cx = width / 2;
  const cy = height / 2;

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.setAttribute("width", `${width}`);
  svg.setAttribute("height", `${height}`);
  svg.classList.add("chart-object");
  svg.classList.add("pie-chart");


  let startAngle = 0;
  const entries = Object.entries(data);
  entries.forEach(([label, value], index) => {
    const angle = (value / total) * 2 * Math.PI;
    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(startAngle + angle);
    const y2 = cy + radius * Math.sin(startAngle + angle);
    const largeArc = angle > Math.PI ? 1 : 0;

    const path = document.createElementNS(svgNS, "path");
    const d = `M${cx},${cy} L${x1},${y1} A${radius},${radius} 0 ${largeArc} 1 ${x2},${y2} Z`;
    path.setAttribute("d", d);
    path.setAttribute("fill", options.colorMap?.[label] || `hsl(${index * 36}, 70%, 70%)`);
    path.setAttribute("stroke", "#fff");
    path.setAttribute("stroke-width", "1");
    svg.appendChild(path);

    // ✅ Label: show name (center-ish)
    const midAngle = startAngle + angle / 2;
    const labelX = cx + (radius / 1.6) * Math.cos(midAngle);
    const labelY = cy + (radius / 1.6) * Math.sin(midAngle);

    const text = document.createElementNS(svgNS, "text");
    text.setAttribute("x", labelX);
    text.setAttribute("y", labelY);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "middle");
    text.setAttribute("font-size", "10");
    text.setAttribute("font-weight", "bold"); 
    text.setAttribute("fill", "#000");
    text.textContent = label;
    svg.appendChild(text);

    // ✅ Value: place outside edge
    const outerX = cx + (radius - 10) * Math.cos(midAngle);
    const outerY = cy + (radius - 10) * Math.sin(midAngle);

    const valText = document.createElementNS(svgNS, "text");
    valText.setAttribute("x", outerX);
    valText.setAttribute("y", outerY);
    valText.setAttribute("text-anchor", "middle");
    valText.setAttribute("dominant-baseline", "middle");
    valText.setAttribute("font-size", "8");
    valText.setAttribute("fill", "#333");
    valText.textContent = value;
    svg.appendChild(valText);

    startAngle += angle;
  });

  container.appendChild(svg);
}



window.renderSVGBarChart = renderSVGBarChart;
window.renderSVGPieChart = renderSVGPieChart;



