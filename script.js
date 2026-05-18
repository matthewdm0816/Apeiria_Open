const header = document.querySelector("[data-header]");
const navLinks = Array.from(document.querySelectorAll(".site-nav a"));
const copyButton = document.querySelector("[data-copy]");
const peekTargets = Array.from(document.querySelectorAll("[data-peek-section]"));
const teaserViewers = Array.from(document.querySelectorAll("[data-teaser-viewer]"));
const themeToggle = document.querySelector("[data-theme-toggle]");
const themeToggleText = document.querySelector("[data-theme-toggle-text]");
const themeMeta = document.querySelector('meta[name="theme-color"]');
const projectsMenu = document.querySelector("[data-projects-menu]");
const projectsMenuTrigger = document.querySelector("[data-projects-menu-trigger]");
const footnoteLinks = Array.from(
  document.querySelectorAll(".footnote-ref[href^='#'], .footnote-backref[href^='#']")
);
const modularityCard = document.querySelector("[data-modularity-card]");
const modularityChartCanvas = document.querySelector("[data-modularity-chart]");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const themeStorageKey = "apeiria-theme";
const themeMedia = window.matchMedia("(prefers-color-scheme: dark)");
const modularityLabels = [
  "Self",
  "Opus",
  "SegDINO",
  "Full",
  ["Oracle", "upper bound"],
];
const modularityOracleIndex = modularityLabels.length - 1;
const modularitySeries = {
  scanRefer: [58.4, 58.6, 60.4, 60.5, 61.3],
  multi3DRefer: [59.2, 59.5, 60.6, 60.9, 61.3],
};
const modularityDeltas = [
  "baseline",
  "+0.2/+0.3",
  "+2.0/+1.4",
  "+2.1/+1.7",
  "Upper bound",
];
let modularityChart;

const getCssVar = (name) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const getModularityLabel = (index) => {
  const label = modularityLabels[index];
  return Array.isArray(label) ? label.join(" ") : label;
};

function createBarGradient(context, startColor, endColor) {
  const { chart } = context;
  const { chartArea } = chart;

  if (!chartArea) return endColor;

  const gradient = chart.ctx.createLinearGradient(
    0,
    chartArea.top,
    0,
    chartArea.bottom
  );

  gradient.addColorStop(0, startColor);
  gradient.addColorStop(1, endColor);
  return gradient;
}

function createModularityBarGradient(context, startColor, endColor) {
  const isOracle = context.dataIndex === modularityOracleIndex;
  return createBarGradient(
    context,
    isOracle ? getCssVar("--chart-oracle-start") : startColor,
    isOracle ? getCssVar("--chart-oracle-end") : endColor
  );
}

const modularityOracleGuidePlugin = {
  id: "modularityOracleGuide",
  beforeDatasetsDraw(chart) {
    const { ctx, chartArea, scales } = chart;

    if (!chartArea || !scales?.x || !scales?.y) return;

    const previousX = scales.x.getPixelForValue(modularityOracleIndex - 1);
    const oracleX = scales.x.getPixelForValue(modularityOracleIndex);
    const separatorX = (previousX + oracleX) / 2;
    const oracleY = scales.y.getPixelForValue(
      Math.max(
        modularitySeries.scanRefer[modularityOracleIndex],
        modularitySeries.multi3DRefer[modularityOracleIndex]
      )
    );

    ctx.save();
    ctx.fillStyle = getCssVar("--chart-oracle-fill");
    ctx.fillRect(
      separatorX,
      chartArea.top,
      chartArea.right - separatorX,
      chartArea.bottom - chartArea.top
    );

    ctx.strokeStyle = getCssVar("--chart-oracle-line");
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(separatorX, chartArea.top);
    ctx.lineTo(separatorX, chartArea.bottom);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(separatorX + 10, oracleY);
    ctx.lineTo(chartArea.right, oracleY);
    ctx.stroke();
    ctx.restore();
  },
};

const modularityDeltaPlugin = {
  id: "modularityDeltaLabels",
  afterDatasetsDraw(chart) {
    const { ctx, chartArea, scales } = chart;
    const scanMeta = chart.getDatasetMeta(0);
    const m3dMeta = chart.getDatasetMeta(1);

    if (!scanMeta?.data?.length || !m3dMeta?.data?.length) return;

    ctx.save();
    ctx.font = `700 10px ${getCssVar("--font-sans")}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    modularityDeltas.forEach((delta, index) => {
      if (index === 0) return;

      const isOracle = index === modularityOracleIndex;
      const scanBar = scanMeta.data[index];
      const m3dBar = m3dMeta.data[index];
      const x = (scanBar.x + m3dBar.x) / 2;
      const yValue = Math.max(
        modularitySeries.scanRefer[index],
        modularitySeries.multi3DRefer[index]
      );
      const y = Math.max(chartArea.top + 12, scales.y.getPixelForValue(yValue) - 14);
      const metrics = ctx.measureText(delta);
      const width = metrics.width + 12;
      const height = 18;
      const radius = 6;
      const left = x - width / 2;
      const top = y - height / 2;

      ctx.beginPath();
      ctx.moveTo(left + radius, top);
      ctx.lineTo(left + width - radius, top);
      ctx.quadraticCurveTo(left + width, top, left + width, top + radius);
      ctx.lineTo(left + width, top + height - radius);
      ctx.quadraticCurveTo(left + width, top + height, left + width - radius, top + height);
      ctx.lineTo(left + radius, top + height);
      ctx.quadraticCurveTo(left, top + height, left, top + height - radius);
      ctx.lineTo(left, top + radius);
      ctx.quadraticCurveTo(left, top, left + radius, top);
      ctx.closePath();
      ctx.fillStyle = isOracle
        ? getCssVar("--chart-oracle-fill")
        : getCssVar("--chart-delta-bg");
      ctx.fill();
      if (isOracle) {
        ctx.strokeStyle = getCssVar("--chart-oracle-line");
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.fillStyle = isOracle
        ? getCssVar("--chart-oracle-text")
        : getCssVar("--chart-delta-text");
      ctx.fillText(delta, x, y + 0.5);
    });

    ctx.restore();
  },
};

const buildModularityChartData = () => ({
  labels: modularityLabels,
  datasets: [
    {
      label: "ScanRefer Acc@0.25",
      data: modularitySeries.scanRefer,
      backgroundColor: (context) =>
        createModularityBarGradient(
          context,
          getCssVar("--chart-scan-start"),
          getCssVar("--chart-scan-end")
        ),
      borderColor: (context) =>
        context.dataIndex === modularityOracleIndex
          ? getCssVar("--chart-oracle-line")
          : getCssVar("--chart-scan-end"),
      borderWidth: (context) => (context.dataIndex === modularityOracleIndex ? 1 : 0),
      borderRadius: 6,
      borderSkipped: false,
    },
    {
      label: "Multi3DRefer F1@0.25",
      data: modularitySeries.multi3DRefer,
      backgroundColor: (context) =>
        createModularityBarGradient(
          context,
          getCssVar("--chart-m3d-start"),
          getCssVar("--chart-m3d-end")
        ),
      borderColor: (context) =>
        context.dataIndex === modularityOracleIndex
          ? getCssVar("--chart-oracle-line")
          : getCssVar("--chart-m3d-end"),
      borderWidth: (context) => (context.dataIndex === modularityOracleIndex ? 1 : 0),
      borderRadius: 6,
      borderSkipped: false,
    },
  ],
});

const buildModularityChartOptions = () => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: reduceMotion ? false : { duration: 500, easing: "easeOutQuart" },
  interaction: {
    intersect: false,
    mode: "index",
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
      ticks: {
        autoSkip: false,
        color: (context) =>
          context.index === modularityOracleIndex
            ? getCssVar("--chart-oracle-text")
            : getCssVar("--module-value"),
        maxRotation: 0,
        font: {
          family: getCssVar("--font-sans"),
          size: 11,
          weight: 750,
        },
      },
    },
    y: {
      min: 56,
      max: 62,
      border: {
        color: getCssVar("--brand-border"),
      },
      grid: {
        color: getCssVar("--chart-grid"),
      },
      ticks: {
        stepSize: 1,
        color: getCssVar("--module-axis"),
        font: {
          family: getCssVar("--font-sans"),
          size: 12,
          weight: 750,
        },
      },
    },
  },
  plugins: {
    legend: {
      position: "bottom",
      labels: {
        boxWidth: 10,
        boxHeight: 10,
        color: getCssVar("--muted"),
        padding: 14,
        font: {
          family: getCssVar("--font-sans"),
          size: 12,
          weight: 750,
        },
      },
    },
    tooltip: {
      backgroundColor: getCssVar("--code-bg"),
      borderColor: getCssVar("--line"),
      borderWidth: 1,
      titleColor: getCssVar("--code-text"),
      bodyColor: getCssVar("--code-text"),
      displayColors: true,
      callbacks: {
        title: (items) => getModularityLabel(items[0].dataIndex),
        afterLabel: (item) => {
          if (item.dataIndex === modularityOracleIndex) {
            return "Role: oracle upper bound reference.";
          }

          const baseline =
            item.datasetIndex === 0
              ? modularitySeries.scanRefer[0]
              : modularitySeries.multi3DRefer[0];
          const delta = item.raw - baseline;
          const sign = delta >= 0 ? "+" : "";
          return `Change from self baseline: ${sign}${delta.toFixed(1)}`;
        },
      },
    },
  },
});

function updateModularityChartTheme() {
  if (!modularityChart) return;

  modularityChart.data = buildModularityChartData();
  modularityChart.options = buildModularityChartOptions();
  modularityChart.update(reduceMotion ? "none" : "active");
}

function initModularityChart() {
  if (!modularityChartCanvas || typeof Chart === "undefined") return;

  modularityChart = new Chart(modularityChartCanvas, {
    type: "bar",
    data: buildModularityChartData(),
    options: buildModularityChartOptions(),
    plugins: [modularityOracleGuidePlugin, modularityDeltaPlugin],
  });

  modularityCard?.classList.add("is-chart-ready");
}

const getStoredTheme = () => {
  try {
    const theme = localStorage.getItem(themeStorageKey);
    return theme === "dark" || theme === "light" ? theme : null;
  } catch {
    return null;
  }
};

const getTheme = () =>
  document.documentElement.dataset.theme === "dark" ? "dark" : "light";

const setTheme = (theme, persist = false) => {
  const nextTheme = theme === "dark" ? "dark" : "light";
  const nextLabel =
    nextTheme === "dark" ? "Switch to light mode" : "Switch to dark mode";

  document.documentElement.dataset.theme = nextTheme;
  themeMeta?.setAttribute("content", nextTheme === "dark" ? "#0d1314" : "#f7fbfb");
  themeToggle?.setAttribute("aria-label", nextLabel);
  themeToggle?.setAttribute("title", nextLabel);
  themeToggle?.setAttribute("aria-pressed", String(nextTheme === "dark"));

  if (themeToggleText) {
    themeToggleText.textContent = nextLabel;
  }

  updateModularityChartTheme();

  if (persist) {
    try {
      localStorage.setItem(themeStorageKey, nextTheme);
    } catch {
      return;
    }
  }
};

setTheme(getTheme());

themeToggle?.addEventListener("click", () => {
  setTheme(getTheme() === "dark" ? "light" : "dark", true);
});

const setProjectsMenuExpanded = (expanded) => {
  projectsMenuTrigger?.setAttribute("aria-expanded", String(expanded));
};

if (projectsMenu && projectsMenuTrigger) {
  projectsMenu.addEventListener("pointerenter", () => {
    projectsMenu.classList.remove("is-dismissed");
    setProjectsMenuExpanded(true);
  });

  projectsMenu.addEventListener("pointerleave", () => {
    projectsMenu.classList.remove("is-dismissed");
    setProjectsMenuExpanded(false);
  });

  projectsMenu.addEventListener("focusin", () => {
    if (!projectsMenu.classList.contains("is-dismissed")) {
      setProjectsMenuExpanded(true);
    }
  });

  projectsMenu.addEventListener("focusout", (event) => {
    if (!projectsMenu.contains(event.relatedTarget)) {
      projectsMenu.classList.remove("is-dismissed");
      setProjectsMenuExpanded(false);
    }
  });

  projectsMenuTrigger.addEventListener("click", () => {
    projectsMenu.classList.add("is-dismissed");
    setProjectsMenuExpanded(false);
  });

  projectsMenu.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;

    projectsMenu.classList.add("is-dismissed");
    setProjectsMenuExpanded(false);
    projectsMenuTrigger.focus();
  });
}

const syncSystemTheme = (event) => {
  if (getStoredTheme()) return;
  setTheme(event.matches ? "dark" : "light");
};

if (themeMedia.addEventListener) {
  themeMedia.addEventListener("change", syncSystemTheme);
} else if (themeMedia.addListener) {
  themeMedia.addListener(syncSystemTheme);
}

const updateHeader = () => {
  header?.classList.toggle("is-scrolled", window.scrollY > 12);
};

window.addEventListener("scroll", updateHeader, { passive: true });
updateHeader();

const sections = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

const observer = new IntersectionObserver(
  (entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

    if (!visible) return;

    navLinks.forEach((link) => {
      link.classList.toggle(
        "is-active",
        link.getAttribute("href") === `#${visible.target.id}`
      );
    });
  },
  { rootMargin: "-25% 0px -60% 0px", threshold: [0.12, 0.4, 0.7] }
);

sections.forEach((section) => observer.observe(section));

const peekObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      entry.target.classList.toggle("is-peek-visible", entry.isIntersecting);
    });
  },
  { rootMargin: "-18% 0px -24% 0px", threshold: 0.35 }
);

peekTargets.forEach((target) => peekObserver.observe(target));

teaserViewers.forEach((viewer) => {
  const track = viewer.querySelector("[data-teaser-track]");
  const tabs = Array.from(viewer.querySelectorAll("[data-teaser-index]"));
  const slides = Array.from(viewer.querySelectorAll("[data-teaser-slide]"));

  if (!track || !tabs.length || !slides.length) return;

  const scrollToSlide = (index, behavior = "smooth") => {
    const slide = slides[index];

    if (!slide) return;

    const left =
      slide.offsetLeft - track.offsetLeft - (track.clientWidth - slide.clientWidth) / 2;

    track.scrollTo({
      left: Math.max(0, left),
      behavior: reduceMotion ? "auto" : behavior,
    });
  };

  const setActive = (index) => {
    tabs.forEach((tab, tabIndex) => {
      const isActive = tabIndex === index;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-pressed", String(isActive));
    });

    slides.forEach((slide, slideIndex) => {
      slide.classList.toggle("is-active", slideIndex === index);
    });
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const index = Number(tab.dataset.teaserIndex);
      const slide = slides[index];

      if (!slide) return;

      setActive(index);
      scrollToSlide(index);
    });
  });

  const teaserObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (!visible) return;

      const index = slides.indexOf(visible.target);
      if (index >= 0) setActive(index);
    },
    { root: track, threshold: [0.55, 0.72] }
  );

  slides.forEach((slide) => teaserObserver.observe(slide));

  const initialIndex = Math.max(
    0,
    tabs.findIndex((tab) => tab.classList.contains("is-active"))
  );

  setActive(initialIndex);
  requestAnimationFrame(() => scrollToSlide(initialIndex, "auto"));
});

initModularityChart();

footnoteLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    const targetId = link.getAttribute("href");
    const target = targetId ? document.querySelector(targetId) : null;

    if (!target) return;

    event.preventDefault();
    target.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "center",
      inline: "nearest",
    });

    if (window.history?.pushState) {
      window.history.pushState(null, "", targetId);
    }

    target.focus?.({ preventScroll: true });
  });
});

copyButton?.addEventListener("click", async () => {
  const target = document.querySelector(copyButton.dataset.copy);
  const text = target?.innerText.trim();

  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
    copyButton.textContent = "Copied";
    setTimeout(() => {
      copyButton.textContent = "Copy";
    }, 1400);
  } catch {
    copyButton.textContent = "Select";
  }
});
