document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const scanDateDropdown = document.getElementById('scan-date');
  const statusDate = document.getElementById('status-date');
  const darkToggle = document.getElementById('dark-toggle');

  // --- Tab Switching ---
  tabs.forEach(button => {
    button.addEventListener('click', () => {
      tabs.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      tabContents.forEach(tab => tab.style.display = 'none');
      const tabId = button.dataset.tab;
      const content = document.getElementById(`tab-${tabId}`);
      if (content) content.style.display = 'block';
    });
  });

  // Trigger the first tab if none is selected by default
  const firstActive = document.querySelector('.tab-btn.active') || tabs[0];
  if (firstActive) firstActive.click();

  // --- Format YYYYMMDD to YYYY-MM-DD ---
  function formatDate(raw) {
    if (!raw || raw.length !== 8) return raw;
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6)}`;
  }

  // --- Load Scan Dates from CGI ---
  fetch('cgi-bin/get-scan-dates.py')
    .then(res => res.json())
    .then(scanDates => {
      if (!Array.isArray(scanDates) || scanDates.length === 0) {
        scanDateDropdown.innerHTML = `<option disabled>No scan dates found</option>`;
        return;
      }

      scanDates.forEach(date => {
        const opt = document.createElement('option');
        opt.value = date;
        opt.textContent = date;
        scanDateDropdown.appendChild(opt);
      });

      scanDateDropdown.value = scanDates[0];
      statusDate.textContent = formatDate(scanDates[0]);

      loadSummaryForDate(scanDates[0]);
      updatePortDistributionChart(scanDates[0]);
      updatePortHostGraph(scanDates[0]);
      updateServiceSankey(scanDates[0]);
    })
    .catch(err => {
      console.error("Error loading scan dates:", err);
    });

  // --- Update Sidebar Stats ---
  function loadSummaryForDate(date) {
    fetch(`cgi-bin/get-scan-summary.py?date=${date}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          console.error("Scan summary error:", data.error);
          return;
        }

        document.getElementById("status-hosts").textContent = data.total_hosts;
        document.getElementById("status-live").textContent = data.live_hosts;
        document.getElementById("status-ports").textContent = data.total_ports;
        document.getElementById("status-unique").textContent = data.unique_ports;
      })
      .catch(err => console.error("Failed to load summary:", err));
  }

  // --- Update Port Bubble Chart ---
  function updatePortBubbleChart(date) {
    const container = document.getElementById("port-distribution");
    if (!container) return;

    container.innerHTML = "";

    const obj = document.createElement("object");
    obj.setAttribute("type", "image/svg+xml");
    obj.setAttribute("data", `cgi-bin/port-bubbles.py?date=${date}`);
    obj.setAttribute("width", "100%");
    obj.setAttribute("height", "200");

    obj.addEventListener('click', () => {
      openLightboxWithGraph(`cgi-bin/port-bubbles.py?date=${date}`, "Bubble Chart");
    });

    container.appendChild(obj);
  }

  // --- On Date Change ---
  scanDateDropdown.addEventListener('change', () => {
    const selectedDate = scanDateDropdown.value;
    statusDate.textContent = formatDate(selectedDate);
    loadSummaryForDate(selectedDate);
    updatePortDistributionChart(selectedDate);
    updatePortHostGraph(selectedDate);
    updateServiceSankey(selectedDate);
  });

  // --- Dark Mode Toggle ---
  if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
    darkToggle.checked = true;
  }

  darkToggle.addEventListener('change', () => {
    const isDark = darkToggle.checked;
    if (isDark) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('darkMode', 'false');
    }
  });

  // --- Lightbox Logic ---
  function openLightboxWithGraph(svgUrl, title = "Chart") {
    const lightbox = document.getElementById("lightbox");
    const svg = document.getElementById("lightbox-svg");
    const titleElem = document.getElementById("lightbox-title");

    if (!lightbox || !svg || !titleElem) {
      console.warn("Lightbox components missing in DOM.");
      return;
    }

    svg.setAttribute("data", svgUrl);
    titleElem.textContent = title;
    lightbox.classList.remove("hidden");
  }

  document.querySelector('.lightbox-close')?.addEventListener('click', () => {
    document.getElementById('lightbox').classList.add('hidden');
  });

  document.querySelector('.lightbox-backdrop')?.addEventListener('click', () => {
    document.getElementById('lightbox').classList.add('hidden');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === "Escape") {
      document.getElementById('lightbox').classList.add('hidden');
    }
  });

  // --- Port Host Graph ---
  function updatePortHostGraph(date) {
    const obj = document.getElementById("port-host-graph");
    if (!obj) return;

    obj.setAttribute("data", `cgi-bin/port-host-graph.py?date=${date}`);
    obj.onclick = () => {
      openLightboxWithGraph(`cgi-bin/port-host-graph.py?date=${date}`, "Top 10 Port to Host");
    };
  }

  // --- Service Sankey ---
  function updateServiceSankey(date) {
    const obj = document.getElementById("services-graph");
    if (!obj) return;

    obj.setAttribute("data", `cgi-bin/port-host-sankey.py?date=${date}`);
    const overlay = obj.parentElement?.querySelector(".svg-click-overlay");
    if (overlay) {
      overlay.onclick = () => {
        openLightboxWithGraph(`cgi-bin/port-host-sankey.py?date=${date}`, "Top 10 Services");
      };
    }
  }

  // --- Port Distribution Chart ---
  function updatePortDistributionChart(date) {
    const chart = document.getElementById("port-chart");
    if (!chart) return;

    chart.setAttribute("data", `cgi-bin/port-distribution-chart.py?date=${date}`);
    const overlay = chart.parentElement?.querySelector(".svg-click-overlay");
    if (overlay) {
      overlay.onclick = () => {
        openLightboxWithGraph(`cgi-bin/port-distribution-chart.py?date=${date}`, "Top 10 Ports");
      };
    }
  }
});
