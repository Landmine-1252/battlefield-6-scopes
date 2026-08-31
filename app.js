import { buildScopes, parseFilename } from "./scope-parser.js?v=4";

(() => {
  "use strict";

  const imageFiles = Array.isArray(window.BF6_SCOPE_IMAGES) ? window.BF6_SCOPE_IMAGES : [];

  const elements = {
    resultsCount: document.querySelector("#results-count"),
    search: document.querySelector("#search"),
    pointOptions: document.querySelector("#point-options"),
    magnificationOptions: document.querySelector("#magnification-options"),
    sniperToggle: document.querySelector("#sniper-toggle"),
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
    compareModeSwitch: document.querySelector("#compare-mode-switch"),
    dialogCopyCompare: document.querySelector("#dialog-copy-compare"),
    comparePanels: document.querySelector("#compare-panels"),
    shareStatus: document.querySelector("#share-status"),
    imageDialog: document.querySelector("#image-dialog"),
    expandedImage: document.querySelector("#expanded-image"),
    expandedName: document.querySelector("#expanded-name"),
    expandedMeta: document.querySelector("#expanded-meta"),
    expandedNote: document.querySelector("#expanded-note"),
    expandedZoomOptions: document.querySelector("#expanded-zoom-options"),
  };

  const state = {
    query: "",
    points: new Set(),
    magnifications: new Set(),
    showSniperScopes: true,
    sort: "default",
    selected: [],
    activeViews: new Map(),
    compareMode: "side-by-side",
    compareSplit: 50,
    view: readPreference("bf6-scopes-view", "compact"),
    pictureSize: Number(readPreference("bf6-scopes-picture-size", "340")),
  };

  const scopes = buildScopes(imageFiles, (filename) => {
    console.warn(`Skipped image with an unrecognized filename: ${filename}`);
  });
  const scopeNotes = new Map([
    [1, "Sniper rifle exception: iron sights cost 15 points and have no scope glint."],
  ]);
  const SNIPER_SCOPE_MIN_ZOOM = 6;

  function isSniperOnly(scope) {
    return scope.maxZoom >= SNIPER_SCOPE_MIN_ZOOM;
  }

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
    const activeView = scope.views.find((view) => view.filename === filename);

    if (state.magnifications.size > 0) {
      const matchingView = scope.views.find((view) =>
        state.magnifications.has(view.zoom ?? 1),
      );
      if (!activeView || !state.magnifications.has(activeView.zoom ?? 1)) return matchingView || scope.views[0];
    }

    return activeView || scope.views[0];
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
      button.setAttribute("aria-pressed", String(option.value === "all"));
      button.addEventListener("click", () => {
        if (option.value === "all") {
          state.points.clear();
        } else {
          const points = Number(option.value);
          if (state.points.has(points)) {
            state.points.delete(points);
          } else {
            state.points.add(points);
          }
        }
        syncPointFilterButtons();
        renderCatalog();
      });
      elements.pointOptions.append(button);
    }
  }

  function syncPointFilterButtons() {
    for (const chip of elements.pointOptions.querySelectorAll(".filter-chip")) {
      const isAll = chip.dataset.points === "all";
      const isPressed = isAll ? state.points.size === 0 : state.points.has(Number(chip.dataset.points));
      chip.setAttribute("aria-pressed", String(isPressed));
    }
  }

  function buildMagnificationFilters() {
    const magnifications = [
      ...new Set(scopes.flatMap((scope) => scope.views.map((view) => view.zoom ?? 1))),
    ].sort((a, b) => a - b);
    const options = [
      { value: "all", label: "All" },
      ...magnifications.map((zoom) => ({ value: String(zoom), label: formatZoom(zoom) })),
    ];

    for (const option of options) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "filter-chip";
      button.dataset.magnification = option.value;
      button.textContent = option.label;
      button.setAttribute("aria-pressed", String(option.value === "all"));
      button.addEventListener("click", () => {
        if (option.value === "all") {
          state.magnifications.clear();
        } else {
          const magnification = Number(option.value);
          if (state.magnifications.has(magnification)) {
            state.magnifications.delete(magnification);
          } else {
            state.magnifications.add(magnification);
          }
        }
        syncMagnificationFilterButtons();
        renderCatalog();
      });
      elements.magnificationOptions.append(button);
    }
  }

  function syncMagnificationFilterButtons() {
    for (const chip of elements.magnificationOptions.querySelectorAll(".filter-chip")) {
      const isAll = chip.dataset.magnification === "all";
      const isPressed = isAll
        ? state.magnifications.size === 0
        : state.magnifications.has(Number(chip.dataset.magnification));
      chip.setAttribute("aria-pressed", String(isPressed));
    }
  }

  function filteredScopes() {
    const query = state.query.trim().toLowerCase();
    const result = scopes.filter((scope) => {
      const matchesPoints = state.points.size === 0 || state.points.has(scope.points);
      const matchesMagnification =
        state.magnifications.size === 0 ||
        scope.views.some((view) => state.magnifications.has(view.zoom ?? 1));
      const matchesQuery = !query || scope.name.toLowerCase().includes(query);
      const matchesSniperFilter = state.showSniperScopes || !isSniperOnly(scope);
      return matchesPoints && matchesMagnification && matchesQuery && matchesSniperFilter;
    });

    const comparators = {
      default: (a, b) =>
        Number(b.id === 1) - Number(a.id === 1) ||
        Number(isSniperOnly(a)) - Number(isSniperOnly(b)) ||
        a.points - b.points ||
        a.minZoom - b.minZoom ||
        a.maxZoom - b.maxZoom ||
        a.id - b.id,
      "zoom-asc": (a, b) => a.minZoom - b.minZoom || a.id - b.id,
      "zoom-desc": (a, b) => b.maxZoom - a.maxZoom || a.id - b.id,
      points: (a, b) => a.points - b.points || a.id - b.id,
      name: (a, b) => a.name.localeCompare(b.name),
    };

    return result.sort(comparators[state.sort] || comparators.default);
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
    const url = new URL(window.location.href);
    const values = url.searchParams.getAll("compare");
    const uniqueViews = [];

    const requestedMode = url.searchParams.get("mode");
    state.compareMode = ["slider", "hold"].includes(requestedMode)
      ? requestedMode
      : "side-by-side";

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
    url.searchParams.delete("mode");
    for (const view of state.selected) {
      url.searchParams.append("compare", view.filename);
    }
    if (state.selected.length === 2 && state.compareMode !== "side-by-side") {
      url.searchParams.set("mode", state.compareMode);
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
      ? '<span class="compare-icon" aria-hidden="true">×</span><span>Remove</span>'
      : '<span class="compare-icon" aria-hidden="true">+</span><span>Compare</span>';
  }

  function setCardView(card, scope, view) {
    state.activeViews.set(scope.key, view.filename);
    const image = card.querySelector(".scope-image");
    image.classList.add("is-changing");
    image.src = view.src;
    image.alt = `${scope.name} sight picture at ${formatZoom(view.zoom)}`;
    image.onload = () => image.classList.remove("is-changing");
    const zoom = formatZoom(view.zoom);
    card.querySelector(".active-zoom").setAttribute("aria-label", `Magnification ${zoom}`);
    card.querySelector(".active-zoom-value").textContent = zoom;

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
    card.querySelector(".sniper-badge").hidden = !isSniperOnly(scope);
    const note = scopeNotes.get(scope.id);
    if (note) {
      const noteElement = card.querySelector(".scope-note");
      noteElement.textContent = note;
      noteElement.hidden = false;
    }

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

  function setComparisonView(selectionIndex, scope, view) {
    state.selected[selectionIndex] = view;
    state.activeViews.set(scope.key, view.filename);

    const visibleCard = [...elements.grid.querySelectorAll(".scope-card")].find(
      (card) => card.dataset.scopeKey === scope.key,
    );
    if (visibleCard) setCardView(visibleCard, scope, view);

    updateShareUrl();
    renderCompareTray();
    updateVisibleCardSelections();
    renderComparison();
  }

  function createComparisonInfo(scope, view, selectionIndex) {
    const info = document.createElement("div");
    info.className = "compare-info";
    const summary = document.createElement("div");
    summary.className = "compare-info-summary";
    const details = document.createElement("div");
    details.className = "compare-panel-details";
    const name = document.createElement("span");
    name.className = "compare-panel-name";
    name.textContent = view.name;
    const meta = document.createElement("span");
    meta.className = "compare-panel-meta";
    meta.textContent = `${view.points} PTS${isSniperOnly(scope) ? " · SNIPER ONLY" : ""}`;
    const activeZoom = document.createElement("span");
    activeZoom.className = "active-zoom compare-active-zoom";
    activeZoom.setAttribute("aria-label", `Magnification ${formatZoom(view.zoom)}`);
    const activeZoomLabel = document.createElement("span");
    activeZoomLabel.className = "active-zoom-label";
    activeZoomLabel.setAttribute("aria-hidden", "true");
    activeZoomLabel.textContent = "Magnification";
    const activeZoomValue = document.createElement("strong");
    activeZoomValue.className = "active-zoom-value";
    activeZoomValue.textContent = formatZoom(view.zoom);
    const zoomOptions = document.createElement("div");
    zoomOptions.className = "compare-zoom-options";
    zoomOptions.setAttribute("aria-label", `Magnification for ${view.name}`);

    if (scope.views.length > 1) {
      for (const scopeView of scope.views) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "zoom-button";
        button.dataset.filename = scopeView.filename;
        button.textContent = formatZoom(scopeView.zoom);
        button.setAttribute("aria-label", `Compare ${scope.name} at ${formatZoom(scopeView.zoom)}`);
        button.setAttribute("aria-pressed", String(scopeView.filename === view.filename));
        button.addEventListener("click", () => setComparisonView(selectionIndex, scope, scopeView));
        zoomOptions.append(button);
      }
    }

    details.append(name, meta);
    activeZoom.append(activeZoomLabel, activeZoomValue);
    summary.append(details, activeZoom);
    info.append(summary, zoomOptions);
    return info;
  }

  function renderSideBySideComparison() {
    elements.comparePanels.className = "compare-content compare-panels";
    const panels = state.selected.map((view, selectionIndex) => {
      const scope = scopes.find((item) => item.key === view.key);
      const figure = document.createElement("figure");
      figure.className = "compare-panel";
      const imageWrap = document.createElement("div");
      imageWrap.className = "compare-panel-image";
      const image = document.createElement("img");
      image.src = view.src;
      image.alt = `${view.name} sight picture at ${formatZoom(view.zoom)}`;
      const caption = document.createElement("figcaption");

      imageWrap.append(image);
      caption.append(createComparisonInfo(scope, view, selectionIndex));
      figure.append(imageWrap, caption);
      return figure;
    });
    elements.comparePanels.replaceChildren(...panels);
  }

  function renderSliderComparison() {
    const [leftView, rightView] = state.selected;
    const leftScope = scopes.find((item) => item.key === leftView.key);
    const rightScope = scopes.find((item) => item.key === rightView.key);
    const stage = document.createElement("div");
    stage.className = "compare-slider-stage";
    stage.style.setProperty("--compare-split", `${state.compareSplit}%`);

    const leftImage = document.createElement("img");
    leftImage.className = "compare-slider-image compare-slider-image-left";
    leftImage.src = leftView.src;
    leftImage.alt = `${leftView.name} sight picture at ${formatZoom(leftView.zoom)}`;
    const rightImage = document.createElement("img");
    rightImage.className = "compare-slider-image compare-slider-image-right";
    rightImage.src = rightView.src;
    rightImage.alt = `${rightView.name} sight picture at ${formatZoom(rightView.zoom)}`;

    const leftLabel = document.createElement("span");
    leftLabel.className = "compare-slider-label compare-slider-label-left";
    leftLabel.textContent = `${leftView.name} · ${formatZoom(leftView.zoom)}`;
    const rightLabel = document.createElement("span");
    rightLabel.className = "compare-slider-label compare-slider-label-right";
    rightLabel.textContent = `${rightView.name} · ${formatZoom(rightView.zoom)}`;

    const slider = document.createElement("input");
    slider.className = "compare-slider-input";
    slider.type = "range";
    slider.min = "0";
    slider.max = "100";
    slider.step = "1";
    slider.value = String(state.compareSplit);
    slider.setAttribute("aria-label", `Comparison divider between ${leftView.name} and ${rightView.name}`);
    slider.setAttribute("aria-valuetext", `Divider at ${state.compareSplit}%`);
    slider.addEventListener("input", () => {
      state.compareSplit = Number(slider.value);
      stage.style.setProperty("--compare-split", `${state.compareSplit}%`);
      slider.setAttribute("aria-valuetext", `Divider at ${state.compareSplit}%`);
    });

    const divider = document.createElement("span");
    divider.className = "compare-slider-divider";
    divider.setAttribute("aria-hidden", "true");
    const handle = document.createElement("span");
    handle.className = "compare-slider-handle";
    const grip = document.createElement("span");
    grip.className = "compare-slider-grip";
    handle.append(grip);
    divider.append(handle);

    const details = document.createElement("div");
    details.className = "compare-slider-details";
    details.append(
      createComparisonInfo(leftScope, leftView, 0),
      createComparisonInfo(rightScope, rightView, 1),
    );

    stage.append(leftImage, rightImage, leftLabel, rightLabel, slider, divider);
    elements.comparePanels.className = "compare-content compare-slider-view";
    elements.comparePanels.replaceChildren(stage, details);
  }

  function renderHoldComparison() {
    const [defaultView, revealView] = state.selected;
    const defaultScope = scopes.find((item) => item.key === defaultView.key);
    const revealScope = scopes.find((item) => item.key === revealView.key);
    const stage = document.createElement("div");
    stage.className = "compare-hold-stage";

    const defaultImage = document.createElement("img");
    defaultImage.className = "compare-hold-image compare-hold-image-default";
    defaultImage.src = defaultView.src;
    defaultImage.alt = `${defaultView.name} sight picture at ${formatZoom(defaultView.zoom)}`;
    const revealImage = document.createElement("img");
    revealImage.className = "compare-hold-image compare-hold-image-reveal";
    revealImage.src = revealView.src;
    revealImage.alt = `${revealView.name} sight picture at ${formatZoom(revealView.zoom)}`;

    const defaultLabel = document.createElement("span");
    defaultLabel.className = "compare-slider-label compare-hold-label-default";
    defaultLabel.textContent = `${defaultView.name} · ${formatZoom(defaultView.zoom)}`;
    const revealLabel = document.createElement("span");
    revealLabel.className = "compare-slider-label compare-hold-label-reveal";
    revealLabel.textContent = `${revealView.name} · ${formatZoom(revealView.zoom)}`;

    const control = document.createElement("button");
    control.className = "compare-hold-control";
    control.type = "button";
    control.setAttribute("aria-pressed", "false");
    control.setAttribute(
      "aria-label",
      `Press and hold to reveal ${revealView.name} at ${formatZoom(revealView.zoom)}`,
    );
    const hint = document.createElement("span");
    hint.className = "compare-hold-hint";
    hint.textContent = `Press and hold to reveal ${revealView.name}`;
    control.append(hint);

    const setRevealed = (revealed) => {
      stage.classList.toggle("is-revealed", revealed);
      control.setAttribute("aria-pressed", String(revealed));
      hint.textContent = revealed
        ? `Release to return to ${defaultView.name}`
        : `Press and hold to reveal ${revealView.name}`;
    };

    control.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      control.setPointerCapture(event.pointerId);
      setRevealed(true);
    });
    for (const eventName of ["pointerup", "pointercancel", "lostpointercapture"]) {
      control.addEventListener(eventName, () => setRevealed(false));
    }
    control.addEventListener("keydown", (event) => {
      if ((event.key === " " || event.key === "Enter") && !event.repeat) {
        event.preventDefault();
        setRevealed(true);
      }
    });
    control.addEventListener("keyup", (event) => {
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        setRevealed(false);
      }
    });
    control.addEventListener("blur", () => setRevealed(false));

    const details = document.createElement("div");
    details.className = "compare-slider-details";
    details.append(
      createComparisonInfo(defaultScope, defaultView, 0),
      createComparisonInfo(revealScope, revealView, 1),
    );

    stage.append(defaultImage, revealImage, defaultLabel, revealLabel, control);
    elements.comparePanels.className = "compare-content compare-hold-view";
    elements.comparePanels.replaceChildren(stage, details);
  }

  function syncCompareModeControls() {
    for (const button of elements.compareModeSwitch.querySelectorAll(".compare-mode-button")) {
      button.setAttribute("aria-pressed", String(button.dataset.mode === state.compareMode));
    }
  }

  function renderComparison() {
    if (state.selected.length !== 2) return;
    syncCompareModeControls();
    if (state.compareMode === "slider") {
      renderSliderComparison();
    } else if (state.compareMode === "hold") {
      renderHoldComparison();
    } else {
      renderSideBySideComparison();
    }
  }

  function openComparison() {
    if (state.selected.length !== 2) return;
    renderComparison();
    elements.compareDialog.showModal();
  }

  function setExpandedView(scope, view) {
    state.activeViews.set(scope.key, view.filename);
    elements.expandedImage.src = view.src;
    elements.expandedImage.alt = `${scope.name} sight picture at ${formatZoom(view.zoom)}`;
    elements.expandedMeta.textContent = `${formatZoom(view.zoom)} · ${scope.points} PTS${isSniperOnly(scope) ? " · SNIPER ONLY" : ""}`;

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
    const note = scopeNotes.get(scope.id);
    elements.expandedNote.textContent = note || "";
    elements.expandedNote.hidden = !note;

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

  elements.sniperToggle.addEventListener("click", () => {
    state.showSniperScopes = !state.showSniperScopes;
    elements.sniperToggle.setAttribute("aria-pressed", String(state.showSniperScopes));
    elements.sniperToggle.textContent = state.showSniperScopes ? "Shown" : "Hidden";
    renderCatalog();
  });

  elements.clearFilters.addEventListener("click", () => {
    state.query = "";
    state.points.clear();
    state.magnifications.clear();
    state.showSniperScopes = true;
    state.sort = "default";
    elements.search.value = "";
    elements.sort.value = "default";
    elements.sniperToggle.setAttribute("aria-pressed", "true");
    elements.sniperToggle.textContent = "Shown";
    syncPointFilterButtons();
    syncMagnificationFilterButtons();
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
  elements.compareModeSwitch.addEventListener("click", (event) => {
    const button = event.target.closest(".compare-mode-button");
    if (!button || button.dataset.mode === state.compareMode) return;
    state.compareMode = button.dataset.mode;
    updateShareUrl();
    renderComparison();
  });
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
  buildMagnificationFilters();
  loadComparisonFromUrl();
  applyDisplaySettings();
  renderCatalog();
  renderCompareTray();

  if (state.selected.length === 2) {
    window.setTimeout(openComparison, 0);
  }
})();
