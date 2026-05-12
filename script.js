const header = document.querySelector("[data-header]");
const navLinks = Array.from(document.querySelectorAll(".site-nav a"));
const copyButton = document.querySelector("[data-copy]");
const peekTargets = Array.from(document.querySelectorAll("[data-peek-section]"));
const teaserViewers = Array.from(document.querySelectorAll("[data-teaser-viewer]"));
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
      slide.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "nearest",
        inline: "center",
      });
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
