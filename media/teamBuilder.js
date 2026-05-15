(function () {
  const vscode =
    typeof acquireVsCodeApi === "function" ? acquireVsCodeApi() : null;

  const payload = window.__TEAM_DATA__ || {};
  const pokedex = Array.isArray(payload.pokedex)
    ? payload.pokedex.slice().sort((a, b) => a.id - b.id)
    : [];

  const pokemonById = new Map(pokedex.map((pokemon) => [pokemon.id, pokemon]));

  const listEl = document.getElementById("team-list");
  const searchEl = document.getElementById("team-search");
  const exportBtn = document.getElementById("team-export");
  const clearBtn = document.getElementById("team-clear");
  const slotEls = Array.from(document.querySelectorAll(".slot"));

  let filtered = pokedex.slice();
  let teamIds = [null, null, null, null, null, null];

  function normalize(value) {
    return String(value || "")
      .trim()
      .toLowerCase();
  }

  function typeClass(type) {
    return `pk-type--${normalize(type).replace(/[^a-z0-9]+/g, "-")}`;
  }

  function createTypeChip(type) {
    const chip = document.createElement("span");
    chip.className = `pk-type ${typeClass(type)}`;
    chip.textContent = type;
    return chip;
  }

  function renderList() {
    if (!listEl) {
      return;
    }

    listEl.innerHTML = "";

    filtered.forEach((pokemon) => {
      const item = document.createElement("li");
      item.className = "team-list-item";
      item.draggable = true;
      item.setAttribute("data-id", String(pokemon.id));

      const left = document.createElement("div");
      left.className = "pk-list-left";

      const sprite = document.createElement("img");
      sprite.src = pokemon.spriteNormal;
      sprite.alt = pokemon.name;
      sprite.className = "pk-list-sprite";

      const name = document.createElement("span");
      name.className = "pk-list-name";
      name.textContent = `#${pokemon.indexLabel} ${pokemon.name}`;

      left.appendChild(sprite);
      left.appendChild(name);

      const right = document.createElement("span");
      right.className = "pk-list-types";
      right.textContent = pokemon.types.join("/");

      item.appendChild(left);
      item.appendChild(right);

      item.addEventListener("dragstart", (event) => {
        if (!event.dataTransfer) {
          return;
        }

        event.dataTransfer.setData(
          "application/x-pokemon-id",
          String(pokemon.id),
        );
        event.dataTransfer.effectAllowed = "copy";
      });

      listEl.appendChild(item);
    });
  }

  function renderSlots() {
    slotEls.forEach((slot) => {
      const slotIndex = Number(slot.getAttribute("data-slot"));
      const pokemonId = teamIds[slotIndex];
      const pokemon = pokemonId ? pokemonById.get(pokemonId) : undefined;

      slot.classList.remove("slot-hover");

      if (!pokemon) {
        slot.classList.remove("filled");
        slot.textContent = "Drop Pokemon";
        return;
      }

      slot.classList.add("filled");
      slot.innerHTML = "";

      const content = document.createElement("div");
      content.className = "slot-content";

      const title = document.createElement("div");
      title.className = "slot-name";
      title.textContent = `#${pokemon.indexLabel} ${pokemon.name}`;

      const types = document.createElement("div");
      types.className = "slot-types";
      pokemon.types.forEach((type) => {
        types.appendChild(createTypeChip(type));
      });

      const removeButton = document.createElement("button");
      removeButton.className = "slot-remove";
      removeButton.type = "button";
      removeButton.title = "Remove";
      removeButton.textContent = "x";
      removeButton.addEventListener("click", () => {
        teamIds[slotIndex] = null;
        renderSlots();
      });

      content.appendChild(title);
      content.appendChild(types);
      content.appendChild(removeButton);
      slot.appendChild(content);
    });
  }

  function applySearch() {
    const query = normalize(searchEl ? searchEl.value : "");

    filtered = pokedex.filter((pokemon) => {
      return (
        query.length === 0 ||
        normalize(pokemon.name).includes(query) ||
        pokemon.indexLabel.includes(query) ||
        pokemon.types.some((type) => normalize(type).includes(query))
      );
    });

    renderList();
  }

  slotEls.forEach((slot) => {
    slot.addEventListener("dragover", (event) => {
      event.preventDefault();
      slot.classList.add("slot-hover");
    });

    slot.addEventListener("dragleave", () => {
      slot.classList.remove("slot-hover");
    });

    slot.addEventListener("drop", (event) => {
      event.preventDefault();
      slot.classList.remove("slot-hover");

      const transfer = event.dataTransfer;
      if (!transfer) {
        return;
      }

      const id = Number(transfer.getData("application/x-pokemon-id"));
      if (!Number.isFinite(id) || !pokemonById.has(id)) {
        return;
      }

      const slotIndex = Number(slot.getAttribute("data-slot"));
      teamIds[slotIndex] = id;
      renderSlots();
    });
  });

  if (searchEl) {
    searchEl.addEventListener("input", applySearch);
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      teamIds = [null, null, null, null, null, null];
      renderSlots();
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      if (!vscode) {
        return;
      }

      vscode.postMessage({
        type: "exportTeam",
        teamIds: teamIds.filter((id) => id !== null),
      });
    });
  }

  applySearch();
  renderSlots();
})();
