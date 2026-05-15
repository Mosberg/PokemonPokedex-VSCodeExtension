(function () {
  const vscode =
    typeof acquireVsCodeApi === "function" ? acquireVsCodeApi() : null;

  const payload = window.__POKEDEX_DATA__ || {};
  const pokedex = Array.isArray(payload.pokedex)
    ? payload.pokedex.slice().sort((a, b) => a.id - b.id)
    : [];
  const allTypes = Array.isArray(payload.types) ? payload.types : [];
  const pokemonById = new Map(pokedex.map((pokemon) => [pokemon.id, pokemon]));
  let settings = normalizeSettings(payload.settings);

  const listEl = document.getElementById("pk-list");
  const typeFiltersEl = document.getElementById("pk-type-filters");
  const searchEl = document.getElementById("pk-search");
  const randomBtn = document.getElementById("pk-random");
  const teamBuilderBtn = document.getElementById("pk-open-team");
  const openSettingsBtn = document.getElementById("pk-open-settings");

  const detailEmptyEl = document.getElementById("pk-detail-empty");
  const detailCardEl = document.getElementById("pk-detail-card");
  const nameEl = document.getElementById("pk-name");
  const spriteNormalEl = document.getElementById("pk-sprite-normal");
  const spriteShinyEl = document.getElementById("pk-sprite-shiny");
  const typesEl = document.getElementById("pk-types");
  const metaEl = document.getElementById("pk-meta");
  const statsEl = document.getElementById("pk-stats");
  const evolutionsEl = document.getElementById("pk-evolutions");
  const movesEl = document.getElementById("pk-moves");
  const locationsEl = document.getElementById("pk-locations");
  const acquisitionEl = document.getElementById("pk-acquisition");
  const flavorEl = document.getElementById("pk-flavor");

  const insertJsonBtn = document.getElementById("pk-btn-json");
  const insertMarkdownBtn = document.getElementById("pk-btn-markdown");
  const insertFlavorBtn = document.getElementById("pk-btn-flavor");
  const copyFlavorBtn = document.getElementById("pk-btn-copy-flavor");
  const copyStatsBtn = document.getElementById("pk-btn-copy-stats");

  let filtered = pokedex.slice();
  let query = "";
  const activeTypes = new Set();
  let activePokemonId = filtered.length > 0 ? filtered[0].id : null;

  function normalizeSettings(rawSettings) {
    const source =
      rawSettings && typeof rawSettings === "object" ? rawSettings : {};

    const defaultSpriteVariant =
      source.defaultSpriteVariant === "shiny" ? "shiny" : "normal";

    const maxMovesRaw = Number(source.maxMovesToDisplay);
    const maxMovesToDisplay = Number.isFinite(maxMovesRaw)
      ? Math.min(60, Math.max(1, Math.floor(maxMovesRaw)))
      : 12;

    return {
      defaultSpriteVariant,
      maxMovesToDisplay,
      showFlavorTextInSidebar: source.showFlavorTextInSidebar !== false,
    };
  }

  function normalize(value) {
    return String(value || "")
      .trim()
      .toLowerCase();
  }

  function formatId(id) {
    return String(id).padStart(3, "0");
  }

  function typeClass(type) {
    return `pk-type--${normalize(type).replace(/[^a-z0-9]+/g, "-")}`;
  }

  function getListSprite(pokemon) {
    if (settings.defaultSpriteVariant === "shiny") {
      return pokemon.spriteShiny || pokemon.spriteNormal;
    }

    return pokemon.spriteNormal || pokemon.spriteShiny;
  }

  function createTypeChip(type) {
    const chip = document.createElement("span");
    chip.className = `pk-type ${typeClass(type)}`;
    chip.textContent = type;
    return chip;
  }

  function createStatRow(key, value) {
    const statRow = document.createElement("div");
    statRow.className = "pk-stat-row";

    const keyEl = document.createElement("span");
    keyEl.className = "pk-stat-key";
    keyEl.textContent = key;

    const valueEl = document.createElement("span");
    valueEl.className = "pk-stat-value";
    valueEl.textContent = String(value);

    const bar = document.createElement("div");
    bar.className = "pk-stat-bar";

    const fill = document.createElement("div");
    fill.className = "pk-stat-fill";
    const clamped = Math.max(0, Math.min(255, Number(value) || 0));
    fill.style.width = `${(clamped / 255) * 100}%`;

    bar.appendChild(fill);
    statRow.appendChild(keyEl);
    statRow.appendChild(valueEl);
    statRow.appendChild(bar);

    return statRow;
  }

  function uniqueOrdered(values) {
    const seen = new Set();
    const output = [];

    values.forEach((value) => {
      if (!value || seen.has(value)) {
        return;
      }

      seen.add(value);
      output.push(value);
    });

    return output;
  }

  function summarizeLearnset(pokemon, maxEntries) {
    const moveLearnset = Array.isArray(pokemon.moveLearnset)
      ? pokemon.moveLearnset
      : [];

    if (moveLearnset.length === 0) {
      return {
        moveNames: [],
        levelUp: [],
        tmHm: [],
        other: [],
      };
    }

    const moveNames = [];
    const levelUp = [];
    const tmHm = [];
    const other = [];

    moveLearnset.forEach((entry) => {
      const moveName = String(entry?.name || "").trim();
      if (!moveName) {
        return;
      }

      moveNames.push(moveName);

      const learnMethods = Array.isArray(entry.learnMethods)
        ? entry.learnMethods
        : [];

      learnMethods.forEach((method) => {
        const methodName = normalize(method?.method);
        const versionGroup = String(method?.versionGroup || "unknown");

        if (methodName === "level-up") {
          const level = Number(method?.level);
          const levelLabel = Number.isFinite(level) ? `Lv ${level}` : "Lv ?";
          levelUp.push(`${moveName} (${levelLabel}, ${versionGroup})`);
          return;
        }

        if (methodName === "machine") {
          const code = String(method?.machineCode || "TM/HM").trim();
          tmHm.push(`${code} ${moveName}`);
          return;
        }

        const displayMethod = String(method?.method || "other").trim();
        other.push(`${moveName} (${displayMethod}, ${versionGroup})`);
      });
    });

    const limit = Math.max(1, Math.floor(Number(maxEntries) || 10));

    return {
      moveNames: uniqueOrdered(moveNames),
      levelUp: uniqueOrdered(levelUp).slice(0, limit),
      tmHm: uniqueOrdered(tmHm).slice(0, limit),
      other: uniqueOrdered(other).slice(0, limit),
    };
  }

  function formatEvolutionMethod(requirement) {
    const trigger = normalize(requirement?.trigger);

    if (trigger === "level-up") {
      const level = Number(requirement?.minLevel);
      return Number.isFinite(level) ? `Level up at Lv ${level}` : "Level up";
    }

    if (trigger === "trade") {
      const tradeSpecies = String(requirement?.tradeSpecies || "").trim();
      return tradeSpecies ? `Trade for ${tradeSpecies}` : "Trade";
    }

    if (trigger === "use-item") {
      const item = String(requirement?.item || "").trim();
      return item ? `Use ${item}` : "Use evolution item";
    }

    return String(requirement?.trigger || "Unknown method").trim();
  }

  function summarizeEvolution(pokemon) {
    const lines = [];

    if (pokemon?.evolvesFrom && typeof pokemon.evolvesFrom === "object") {
      const fromName = String(pokemon.evolvesFrom.fromName || "Unknown");
      const methods = Array.isArray(pokemon.evolvesFrom.methods)
        ? uniqueOrdered(
            pokemon.evolvesFrom.methods
              .map((method) => formatEvolutionMethod(method))
              .filter((text) => text.length > 0),
          )
        : [];

      const methodText = methods.length
        ? methods.join(" or ")
        : "Unknown method";
      lines.push(`From: ${fromName} (${methodText})`);
    } else {
      lines.push("From: Base form");
    }

    const evolvesTo = Array.isArray(pokemon?.evolvesTo)
      ? pokemon.evolvesTo
      : [];
    if (evolvesTo.length > 0) {
      evolvesTo.forEach((transition) => {
        const toName = String(transition?.toName || "Unknown");
        const methods = Array.isArray(transition?.methods)
          ? uniqueOrdered(
              transition.methods
                .map((method) => formatEvolutionMethod(method))
                .filter((text) => text.length > 0),
            )
          : [];

        const methodText = methods.length
          ? methods.join(" or ")
          : "Unknown method";
        lines.push(`To: ${toName} (${methodText})`);
      });
    } else {
      lines.push("To: Final stage");
    }

    const evolutionLines = Array.isArray(pokemon?.evolutionLines)
      ? pokemon.evolutionLines
      : [];

    if (evolutionLines.length > 0) {
      const formatted = evolutionLines
        .slice(0, 2)
        .map((line) => {
          const ids = Array.isArray(line) ? line : [];
          return ids
            .map((id) => {
              const numericId = Number(id);
              const entry = pokemonById.get(numericId);
              if (entry) {
                return `#${entry.indexLabel} ${entry.name}`;
              }

              return `#${formatId(numericId)}`;
            })
            .join(" -> ");
        })
        .filter((line) => line.length > 0);

      if (formatted.length > 0) {
        lines.push(`Line: ${formatted.join(" | ")}`);
      }
    }

    return lines;
  }

  function summarizeEncounterLocations(pokemon, maxEntries) {
    const locations = Array.isArray(pokemon?.frlgEncounterLocations)
      ? pokemon.frlgEncounterLocations
      : [];

    if (locations.length === 0) {
      return ["FRLG Wild Encounters: Not listed"];
    }

    const limit = Math.max(1, Math.floor(Number(maxEntries) || 8));
    const lines = locations.slice(0, limit).map((entry) => {
      const location = String(entry?.location || "Unknown location");
      const area = String(entry?.area || "").trim();
      const areaLabel = area && area !== location ? ` (${area})` : "";

      const methods = Array.isArray(entry?.methods)
        ? uniqueOrdered(
            entry.methods
              .map((method) => String(method || "").trim())
              .filter((method) => method.length > 0),
          )
        : [];

      const methodLabel = methods.length ? methods.join("/") : "Unknown method";

      const minLevel = Number(entry?.minLevel);
      const maxLevel = Number(entry?.maxLevel);
      let levelLabel = "";
      if (Number.isFinite(minLevel) && Number.isFinite(maxLevel)) {
        levelLabel =
          minLevel === maxLevel
            ? ` Lv ${minLevel}`
            : ` Lv ${minLevel}-${maxLevel}`;
      }

      const versions = Array.isArray(entry?.versions)
        ? uniqueOrdered(
            entry.versions
              .map((version) => String(version || "").trim())
              .filter((version) => version.length > 0),
          )
        : [];

      const versionLabel = versions.length ? ` [${versions.join("/")}]` : "";

      return `${location}${areaLabel}: ${methodLabel}${levelLabel}${versionLabel}`;
    });

    if (locations.length > limit) {
      lines.push(`+${locations.length - limit} more locations`);
    }

    return [`FRLG Wild Encounters:`, ...lines];
  }

  function summarizeAcquisition(pokemon, maxEntries) {
    const acquisition = Array.isArray(pokemon?.frlgAcquisition)
      ? pokemon.frlgAcquisition
      : [];

    if (acquisition.length === 0) {
      return ["FRLG Acquisition: Not listed"];
    }

    const limit = Math.max(1, Math.floor(Number(maxEntries) || 8));
    const lines = acquisition.slice(0, limit).map((entry) => {
      const method = String(entry?.method || "unknown")
        .split("-")
        .filter((part) => part.length > 0)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");

      const summary = String(entry?.summary || "").trim();
      const versions = Array.isArray(entry?.games)
        ? uniqueOrdered(
            entry.games
              .map((version) => String(version || "").trim())
              .filter((version) => version.length > 0),
          )
        : [];

      const versionLabel = versions.length ? ` [${versions.join("/")}]` : "";

      return `${method}: ${summary}${versionLabel}`;
    });

    if (acquisition.length > limit) {
      lines.push(`+${acquisition.length - limit} more acquisition entries`);
    }

    return [`FRLG Acquisition:`, ...lines];
  }

  function updateTypeButtonsState() {
    if (!typeFiltersEl) {
      return;
    }

    typeFiltersEl.querySelectorAll("button").forEach((button) => {
      const type = button.getAttribute("data-type");
      if (type === "All") {
        button.classList.toggle("active", activeTypes.size === 0);
        return;
      }

      button.classList.toggle("active", activeTypes.has(type));
    });
  }

  function renderTypeFilters() {
    if (!typeFiltersEl) {
      return;
    }

    typeFiltersEl.innerHTML = "";

    const allButton = document.createElement("button");
    allButton.type = "button";
    allButton.className = "pk-button active";
    allButton.textContent = "All";
    allButton.setAttribute("data-type", "All");
    allButton.addEventListener("click", () => {
      activeTypes.clear();
      updateTypeButtonsState();
      applyFilters();
    });
    typeFiltersEl.appendChild(allButton);

    allTypes.forEach((type) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "pk-button";
      button.textContent = type;
      button.setAttribute("data-type", type);

      button.addEventListener("click", () => {
        if (activeTypes.has(type)) {
          activeTypes.delete(type);
        } else {
          activeTypes.add(type);
        }

        updateTypeButtonsState();
        applyFilters();
      });

      typeFiltersEl.appendChild(button);
    });
  }

  function renderList() {
    if (!listEl) {
      return;
    }

    listEl.innerHTML = "";

    filtered.forEach((pokemon) => {
      const listItem = document.createElement("li");

      const button = document.createElement("button");
      button.type = "button";
      button.className = "pk-list-item";
      button.classList.toggle("active", activePokemonId === pokemon.id);

      const left = document.createElement("div");
      left.className = "pk-list-left";

      const sprite = document.createElement("img");
      sprite.className = "pk-list-sprite";
      sprite.src = getListSprite(pokemon);
      sprite.alt = pokemon.name;

      const label = document.createElement("span");
      label.className = "pk-list-name";
      label.textContent = `#${pokemon.indexLabel} ${pokemon.name}`;

      left.appendChild(sprite);
      left.appendChild(label);

      const right = document.createElement("span");
      right.className = "pk-list-types";
      right.textContent = pokemon.types.join("/");

      button.appendChild(left);
      button.appendChild(right);

      button.addEventListener("click", () => {
        activePokemonId = pokemon.id;
        renderList();
        renderDetails(pokemon);
      });

      listItem.appendChild(button);
      listEl.appendChild(listItem);
    });
  }

  function renderDetails(pokemon) {
    if (
      !detailEmptyEl ||
      !detailCardEl ||
      !nameEl ||
      !spriteNormalEl ||
      !spriteShinyEl ||
      !typesEl ||
      !metaEl ||
      !statsEl ||
      !evolutionsEl ||
      !movesEl ||
      !locationsEl ||
      !acquisitionEl ||
      !flavorEl
    ) {
      return;
    }

    detailEmptyEl.style.display = "none";
    detailCardEl.classList.remove("hidden");

    nameEl.textContent = `#${pokemon.indexLabel} ${pokemon.name}`;
    spriteNormalEl.src = pokemon.spriteNormal || pokemon.spriteShiny;
    spriteShinyEl.src = pokemon.spriteShiny || pokemon.spriteNormal;

    typesEl.innerHTML = "";
    pokemon.types.forEach((type) => {
      typesEl.appendChild(createTypeChip(type));
    });

    const totalStats =
      pokemon.stats.hp +
      pokemon.stats.attack +
      pokemon.stats.defense +
      pokemon.stats.spAttack +
      pokemon.stats.spDefense +
      pokemon.stats.speed;

    metaEl.textContent = `Total Base Stats: ${totalStats}`;

    statsEl.innerHTML = "";
    statsEl.appendChild(createStatRow("HP", pokemon.stats.hp));
    statsEl.appendChild(createStatRow("ATK", pokemon.stats.attack));
    statsEl.appendChild(createStatRow("DEF", pokemon.stats.defense));
    statsEl.appendChild(createStatRow("SPA", pokemon.stats.spAttack));
    statsEl.appendChild(createStatRow("SPD", pokemon.stats.spDefense));
    statsEl.appendChild(createStatRow("SPE", pokemon.stats.speed));

    evolutionsEl.textContent = summarizeEvolution(pokemon).join("\n");

    const learnsetSummary = summarizeLearnset(
      pokemon,
      settings.maxMovesToDisplay,
    );

    const moves =
      Array.isArray(pokemon.moves) && pokemon.moves.length > 0
        ? pokemon.moves
        : learnsetSummary.moveNames;

    const moveLines = [];

    if (moves.length > 0) {
      moveLines.push(
        `Moves: ${moves.slice(0, settings.maxMovesToDisplay).join(", ")}`,
      );
    } else {
      moveLines.push("Moves: Not included in current data file");
    }

    if (learnsetSummary.levelUp.length > 0) {
      moveLines.push(`Level-up: ${learnsetSummary.levelUp.join(", ")}`);
    }

    if (learnsetSummary.tmHm.length > 0) {
      moveLines.push(`TM/HM: ${learnsetSummary.tmHm.join(", ")}`);
    }

    if (learnsetSummary.other.length > 0) {
      moveLines.push(`Other methods: ${learnsetSummary.other.join(", ")}`);
    }

    movesEl.textContent = moveLines.join("\n");

    const sectionLimit = Math.max(2, Math.min(settings.maxMovesToDisplay, 8));
    locationsEl.textContent = summarizeEncounterLocations(
      pokemon,
      sectionLimit,
    ).join("\n");
    acquisitionEl.textContent = summarizeAcquisition(
      pokemon,
      sectionLimit,
    ).join("\n");

    const flavorText = String(pokemon.flavorText || "").trim();
    if (settings.showFlavorTextInSidebar && flavorText.length > 0) {
      flavorEl.textContent = flavorText;
      flavorEl.style.display = "block";
    } else {
      flavorEl.textContent = "";
      flavorEl.style.display = "none";
    }
  }

  function ensureActiveSelection() {
    if (filtered.length === 0) {
      activePokemonId = null;
      if (detailEmptyEl && detailCardEl) {
        detailEmptyEl.style.display = "grid";
        detailCardEl.classList.add("hidden");
      }
      return;
    }

    const stillVisible = filtered.some(
      (pokemon) => pokemon.id === activePokemonId,
    );
    if (!stillVisible) {
      activePokemonId = filtered[0].id;
    }

    const pokemon = pokemonById.get(activePokemonId);
    if (pokemon) {
      renderDetails(pokemon);
    }
  }

  function applyFilters() {
    filtered = pokedex.filter((pokemon) => {
      const queryMatches =
        query.length === 0 ||
        normalize(pokemon.name).includes(query) ||
        pokemon.indexLabel.includes(query) ||
        pokemon.types.some((type) => normalize(type).includes(query));

      if (!queryMatches) {
        return false;
      }

      if (activeTypes.size === 0) {
        return true;
      }

      return Array.from(activeTypes).every((type) =>
        pokemon.types.includes(type),
      );
    });

    renderList();
    ensureActiveSelection();
  }

  function postPokemonMessage(type) {
    if (!vscode || activePokemonId === null) {
      return;
    }

    vscode.postMessage({
      type,
      pokemonId: activePokemonId,
    });
  }

  if (searchEl) {
    searchEl.addEventListener("input", () => {
      query = normalize(searchEl.value);
      applyFilters();
    });
  }

  if (randomBtn) {
    randomBtn.addEventListener("click", () => {
      const source = filtered.length > 0 ? filtered : pokedex;
      if (source.length === 0) {
        return;
      }

      const random = source[Math.floor(Math.random() * source.length)];
      activePokemonId = random.id;
      renderList();
      renderDetails(random);
    });
  }

  if (teamBuilderBtn) {
    teamBuilderBtn.addEventListener("click", () => {
      if (!vscode) {
        return;
      }
      vscode.postMessage({ type: "openTeamBuilder" });
    });
  }

  if (openSettingsBtn) {
    openSettingsBtn.addEventListener("click", () => {
      if (!vscode) {
        return;
      }

      vscode.postMessage({ type: "openSettings" });
    });
  }

  if (insertJsonBtn) {
    insertJsonBtn.addEventListener("click", () => {
      postPokemonMessage("insertPokemonJson");
    });
  }

  if (insertMarkdownBtn) {
    insertMarkdownBtn.addEventListener("click", () => {
      postPokemonMessage("insertPokemonMarkdown");
    });
  }

  if (insertFlavorBtn) {
    insertFlavorBtn.addEventListener("click", () => {
      postPokemonMessage("insertPokemonFlavorText");
    });
  }

  if (copyFlavorBtn) {
    copyFlavorBtn.addEventListener("click", () => {
      postPokemonMessage("copyPokemonFlavorText");
    });
  }

  if (copyStatsBtn) {
    copyStatsBtn.addEventListener("click", () => {
      postPokemonMessage("copyPokemonStats");
    });
  }

  window.addEventListener("message", (event) => {
    const message = event.data;
    if (!message || !message.type) {
      return;
    }

    if (message.type === "updateSettings") {
      settings = normalizeSettings(message.settings);
      renderList();

      if (activePokemonId !== null) {
        const activePokemon = pokemonById.get(activePokemonId);
        if (activePokemon) {
          renderDetails(activePokemon);
        }
      }

      return;
    }

    if (message.type !== "showPokemon") {
      return;
    }

    const requestedId = Number(message.pokemonId);
    if (!Number.isFinite(requestedId)) {
      return;
    }

    if (!pokemonById.has(requestedId)) {
      return;
    }

    activePokemonId = requestedId;

    if (!filtered.some((pokemon) => pokemon.id === requestedId)) {
      query = "";
      if (searchEl) {
        searchEl.value = "";
      }
      activeTypes.clear();
      updateTypeButtonsState();
      applyFilters();
      return;
    }

    renderList();
    renderDetails(pokemonById.get(requestedId));
  });

  renderTypeFilters();
  updateTypeButtonsState();
  applyFilters();
})();
