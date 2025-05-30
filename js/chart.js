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
      y: totalHeight - 20,
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

  const cookieType = getCookie("chartType_port-chart");
  const select = document.querySelector('select.chart-toggle[data-chart-id="port-chart"]');
  const chartType = cookieType || select?.value || "bar";
  if (select && chartType !== select.value) select.value = chartType;

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

  const cookieType = getCookie("chartType_os-chart");
  const select = document.querySelector('select.chart-toggle[data-chart-id="os-chart"]');
  const chartType = cookieType || select?.value || "bar";
  if (select && chartType !== select.value) select.value = chartType;

  const options = {
    title: "Top 10 OSs Found",
    xLabel: "Number of Entries",
    yLabel: "Operating Systems"
  };

  if (chartType === "pie") {
    window.renderSVGPieChart(container, osData, options);
  } else {
    window.renderSVGBarChart(container, osData, options);
  }


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
  if (typeof container === "string") {
    container = document.getElementById(container);
  }
  if (!container) return;

  let startAngle = 0;
  
  const MAX_WIDTH = options.maxWidth || 600;
  const GAP = options.gap || 8;
  const FONT_SIZE = options.fontSize || 12;
  const CHART_MARGIN = options.margin || 5;
  const MAX_PIECES = options.maxBars || 10;

  const TEXT_COLOR = options.textColor || '#333';
  const LABEL_COLOR = options.labelColor || '#999';

  const title = options.title || '';
  const xLabel = options.xLabel || '';
  const yLabel = options.yLabel || '';
  const scale = options.scale || 1.0;

  const entries = Object.entries(data)
  .filter(([_, val]) => typeof val === 'number' && !isNaN(val))
  .sort((a, b) => b[1] - a[1])
  .slice(0, MAX_PIECES);

  const totalWidth = Math.round((MAX_WIDTH) * scale);
  const totalHeight = Math.round(((MAX_WIDTH * 2 / 3)) * scale);  // 2:3 aspect ratio from width

  const total = entries.reduce((sum, [_, val]) => sum + val, 0);
  const width = totalWidth;
  const height = totalHeight;
  const paddingTop = options.padding ? 60 : 0;
  const radius = (Math.round(width - CHART_MARGIN - GAP) / 2);
  const cx = width / 2;
  const cy = (height + paddingTop) / 2;

  container.innerHTML = "";
  if (entries.length === 0) {
    container.innerHTML = '<div>No data to display</div>';
    return;
  }
  console.log("radius",radius);   // "100%"
  console.log("width",width);   // "100%"
  console.log("height",height);  // "100%"

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  /* svg.setAttribute("width", `${width}`);
  svg.setAttribute("height", Math.round(window.innerHeight * 0.75));*/
  svg.setAttribute("xmlns", svgNS);
  svg.setAttribute("font-family", "sans-serif");
  svg.classList.add("chart-object");
  svg.classList.add("pie-chart");

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
      "font-size": FONT_SIZE,
      "text-anchor": "middle",
      fill: TEXT_COLOR
    }, title);
  }

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
    // const labelX = cx + (radius / 1.6) * Math.cos(midAngle);
    // const labelY = cy + (radius / 1.6) * Math.sin(midAngle);

    /* const text = document.createElementNS(svgNS, "text");
    text.setAttribute("x", labelX);
    text.setAttribute("y", labelY);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "middle");
    text.setAttribute("font-size", "10");
    text.setAttribute("font-weight", "bold"); 
    text.setAttribute("fill", "#000");
    text.textContent = label;
    svg.appendChild(text);*/ 

    // ✅ Value: place outside edge
    const midAngle = startAngle + angle / 2;
    const outerX = cx + (radius - 10) * Math.cos(midAngle);
    const outerY = cy + (radius - 10) * Math.sin(midAngle);

    const valText = document.createElementNS(svgNS, "text");
    valText.setAttribute("x", outerX);
    valText.setAttribute("y", outerY);
    valText.setAttribute("text-anchor", "middle");
    valText.setAttribute("dominant-baseline", "middle");
    valText.setAttribute("font-size", "12");
    valText.setAttribute("font-weight", "bold"); 
    valText.setAttribute("fill", "#333");
    valText.textContent = value;
    svg.appendChild(valText);

    startAngle += angle;
  });

  const legendX = width + 20;
  let legendY = 20;
  const legendWidth = 180;  // estimate to fit 30-char labels

  entries.forEach(([label, _], index) => {
    const color = options.colorMap?.[label] || `hsl(${index * 36}, 70%, 70%)`;

    const rect = document.createElementNS(svgNS, "rect");
    rect.setAttribute("x", legendX);
    rect.setAttribute("y", legendY);
    rect.setAttribute("width", 12);
    rect.setAttribute("height", 12);
    rect.setAttribute("fill", color);
    svg.appendChild(rect);

    const legendLabel = document.createElementNS(svgNS, "text");
    legendLabel.setAttribute("x", legendX + 18);
    legendLabel.setAttribute("y", legendY + 10);
    legendLabel.setAttribute("font-size", "10");
    legendLabel.setAttribute("fill", "#ccc");
    legendLabel.textContent = label.length > 35 ? label.slice(0, 35) + "…" : label;
    svg.appendChild(legendLabel);

    legendY += 16;
  });

  let new_width = 0;
  if ( (width + legendWidth) > MAX_WIDTH ){
    new_width = MAX_WIDTH;
  } else {
    new_width = width + legendWidth
  }

  const new_height = Math.round(new_width * 2 / 3);

  // Expand canvas width to fit legend on the right
  svg.setAttribute("viewBox", `0 0 ${new_width} ${new_height}`);
  svg.setAttribute("width", new_width);

  const ex_viewBox = svg.getAttribute("viewBox");
  const ex_width = svg.getAttribute("width");
  const ex_height = svg.getAttribute("height");

  console.log(ex_viewBox); // "0 0 400 300"
  console.log(ex_width);   // "100%"
  console.log(ex_height);  // "100%"


  container.appendChild(svg);
}


function renderTable(container, data, options = {}) {
  const entries = Object.entries(data)
    .filter(([_, val]) => typeof val === 'number' && !isNaN(val))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const table = document.createElement('table');
  table.className = 'port-table data-table sortable';

  const thead = document.createElement('thead');
  const trHead = document.createElement('tr');
  ['Label', 'Count'].forEach((text, index) => {
    const th = document.createElement('th');
    th.textContent = text;
    th.dataset.index = index;
    th.style.cursor = 'pointer';
    th.addEventListener('click', () => sortTable(table, index));
    trHead.appendChild(th);
  });
  thead.appendChild(trHead);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const [label, count] of entries) {
    const tr = document.createElement('tr');
    const tdLabel = document.createElement('td');
    tdLabel.textContent = label;
    const tdCount = document.createElement('td');
    tdCount.textContent = count;
    tr.appendChild(tdLabel);
    tr.appendChild(tdCount);
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);

  const wrapper = document.createElement('div');
  wrapper.style.display = 'flex';
  wrapper.style.flexDirection = 'column';
  wrapper.style.gap = '0.5em';

  const button = document.createElement('button');
  button.textContent = '⬇️ Export CSV';
  button.className = 'icon-button';
  button.addEventListener('click', () => exportTableToCSV(table));

  wrapper.appendChild(button);
  wrapper.appendChild(table);

  container.innerHTML = '';
  container.appendChild(wrapper);
}

function sortTable(table, colIndex) {
  const tbody = table.querySelector('tbody');
  const rows = Array.from(tbody.querySelectorAll('tr'));

  const isNumeric = !isNaN(rows[0].children[colIndex].textContent);
  const ascending = table.dataset.sortedBy === `${colIndex}-asc` ? false : true;

  rows.sort((a, b) => {
    const valA = a.children[colIndex].textContent;
    const valB = b.children[colIndex].textContent;

    return isNumeric
      ? ascending ? valA - valB : valB - valA
      : ascending ? valA.localeCompare(valB) : valB.localeCompare(valA);
  });

  tbody.innerHTML = '';
  rows.forEach(row => tbody.appendChild(row));
  table.dataset.sortedBy = `${colIndex}-${ascending ? 'asc' : 'desc'}`;
}

function exportTableToCSV(table) {
  const rows = Array.from(table.querySelectorAll('tr')).map(tr =>
    Array.from(tr.children).map(td => `"${td.textContent}"`).join(',')
  );
  const csvContent = rows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'chart-data.csv';
  a.click();
}



window.renderSVGBarChart = renderSVGBarChart;
window.renderSVGPieChart = renderSVGPieChart;



