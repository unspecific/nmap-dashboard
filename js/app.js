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

      if (tabId === 'hosts') {
        initHostsTab();
      }
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

      loadAndCacheScanData(scanDates[0]).then(() => {
        if (!window.cachedScanData) return;

        loadSummaryForDate(scanDates[0]);
        updatePortDistributionChartJS(scanDates[0]);
        updateOSDistributionChartJS(scanDates[0]);
        setupChartToggles(scanDates[0]);
      });

      // updatePortDistributionChart(scanDates[0]);
      // updatePortHostGraph(scanDates[0]);
      // updateServiceSankey(scanDates[0]);
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

function setupChartToggles(scanDate) {
  document.querySelectorAll(".chart-toggle").forEach(select => {
    const chartId = select.dataset.chartId;
    console.log("chartID:", chartId);  // Debugging output
    if (!chartId) return;

    const savedType = getCookie(`chartType_${chartId}`);
    if (savedType && select.value !== savedType) {
      select.value = savedType;
    }

    select.addEventListener("change", () => {
      setCookie(`chartType_${chartId}`, select.value);
      if (chartId === "port-chart") {
        updatePortDistributionChartJS(scanDate);
      } else if (chartId === "os-chart") {
        updateOSDistributionChartJS(scanDate);
      }
    });
  });
}

  // --- On Date Change ---
  scanDateDropdown.addEventListener('change', () => {
    const selectedDate = scanDateDropdown.value;
    statusDate.textContent = formatDate(selectedDate);
    loadAndCacheScanData(selectedDate).then(() => {
      if (!window.cachedScanData) return;
        loadSummaryForDate(selectedDate);
        updatePortDistributionChartJS(selectedDate);
        updateOSDistributionChartJS(selectedDate);
        setupChartToggles(selectedDate);
    });
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

  function openLightboxWithGraph(svgContent, title = "Chart") {
      const lightbox = document.getElementById("lightbox");
      const svgContainer = document.getElementById("lightbox-svg");
      const titleElem = document.getElementById("lightbox-title");

      if (!lightbox || !svgContainer || !titleElem) {
      console.warn("Lightbox components missing in DOM.");
      return;
      }

      // Create a temporary DOM element to parse the SVG string
      const temp = document.createElement("div");
      temp.innerHTML = svgContent;
      const svg = temp.querySelector("svg");

      if (svg) {
      const vh = Math.round(window.innerHeight * 0.75);
      svg.setAttribute("height", vh);
      svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

      // Center and add top/bottom padding
      svg.style.display = "block";
      svg.style.margin = "40px auto";

      svgContainer.innerHTML = "";
      svgContainer.appendChild(svg);
      } else {
      // Fallback: dump raw content if SVG wasn't found
      svgContainer.innerHTML = svgContent;
      }

      titleElem.textContent = title;
      titleElem.style.paddingLeft = "20px";
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

  window.openLightboxWithGraph = openLightboxWithGraph;
  let hostsTabInitialized = false;
  const refreshBtn = document.getElementById("refresh-scan");

  if (refreshBtn) {
    refreshBtn.addEventListener("click", async e => {
      e.preventDefault();
      const date = document.getElementById("scan-date").value;
      if (!date) return;

      // refreshBtn.title = "Refreshing...";
      refreshBtn.classList.remove("success", "error");

      try {
        const res = await fetch(`cgi-bin/get-scan-data.py?date=${date}&rebuild=true`);
        const data = await res.json();

        if (data.error) throw new Error(data.error);

        refreshBtn.classList.add("success");
        refreshBtn.title = "Cache refreshed!";
      } catch (err) {
        console.error("Refresh failed", err);
        refreshBtn.classList.add("error");
        refreshBtn.title = "Refresh failed!";
      }

      setTimeout(() => {
        refreshBtn.classList.remove("success", "error");
        refreshBtn.title = "Refresh scan cache";
      }, 3000);

      if (window.initHostsTab) {
        window.hostsTabInitialized = false;
        initHostsTab();titleElem.style.paddingLeft = "20px";
      }
    });
  }

  function loadAndCacheScanData(date) {
    return fetch(`cgi-bin/get-scan-data.py?date=${date}`)
      .then(res => res.json())
      .then(data => {
        window.cachedScanData = data;
    })
    .catch(err => {
      console.error("Failed to load scan data:", err);
      window.cachedScanData = null;
    });
  }

});



function setCookie(name, value, days = 365) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}

function getCookie(name) {
  return document.cookie.split('; ').reduce((r, v) => {
    const parts = v.split('=');
    return parts[0] === name ? decodeURIComponent(parts[1]) : r;
  }, '');
}


function rerenderChart(chartId, selectedType) {
  switch (chartId) {
    case 'port-chart':
      updatePortChartJS(selectedType);
      break;
    case 'os-chart':
      updateOSChartJS(selectedType);
      break;
    default:
      console.warn(`Unknown chartId: ${chartId}`);
  }
}

