console.log("Hosts tab JS loaded");

function loadAndRenderHosts(scanDate) {
  console.log("Scan date selected:", scanDate);
  fetch(`cgi-bin/get-scan-data.py?date=${scanDate}`)
    .then(res => res.json())
    .then(data => {
      const hosts = data.hosts || {};
      renderHostsTable(hosts);
    })
    .catch(err => console.error("Failed to load hosts data:", err));
}

function renderHostsTable(hosts) {
  const container = document.getElementById("hosts-table-container");
  container.innerHTML = "";

  const table = document.createElement("table");
  table.classList.add("data-table");

  const headers = ["IP", "Hostname", "OS", "Port", "State", "Service", "Product", "Version"];
  const thead = table.createTHead();

  // Add filter input row
  const filterRow = thead.insertRow();
  headers.forEach(() => {
    const td = document.createElement("td");
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Filter...";
    input.style.width = "95%";
    input.dataset.filter = "true";
    td.appendChild(input);
    filterRow.appendChild(td);
  });

  // Add clickable sortable header row
  const headerRow = thead.insertRow();
  headers.forEach((header, index) => {
    const th = document.createElement("th");
    th.textContent = header;
    th.style.textAlign = "left";
    th.style.cursor = "pointer";
    th.dataset.index = index;
    th.dataset.order = "asc";
    th.addEventListener("click", () => {
      sortTable(tbody, index, th.dataset.order === "asc");
      th.dataset.order = th.dataset.order === "asc" ? "desc" : "asc";
    });
    headerRow.appendChild(th);
  });

  const tbody = table.createTBody();

  const bandColors = ["#909090", "#626262", "#3c3c3c"]; 
  let colorIndex = 0;

  Object.entries(hosts).forEach(([ip, info]) => {
    const ports = Object.entries(info.ports || {});
    if (ports.length === 0) return;

    const rowColor = bandColors[colorIndex % bandColors.length];
    colorIndex++;

    ports.forEach(([port, pinfo], i) => {
      const row = tbody.insertRow();
      if (i === 0) {
        row.style.borderTop = "2px solid #666";
        row.style.borderRadius = "8px 8px 0 0";
      }
      if (i === ports.length - 1) {
        row.style.borderBottom = "2px solid #666";
        row.style.borderRadius = "0 0 8px 8px";
      }
      // row.style.backgroundColor = rowColor;

      const cells = [
        `<span class="host-ip" data-ip="${ip}">${ip}</span>`,
        info.hostname || "",
        info.os || "",
        port,
        pinfo.state || "",
        pinfo.service || "",
        pinfo.product || "",
        pinfo.version || "",
      ];

      cells.forEach(cellText => {
        const td = document.createElement("td");
        // td.textContent = cellText;
        td.innerHTML = cellText;
        row.appendChild(td);
      });
    });
    const spacerRow = tbody.insertRow();
    const spacerCell = document.createElement("td");
    spacerCell.colSpan = 8; // match your number of columns
    spacerCell.style.height = "1px";
    spacerCell.style.border = "none";
    spacerCell.style.background = "#f9f9f9"; // optional
    spacerRow.appendChild(spacerCell);
  });

  container.appendChild(table);
  // Enable filters
  thead.querySelectorAll("input[data-filter]").forEach((input, colIndex) => {
    input.addEventListener("input", () => {
      const query = input.value.toLowerCase();
      Array.from(tbody.querySelectorAll("tr")).forEach(row => {
        if (row.children.length === 1) return; // spacer row
        const cell = row.cells[colIndex];
        const value = cell?.textContent?.toLowerCase() || "";
        row.style.display = value.includes(query) ? "" : "none";
      });
    });
  });


  document.querySelectorAll('.host-ip').forEach(el => {
    el.addEventListener('click', () => {
      const ip = el.dataset.ip;
      document.querySelectorAll('.host-ip').forEach(el => {
        el.addEventListener('click', () => {
          const ip = el.dataset.ip;
          const host = hosts[ip];
          if (!host) return;

          // Build content
          const mac = host.mac || 'N/A';
          const vendor = host.vendor ? ` (${host.vendor})` : '';
          const os = host.os || 'Unknown';
          const scanType = 'syn';
          const scanTime = '2025-05-27 13:12 UTC'; // You can update this later
          const open = host.open_ports || 0;
          const closed = host.closed_ports || 0;
          const filtered = host.filtered_ports || 0;
          const total = open + closed + filtered || 1000;

          const openPorts = Object.entries(host.ports || {})
            .filter(([_, p]) => p.state === 'open')
            .map(([port, p]) => 
              `- ${port}  ${p.service || ''}    ${p.product || ''} ${p.version || ''} [${p.state} | reason: ${p.reason || ''}]`)
            .join('<br>');

            const html = `
              <div class="dashboard-card">
                <div class="host-row"><strong>MAC:</strong> ${mac}${vendor}</div>
                <div class="host-row"><strong>OS:</strong> ${os}</div>
              </div>

              <div class="dashboard-card">
                <div><strong>Scan Type:</strong> ${scanType}</div>
                <div><strong>Time:</strong> ${scanTime}</div>
                <div><strong>Ports Scanned:</strong> ${total} (Open: ${open}, Closed: ${closed}, Filtered: ${filtered})</div>
              </div>

              <div class="dashboard-card">
                <h3>Open Ports</h3>
                <table class="port-table data-table">
                  <thead>
                    <tr><th>Port</th><th>Service</th><th>Product</th><th>Version</th><th>State</th><th>Reason</th></tr>
                  </thead>
                  <tbody>
                    ${Object.entries(host.ports || {})
                      .filter(([_, p]) => p.state === 'open')
                      .map(([port, p]) => `
                        <tr>
                          <td>${port}</td>
                          <td>${p.service || ''}</td>
                          <td>${p.product || ''}</td>
                          <td>${p.version || ''}</td>
                          <td>${p.state}</td>
                          <td>${p.reason || ''}</td>
                        </tr>
                      `).join('')}
                  </tbody>
                </table>
              </div>
            `;


          // Replace lightbox SVG with custom HTML
          const svgEl = document.getElementById('lightbox-svg');
          svgEl.style.display = 'none';

          const existing = document.getElementById('host-detail-block');
          if (existing) existing.remove();

          const infoBlock = document.createElement('div');
          infoBlock.id = 'host-detail-block';
          infoBlock.innerHTML = html;
          svgEl.after(infoBlock);

          document.getElementById('lightbox-title').innerText = `${ip}`;
          document.getElementById('lightbox').classList.remove('hidden');
        });
      });

    });
  });

}

function initHostsTab() {
  const selectedDate = document.getElementById("scan-date")?.value;
  if (!selectedDate) {
    console.warn("No scan date selected");
    return;
  }
  loadAndRenderHosts(selectedDate);
}

function sortTable(tbody, colIndex, ascending) {
  // Step 1: extract data rows (skip spacer rows)
  const allRows = Array.from(tbody.querySelectorAll("tr"));
  const dataRows = allRows.filter(row => row.children.length > 1);

  // Step 2: clear tbody completely
  tbody.innerHTML = "";

  // Step 3: group rows by IP (inferred from column 0)
  const groups = {};
  dataRows.forEach(row => {
    const ip = row.cells[0]?.textContent.trim();
    if (!groups[ip]) groups[ip] = [];
    groups[ip].push(row);
  });

  // Step 4: sort groups by first row's target column
  const sortedEntries = Object.entries(groups).sort(([, aRows], [, bRows]) => {
  let cmp;
  if (colIndex === 0) {
    // Column 0 = IP, use numeric comparison
    cmp = ipToNumber(aRows[0].cells[0].textContent.trim()) - 
          ipToNumber(bRows[0].cells[0].textContent.trim());
  } else {
    // Regular string comparison
    const aText = aRows[0].cells[colIndex]?.textContent.trim().toLowerCase() || "";
    const bText = bRows[0].cells[colIndex]?.textContent.trim().toLowerCase() || "";
    cmp = aText.localeCompare(bText);
  }
  return ascending ? cmp : -cmp;
  });

  // Step 5: re-add sorted rows + spacer
  for (const [, rows] of sortedEntries) {
    rows.forEach(row => tbody.appendChild(row));

    const spacerRow = document.createElement("tr");
    const spacerCell = document.createElement("td");
    spacerCell.colSpan = 8;
    spacerCell.style.height = "1px";
    spacerCell.style.border = "none";
    spacerCell.style.background = "#f9f9f9";
    spacerRow.appendChild(spacerCell);
    tbody.appendChild(spacerRow);
  }
}

function ipToNumber(ip) {
  return ip.split('.')
           .map(octet => parseInt(octet, 10))
           .reduce((acc, octet) => (acc << 8) + octet);
}

