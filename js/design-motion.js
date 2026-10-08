(() => {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const narrowScreen = window.matchMedia("(max-width: 700px)");
  const progress = document.querySelector(".reading-progress");
  const chapterLinks = [...document.querySelectorAll('.chapter-nav a[href^="#"]')];
  const chapters = chapterLinks.map(link => ({ link, section: document.querySelector(link.hash) }));
  const hero = document.querySelector(".hero");
  const heroCopy = document.querySelector(".hero-copy");
  const movingType = document.querySelector(".moving-type");
  const photos = [...document.querySelectorAll(".hero-image img, .story-photo img")];
  const visiblePhotos = new Set();
  const revealTargets = [...document.querySelectorAll(
    ".section-label, .intro-content > *, .facts > div, .section-title > *, " +
    ".space-grid > article, .story-heading > *, .story-photo, .scene-copy, " +
    ".spec-grid > article, .amenity-layout > div > h2, .amenity-list > article, " +
    ".support-grid > article, .leasing-layout > div:first-child, .lease-rows > article, " +
    ".service-layout > div, .faq-layout > div, .location-layout > div, " +
    ".travel-times > article, .transport-grid > article, .tour-heading > div, " +
    ".tour-heading > h2, .tour-steps > li"
  )];
  let revealObserver;
  let photoObserver;
  let frame = 0;
  let activeLink = null;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function reveal(element) {
    element.classList.remove("reveal-pending");
    revealObserver?.unobserve(element);
  }

  function update() {
    frame = 0;
    const height = window.innerHeight;
    const maxScroll = document.documentElement.scrollHeight - height;
    const ratio = maxScroll > 0 ? clamp(window.scrollY / maxScroll, 0, 1) : 0;
    // Read geometry before applying styles. No animation loop runs while idle.
    const current = chapters.filter(({ section }) => section && section.getBoundingClientRect().top <= height * .4).at(-1);
    const photoPositions = !reducedMotion.matches ? [...visiblePhotos].map(img => {
      const rect = img.parentElement.getBoundingClientRect();
      const distance = clamp((height / 2 - rect.top - rect.height / 2) / height, -1, 1);
      return [img, distance * (narrowScreen.matches ? 12 : 30)];
    }) : [];
    const heroRect = hero?.getBoundingClientRect();
    const typeRect = movingType?.getBoundingClientRect();

    if (progress) progress.style.transform = `scaleX(${ratio})`;
    if (activeLink !== current?.link) {
      activeLink?.removeAttribute("aria-current");
      activeLink = current?.link;
      activeLink?.setAttribute("aria-current", "location");
    }
    if (reducedMotion.matches) return;
    photoPositions.forEach(([img, offset]) => img.style.setProperty("--parallax-y", `${offset.toFixed(2)}px`));
    if (heroCopy && heroRect && heroRect.bottom > 0) {
      heroCopy.style.setProperty("--hero-y", `${clamp(-heroRect.top * .12, 0, narrowScreen.matches ? 22 : 65)}px`);
    }
    if (movingType && typeRect && typeRect.top < height && typeRect.bottom > 0) {
      movingType.style.setProperty("--type-x", `${-clamp((height - typeRect.top) / (height + typeRect.height), 0, 1) * (narrowScreen.matches ? 90 : 180)}px`);
    }
  }

  function scheduleUpdate() {
    if (!frame) frame = window.requestAnimationFrame(update);
  }

  function configureMotion() {
    revealObserver?.disconnect();
    photoObserver?.disconnect();
    visiblePhotos.clear();
    revealTargets.forEach(reveal);
    photos.forEach(img => {
      img.classList.remove("motion-image");
      img.style.removeProperty("--parallax-y");
    });
    heroCopy?.classList.remove("motion-copy");
    movingType?.classList.remove("motion-type");
    if (reducedMotion.matches || !("IntersectionObserver" in window)) {
      scheduleUpdate();
      return;
    }

    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) reveal(entry.target); });
    }, { threshold: 0, rootMargin: "0px 0px -6% 0px" });

    revealTargets.forEach(element => {
      element.classList.add("reveal-ready");
      if (element.matches("figure")) element.classList.add("reveal-image");
      // Do not hide content already reached, including anchor navigation/restored scroll.
      if (element.getBoundingClientRect().top < window.innerHeight * .94) return;
      const siblings = [...element.parentElement.children];
      element.style.setProperty("--reveal-delay", `${Math.min(siblings.indexOf(element) % 3, 2) * 85}ms`);
      element.classList.add("reveal-pending");
      revealObserver.observe(element);
    });
    photoObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const img = entry.target.querySelector("img");
        if (!img) return;
        if (entry.isIntersecting) visiblePhotos.add(img);
        else visiblePhotos.delete(img);
      });
      scheduleUpdate();
    }, { rootMargin: "80px" });
    photos.forEach(img => {
      img.classList.add("motion-image");
      photoObserver.observe(img.parentElement);
    });
    heroCopy?.classList.add("motion-copy");
    movingType?.classList.add("motion-type");
    scheduleUpdate();
  }

  // Keyboard navigation never lands in visually hidden content.
  document.addEventListener("focusin", event => {
    let target = event.target.closest(".reveal-pending");
    while (target) { reveal(target); target = target.parentElement?.closest(".reveal-pending"); }
  });
  document.addEventListener("toggle", scheduleUpdate, true);
  window.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", scheduleUpdate, { passive: true });
  window.addEventListener("load", scheduleUpdate, { once: true });
  window.addEventListener("pageshow", scheduleUpdate);
  reducedMotion.addEventListener("change", configureMotion);
  configureMotion();
})();
