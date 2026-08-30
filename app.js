import { buildScopes, parseFilename } from "./scope-parser.js?v=3";

(() => {
  "use strict";

  const imageFiles = Array.isArray(window.BF6_SCOPE_IMAGES) ? window.BF6_SCOPE_IMAGES : [];

  const elements = {
    resultsCount: document.querySelector("#results-count"),
    search: document.querySelector("#search"),
    pointOptions: document.querySelector("#point-options"),
    sort: document.querySelector("#sort-select"),
    viewOptions: document.querySelector("#view-options"),
    pictureSize: document.querySelector("#picture-size"),
    grid: document.querySelector("#scope-grid"),
    empty: document.querySelector("#empty-state"),
    clearFilters: document.querySelector("#clear-filters"),
    cardTemplate: document.querySelector("#scope-card-template"),
    compareTray: document.querySelector("#compare-tray"),
    traySummary: document.querySelector("#tray-summary"),
    trayItems: document.querySelector("#tray-items"),
    clearCompare: document.querySelector("#clear-compare"),
    copyCompare: document.querySelector("#copy-compare"),
    openCompare: document.querySelector("#open-compare"),
    compareDialog: document.querySelector("#compare-dialog"),
    dialogCopyCompare: document.querySelector("#dialog-copy-compare"),
    comparePanels: document.querySelector("#compare-panels"),
    shareStatus: document.querySelector("#share-status"),
    imageDialog: document.querySelector("#image-dialog"),
    expandedImage: document.querySelector("#expanded-image"),
    expandedName: document.querySelector("#expanded-name"),
    expandedMeta: document.querySelector("#expanded-meta"),
    expandedZoomOptions: document.querySelector("#expanded-zoom-options"),
  };

  const state = {
    query: "",
    points: "all",
    sort: "id",
    selected: [],
    activeViews: new Map(),
    view: readPreference("bf6-scopes-view", "compact"),
    pictureSize: Number(readPreference("bf6-scopes-picture-size", "340")),
  };

  const scopes = buildScopes(imageFiles, (filename) => {
    console.warn(`Skipped image with an unrecognized filename: ${filename}`);
  });

  function readPreference(key, fallback) {
    try {
      return window.localStorage.getItem(key) || fallback;
    } catch {
      return fallback;
    }
  }

  function savePreference(key, value) {
    try {
      window.localStorage.setItem(key, String(value));
    } catch {
      // The view still works when storage is disabled.
    }
  }

  function applyDisplaySettings() {
    const validViews = ["cards", "compact", "images"];
    if (!validViews.includes(state.view)) state.view = "compact";
    if (!Number.isFinite(state.pictureSize)) state.pictureSize = 340;
    state.pictureSize = Math.min(520, Math.max(120, state.pictureSize));

    elements.grid.dataset.view = state.view;
    elements.grid.style.setProperty("--tile-size", `${state.pictureSize}px`);
    elements.pictureSize.value = String(state.pictureSize);

    for (const button of elements.viewOptions.querySelectorAll(".view-button")) {
      button.setAttribute("aria-pressed", String(button.dataset.view === state.view));
    }
  }

  function formatZoom(value) {
    return `${Number(value ?? 1).toLocaleString(undefined, { maximumFractionDigits: 2 })}×`;
  }

  function pluralize(count, singular, plural = `${singular}s`) {
    return `${count} ${count === 1 ? singular : plural}`;
  }

  function activeViewFor(scope) {
    const filename = state.activeViews.get(scope.key);
    return scope.views.find((view) => view.filename === filename) || scope.views[0];
  }

  function buildPointFilters() {
    const pointValues = [...new Set(scopes.map((scope) => scope.points))].sort((a, b) => a - b);
    const options = [
      { value: "all", label: "All" },
      ...pointValues.map((points) => ({ value: String(points), label: `${points} pts` })),
    ];

    for (const option of options) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "filter-chip";
      button.dataset.points = option.value;
      button.textContent = option.label;
      button.setAttribute("aria-pressed", String(option.value === state.points));
      button.addEventListener("click", () => {
        state.points = option.value;
        for (const chip of elements.pointOptions.querySelectorAll(".filter-chip")) {
          chip.setAttribute("aria-pressed", String(chip === button));
        }
        renderCatalog();
      });
      elements.pointOptions.append(button);
    }
  }

  function filteredScopes() {
    const query = state.query.trim().toLowerCase();
    const result = scopes.filter((scope) => {
      const matchesPoints = state.points === "all" || scope.points === Number(state.points);
      const matchesQuery = !query || scope.name.toLowerCase().includes(query);
      return matchesPoints && matchesQuery;
    });

    const comparators = {
      id: (a, b) => a.id - b.id || a.name.localeCompare(b.name),
      "zoom-asc": (a, b) => a.minZoom - b.minZoom || a.id - b.id,
      "zoom-desc": (a, b) => b.maxZoom - a.maxZoom || a.id - b.id,
      points: (a, b) => a.points - b.points || a.id - b.id,
      name: (a, b) => a.name.localeCompare(b.name),
    };

    return result.sort(comparators[state.sort] || comparators.id);
  }

  function selectedIndex(filename) {
    return state.selected.findIndex((view) => view.filename === filename);
  }

  function viewFromShareValue(value) {
    const exactView = scopes.flatMap((scope) => scope.views).find((view) => view.filename === value);
    if (exactView) return exactView;

    // If a point-cost rename changed the filename, recover the comparison by
    // matching the organizational ID and zoom encoded in the old filename.
    const parsed = parseFilename(value);
    if (!parsed) return null;
    const scope = scopes.find((item) => item.id === parsed.id);
    return scope?.views.find((view) => view.zoom === parsed.zoom) || scope?.views[0] || null;
  }

  function loadComparisonFromUrl() {
    const values = new URL(window.location.href).searchParams.getAll("compare");
    const uniqueViews = [];

    for (const value of values) {
      const view = viewFromShareValue(value);
      if (view && !uniqueViews.some((item) => item.filename === view.filename)) {
        uniqueViews.push(view);
      }
      if (uniqueViews.length === 2) break;
    }

    state.selected = uniqueViews;
  }

  function updateShareUrl() {
    const url = new URL(window.location.href);
    url.searchParams.delete("compare");
    for (const view of state.selected) {
      url.searchParams.append("compare", view.filename);
    }
    window.history.replaceState(null, "", url);
    return url.href;
  }

  async function copyComparisonLink() {
    if (state.selected.length !== 2) return;
    const shareUrl = updateShareUrl();
    let copied = false;

    try {
      await navigator.clipboard.writeText(shareUrl);
      copied = true;
    } catch {
      const input = document.createElement("textarea");
      input.value = shareUrl;
      input.setAttribute("readonly", "");
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.append(input);
      input.select();
      copied = document.execCommand("copy");
      input.remove();
    }

    const message = copied ? "Link copied" : "Copy the comparison URL from your address bar";
    elements.shareStatus.textContent = message;
    elements.copyCompare.textContent = message;
    elements.dialogCopyCompare.textContent = message;

    window.setTimeout(() => {
      elements.copyCompare.textContent = "Copy link";
      elements.dialogCopyCompare.textContent = "Copy link";
    }, 1800);
  }

  function syncCardSelection(card, view) {
    const button = card.querySelector(".compare-button");
    const isSelected = selectedIndex(view.filename) !== -1;
    button.classList.toggle("is-selected", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
    button.innerHTML = isSelected
      ? '<span aria-hidden="true">+</span> Remove'
      : '<span aria-hidden="true">+</span> Compare';
  }

  function setCardView(card, scope, view) {
    state.activeViews.set(scope.key, view.filename);
    const image = card.querySelector(".scope-image");
    image.classList.add("is-changing");
    image.src = view.src;
    image.alt = `${scope.name} sight picture at ${formatZoom(view.zoom)}`;
    image.onload = () => image.classList.remove("is-changing");
    card.querySelector(".active-zoom").textContent = formatZoom(view.zoom);

    for (const button of card.querySelectorAll(".zoom-button")) {
      button.setAttribute("aria-pressed", String(button.dataset.filename === view.filename));
    }

    syncCardSelection(card, view);
  }

  function createCard(scope) {
    const card = elements.cardTemplate.content.firstElementChild.cloneNode(true);
    const initialView = activeViewFor(scope);
    const image = card.querySelector(".scope-image");
    const expandButton = card.querySelector(".expand-button");
    const compareButton = card.querySelector(".compare-button");
    const zoomOptions = card.querySelector(".zoom-options");

    card.dataset.scopeKey = scope.key;
    card.querySelector(".point-badge").textContent = `${scope.points} PTS`;
    card.querySelector(".scope-name").textContent = scope.name;
    card.querySelector(".scope-name").title = scope.name;

    if (scope.views.length > 1) {
      for (const view of scope.views) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "zoom-button";
        button.dataset.filename = view.filename;
        button.textContent = formatZoom(view.zoom);
        button.setAttribute("aria-label", `Show ${scope.name} at ${formatZoom(view.zoom)}`);
        button.addEventListener("click", () => setCardView(card, scope, view));
        zoomOptions.append(button);
      }
    }

    image.addEventListener("error", () => {
      image.classList.remove("is-changing");
      image.alt = `Image unavailable for ${scope.name}`;
    });

    image.tabIndex = 0;
    image.setAttribute("role", "button");
    image.addEventListener("click", () => openExpanded(scope, activeViewFor(scope)));
    image.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openExpanded(scope, activeViewFor(scope));
      }
    });

    expandButton.addEventListener("click", () => openExpanded(scope, activeViewFor(scope)));
    compareButton.addEventListener("click", () => toggleCompare(activeViewFor(scope)));
    setCardView(card, scope, initialView);
    return card;
  }

  function renderCatalog() {
    const visibleScopes = filteredScopes();
    const fragment = document.createDocumentFragment();

    for (const scope of visibleScopes) {
      fragment.append(createCard(scope));
    }

    elements.grid.replaceChildren(fragment);
    elements.empty.hidden = visibleScopes.length !== 0;
    elements.grid.hidden = visibleScopes.length === 0;
    elements.resultsCount.textContent = `${String(visibleScopes.length).padStart(2, "0")} / ${String(scopes.length).padStart(2, "0")} scopes shown`;
  }

  function toggleCompare(view) {
    const index = selectedIndex(view.filename);

    if (index !== -1) {
      state.selected.splice(index, 1);
    } else if (state.selected.length < 2) {
      state.selected.push(view);
    } else {
      state.selected.shift();
      state.selected.push(view);
    }

    updateShareUrl();
    renderCompareTray();
    updateVisibleCardSelections();
  }

  function updateVisibleCardSelections() {
    for (const card of elements.grid.querySelectorAll(".scope-card")) {
      const scope = scopes.find((item) => item.key === card.dataset.scopeKey);
      if (scope) syncCardSelection(card, activeViewFor(scope));
    }
  }

  function renderCompareTray() {
    elements.compareTray.hidden = state.selected.length === 0;
    elements.openCompare.disabled = state.selected.length !== 2;
    elements.copyCompare.disabled = state.selected.length !== 2;
    elements.traySummary.textContent =
      state.selected.length === 2 ? "Ready for visual comparison" : "Choose one more sight picture";

    const items = state.selected.map((view) => {
      const item = document.createElement("div");
      item.className = "tray-item";
      const image = document.createElement("img");
      image.src = view.src;
      image.alt = "";
      const label = document.createElement("span");
      label.textContent = `${view.name} · ${formatZoom(view.zoom)}`;
      item.append(image, label);
      return item;
    });
    elements.trayItems.replaceChildren(...items);
  }

  function openComparison() {
    if (state.selected.length !== 2) return;

    const panels = state.selected.map((view) => {
      const figure = document.createElement("figure");
      figure.className = "compare-panel";
      const imageWrap = document.createElement("div");
      imageWrap.className = "compare-panel-image";
      const image = document.createElement("img");
      image.src = view.src;
      image.alt = `${view.name} sight picture at ${formatZoom(view.zoom)}`;
      const caption = document.createElement("figcaption");
      const name = document.createElement("span");
      name.className = "compare-panel-name";
      name.textContent = view.name;
      const meta = document.createElement("span");
      meta.className = "compare-panel-meta";
      meta.textContent = `${formatZoom(view.zoom)} · ${view.points} PTS`;
      imageWrap.append(image);
      caption.append(name, meta);
      figure.append(imageWrap, caption);
      return figure;
    });

    elements.comparePanels.replaceChildren(...panels);
    elements.compareDialog.showModal();
  }

  function setExpandedView(scope, view) {
    state.activeViews.set(scope.key, view.filename);
    elements.expandedImage.src = view.src;
    elements.expandedImage.alt = `${scope.name} sight picture at ${formatZoom(view.zoom)}`;
    elements.expandedMeta.textContent = `${formatZoom(view.zoom)} · ${scope.points} PTS`;

    for (const button of elements.expandedZoomOptions.querySelectorAll(".zoom-button")) {
      button.setAttribute("aria-pressed", String(button.dataset.filename === view.filename));
    }

    const visibleCard = [...elements.grid.querySelectorAll(".scope-card")].find(
      (card) => card.dataset.scopeKey === scope.key,
    );
    if (visibleCard) setCardView(visibleCard, scope, view);
  }

  function openExpanded(scope, view) {
    elements.expandedName.textContent = scope.name;

    const zoomButtons = scope.views.length > 1
      ? scope.views.map((scopeView) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "zoom-button";
          button.dataset.filename = scopeView.filename;
          button.textContent = formatZoom(scopeView.zoom);
          button.setAttribute("aria-label", `Show ${scope.name} at ${formatZoom(scopeView.zoom)}`);
          button.addEventListener("click", () => setExpandedView(scope, scopeView));
          return button;
        })
      : [];

    elements.expandedZoomOptions.replaceChildren(...zoomButtons);
    setExpandedView(scope, view);
    elements.imageDialog.showModal();
  }

  function closeOnBackdrop(dialog, event) {
    if (event.target === dialog) dialog.close();
  }

  elements.search.addEventListener("input", (event) => {
    state.query = event.target.value;
    renderCatalog();
  });

  elements.sort.addEventListener("change", (event) => {
    state.sort = event.target.value;
    renderCatalog();
  });

  elements.viewOptions.addEventListener("click", (event) => {
    const button = event.target.closest(".view-button");
    if (!button) return;
    state.view = button.dataset.view;
    savePreference("bf6-scopes-view", state.view);
    applyDisplaySettings();
  });

  elements.pictureSize.addEventListener("input", (event) => {
    state.pictureSize = Number(event.target.value);
    savePreference("bf6-scopes-picture-size", state.pictureSize);
    applyDisplaySettings();
  });

  elements.clearFilters.addEventListener("click", () => {
    state.query = "";
    state.points = "all";
    state.sort = "id";
    elements.search.value = "";
    elements.sort.value = "id";
    for (const chip of elements.pointOptions.querySelectorAll(".filter-chip")) {
      chip.setAttribute("aria-pressed", String(chip.dataset.points === "all"));
    }
    renderCatalog();
  });

  elements.clearCompare.addEventListener("click", () => {
    state.selected = [];
    updateShareUrl();
    renderCompareTray();
    updateVisibleCardSelections();
  });

  elements.copyCompare.addEventListener("click", copyComparisonLink);
  elements.dialogCopyCompare.addEventListener("click", copyComparisonLink);
  elements.openCompare.addEventListener("click", openComparison);
  elements.compareDialog.addEventListener("click", (event) => closeOnBackdrop(elements.compareDialog, event));
  elements.imageDialog.addEventListener("click", (event) => closeOnBackdrop(elements.imageDialog, event));
  elements.expandedImage.addEventListener("click", () => elements.imageDialog.close());
  elements.expandedImage.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      elements.imageDialog.close();
    }
  });

  buildPointFilters();
  loadComparisonFromUrl();
  applyDisplaySettings();
  renderCatalog();
  renderCompareTray();

  if (state.selected.length === 2) {
    window.setTimeout(openComparison, 0);
  }
})();
