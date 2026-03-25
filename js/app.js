// ============================================================
//  THE RECIPE BOX — App Logic
// ============================================================

// ── State ──
let selectedIngredients = new Set();
let selectedMainKey     = null;
let currentMealFilter   = "all";
let currentMode         = null;

// ── Main Ingredient Tiles ──
// ingKeys must match normalised ingredient names used in recipes.js
const MAINS = [
  { key: "chicken",    label: "Chicken",     emoji: "🍗", ingKeys: ["chicken thighs", "chicken legs", "chicken breast"] },
  { key: "beef",       label: "Beef",        emoji: "🥩", ingKeys: ["ground beef", "flank steak"] },
  { key: "turkey",     label: "Turkey",      emoji: "🦃", ingKeys: ["ground turkey"] },
  { key: "pork",       label: "Pork",        emoji: "🐷", ingKeys: ["pork chops"] },
  { key: "shrimp",     label: "Shrimp",      emoji: "🦐", ingKeys: ["shrimp"] },
  { key: "salmon",     label: "Salmon",      emoji: "🐟", ingKeys: ["salmon fillets"] },
  { key: "eggs",       label: "Eggs",        emoji: "🥚", ingKeys: ["egg"] },
  { key: "pasta",      label: "Pasta",       emoji: "🍝", ingKeys: ["pasta", "spaghetti", "linguine"] },
  { key: "rice",       label: "Rice",        emoji: "🍚", ingKeys: ["arborio rice"] },
  { key: "oats",       label: "Oats",        emoji: "🥣", ingKeys: ["rolled oats"] },
  { key: "avocado",    label: "Avocado",     emoji: "🥑", ingKeys: ["avocado"] },
  { key: "blackbeans", label: "Black Beans", emoji: "🫘", ingKeys: ["black beans"] },
  { key: "tomatoes",   label: "Tomatoes",    emoji: "🍅", ingKeys: ["tomatoes", "canned crushed tomatoes"] },
];

// ── DOM helpers ──
const $ = id => document.getElementById(id);
const show = el => el.classList.remove("hidden");
const hide = el => el.classList.add("hidden");

// ── Normalise ingredient name for matching ──
function normalise(str) {
  return str.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
}

// ── Auto-categorise an ingredient name for the extras groups ──
function categorise(name) {
  const n = normalise(name);
  if (/(onion|garlic|carrot|celery|tomato|pepper|mushroom|avocado|jalap|lime|lemon|basil|cilantro|parsley|dill|chive|ginger|spinach|cabbage|sprout|cucumber|romaine|lettuce|olive|fresh herb)/.test(n))
    return "Vegetables & Fresh Herbs";
  if (/(cream|butter|milk|yogurt|cheese|mozzarella|sour cream|buttermilk|pecorino)/.test(n))
    return "Dairy";
  if (/(thyme|oregano|paprika|cumin|chili|cinnamon|salt|pepper|bay leaf|vanilla|red pepper flake|chia|rosemary|clove|garam|turmeric|cayenne|baking powder|baking soda)/.test(n))
    return "Herbs & Spices";
  return "Pantry & Oils";
}

// ── Returns 0–100 match score for a recipe ──
function matchScore(recipe) {
  if (selectedIngredients.size === 0) return 0;
  const matched = recipe.ingredients.filter(ing =>
    selectedIngredients.has(normalise(ing.name))
  ).length;
  return Math.round((matched / recipe.ingredients.length) * 100);
}

// ── Navigation & Mode Buttons ──
$("btn-ingredients").addEventListener("click", () => enterMode("ingredients"));
$("btn-meal-type").addEventListener("click",   () => enterMode("meal"));
$("nav-ingredients").addEventListener("click", () => {
  enterMode("ingredients");
  document.querySelector(".app").scrollIntoView({ behavior: "smooth" });
});
$("nav-meal").addEventListener("click", () => {
  enterMode("meal");
  document.querySelector(".app").scrollIntoView({ behavior: "smooth" });
});
$("card-ingredients").addEventListener("click", () => enterMode("ingredients"));
$("card-meal").addEventListener("click",        () => enterMode("meal"));
$("back-from-ingredients").addEventListener("click", leaveMode);
$("back-from-meals").addEventListener("click",       leaveMode);

// ── Mode switching ──
function enterMode(mode) {
  currentMode = mode;
  hide($("mode-selector"));
  if (mode === "ingredients") {
    show($("ingredient-finder"));
    hide($("meal-browser"));
    buildIngredientPicker();
  } else {
    show($("meal-browser"));
    hide($("ingredient-finder"));
    renderMealResults();
  }
  $("app").scrollIntoView({ behavior: "smooth", block: "start" });
}

function leaveMode() {
  currentMode = null;
  hide($("ingredient-finder"));
  hide($("meal-browser"));
  show($("mode-selector"));
  $("app").scrollIntoView({ behavior: "smooth", block: "start" });
}

// ============================================================
//  INGREDIENT PICKER — Two-Phase UX
//  Phase 1: Pick a main ingredient tile
//  Phase 2: Add contextual extras for that main
// ============================================================

function buildIngredientPicker() {
  const grid = $("ingredient-grid");
  if (grid.childElementCount > 0) return; // already built

  // Only show mains that actually appear in at least one recipe
  const availableMains = MAINS.filter(m =>
    RECIPES.some(r =>
      r.ingredients.some(ing => m.ingKeys.map(normalise).includes(normalise(ing.name)))
    )
  );

  grid.innerHTML = `
    <div class="mains-section">
      <div class="picker-label">Start with your main ingredient</div>
      <div class="mains-grid" id="mains-grid">
        ${availableMains.map(m => `
          <button class="main-tile" data-key="${m.key}">
            <span class="main-tile-emoji">${m.emoji}</span>
            <span class="main-tile-label">${m.label}</span>
          </button>
        `).join("")}
      </div>
    </div>

    <div class="extras-section hidden" id="extras-section">
      <div class="extras-header">
        <div class="picker-label">What else do you have?</div>
        <button class="extras-clear" id="extras-clear">Clear extras</button>
      </div>
      <div id="extras-chips-container"></div>
    </div>

    <div class="picker-actions hidden" id="picker-actions">
      <span class="selected-count" id="selected-count"></span>
      <button class="btn btn-ghost" id="reset-main">← Change main</button>
    </div>
  `;

  // Main tile clicks
  grid.querySelectorAll(".main-tile").forEach(tile => {
    tile.addEventListener("click", () => {
      const key = tile.dataset.key;
      if (selectedMainKey === key) {
        deselectMain();
      } else {
        selectMain(key);
      }
    });
  });

  $("extras-clear").addEventListener("click", clearExtras);
  $("reset-main").addEventListener("click", () => {
    deselectMain();
    renderIngredientResults();
  });
}

function selectMain(key) {
  // Remove previous main's ingredients
  if (selectedMainKey) {
    const prev = MAINS.find(m => m.key === selectedMainKey);
    if (prev) prev.ingKeys.forEach(k => selectedIngredients.delete(normalise(k)));
  }

  selectedMainKey = key;
  const main = MAINS.find(m => m.key === key);

  // Add this main's ingredients to the selected set
  main.ingKeys.forEach(k => selectedIngredients.add(normalise(k)));

  // Update tile highlight
  document.querySelectorAll(".main-tile").forEach(t => t.classList.remove("selected"));
  document.querySelector(`.main-tile[data-key="${key}"]`)?.classList.add("selected");

  // Build contextual extras and reveal section
  buildExtras(key);
  show($("extras-section"));
  show($("picker-actions"));
  updateSelectedCount();
  renderIngredientResults();
}

function deselectMain() {
  if (selectedMainKey) {
    const prev = MAINS.find(m => m.key === selectedMainKey);
    if (prev) prev.ingKeys.forEach(k => selectedIngredients.delete(normalise(k)));
  }
  selectedMainKey = null;
  selectedIngredients.clear();

  document.querySelectorAll(".main-tile").forEach(t => t.classList.remove("selected"));
  hide($("extras-section"));
  hide($("picker-actions"));
  hide($("results-header"));
  $("ingredient-results").innerHTML = "";
}

// Build the contextual extras chips for the selected main
function buildExtras(mainKey) {
  const main = MAINS.find(m => m.key === mainKey);
  const mainNormKeys = new Set(main.ingKeys.map(normalise));

  // Only show extras that appear in recipes containing this main
  const matchingRecipes = RECIPES.filter(r =>
    r.ingredients.some(ing => mainNormKeys.has(normalise(ing.name)))
  );

  // Collect unique extras
  const extrasMap = new Map();
  matchingRecipes.forEach(recipe => {
    recipe.ingredients.forEach(ing => {
      const key = normalise(ing.name);
      if (!mainNormKeys.has(key) && !extrasMap.has(key)) {
        extrasMap.set(key, { name: ing.name, cat: categorise(ing.name) });
      }
    });
  });

  // Group by category
  const catOrder = ["Vegetables & Fresh Herbs", "Dairy", "Herbs & Spices", "Pantry & Oils"];
  const grouped = new Map(catOrder.map(c => [c, []]));
  extrasMap.forEach(({ name, cat }, key) => {
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat).push({ key, name });
  });

  const html = [...grouped.entries()]
    .filter(([, items]) => items.length > 0)
    .map(([cat, items]) => `
      <div class="extras-category">
        <div class="extras-cat-label">${cat}</div>
        <div class="chip-grid">
          ${items.map(({ key, name }) => `
            <button class="chip${selectedIngredients.has(key) ? " selected" : ""}" data-key="${key}">${name}</button>
          `).join("")}
        </div>
      </div>
    `).join("");

  $("extras-chips-container").innerHTML = html;

  // Chip click events
  $("extras-chips-container").querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const key = chip.dataset.key;
      if (selectedIngredients.has(key)) {
        selectedIngredients.delete(key);
        chip.classList.remove("selected");
      } else {
        selectedIngredients.add(key);
        chip.classList.add("selected");
      }
      updateSelectedCount();
      renderIngredientResults();
    });
  });
}

// Clear extras but keep main ingredient
function clearExtras() {
  if (!selectedMainKey) return;
  const main = MAINS.find(m => m.key === selectedMainKey);
  const mainKeys = new Set(main.ingKeys.map(normalise));
  selectedIngredients.forEach(key => {
    if (!mainKeys.has(key)) selectedIngredients.delete(key);
  });
  $("extras-chips-container").querySelectorAll(".chip.selected").forEach(c =>
    c.classList.remove("selected")
  );
  updateSelectedCount();
  renderIngredientResults();
}

function updateSelectedCount() {
  const el = $("selected-count");
  if (!el) return;
  const n = selectedIngredients.size;
  el.innerHTML = n === 0
    ? ""
    : `<strong>${n}</strong> ingredient${n !== 1 ? "s" : ""} selected`;
}

// ── Ingredient results ──
function renderIngredientResults() {
  const container = $("ingredient-results");
  const header    = $("results-header");

  if (selectedIngredients.size === 0) {
    hide(header);
    container.innerHTML = "";
    return;
  }

  // When a main is selected, only show recipes that actually contain it
  let candidates = RECIPES;
  if (selectedMainKey) {
    const main = MAINS.find(m => m.key === selectedMainKey);
    const mainNormKeys = new Set(main.ingKeys.map(normalise));
    candidates = RECIPES.filter(r =>
      r.ingredients.some(ing => mainNormKeys.has(normalise(ing.name)))
    );
  }

  const scored = candidates
    .map(r => ({ recipe: r, score: matchScore(r) }))
    .sort((a, b) => b.score - a.score);

  const mainLabel = selectedMainKey
    ? MAINS.find(m => m.key === selectedMainKey)?.label
    : null;

  show(header);
  header.innerHTML = `
    <h3>Matching Recipes</h3>
    <span class="results-count">${scored.length} ${mainLabel ? mainLabel.toLowerCase() : "matching"} recipe${scored.length !== 1 ? "s" : ""}</span>
  `;

  if (scored.length === 0) {
    container.innerHTML = noResultsHTML("🤷", "No matches yet", "Try adding more ingredients above.");
    return;
  }

  container.innerHTML = scored.map(({ recipe, score }) => recipeCardHTML(recipe, score)).join("");
  attachCardEvents(container);
}

// ── Meal tabs & results ──
$("meal-tabs").addEventListener("click", e => {
  const tab = e.target.closest(".meal-tab");
  if (!tab) return;
  currentMealFilter = tab.dataset.meal;
  document.querySelectorAll(".meal-tab").forEach(t => t.classList.remove("active"));
  tab.classList.add("active");
  renderMealResults();
});

function renderMealResults() {
  const container = $("meal-results");
  const filtered  = currentMealFilter === "all"
    ? RECIPES
    : RECIPES.filter(r => r.mealTypes.includes(currentMealFilter));

  if (filtered.length === 0) {
    container.innerHTML = noResultsHTML(
      "🥣",
      `No ${currentMealFilter} recipes yet`,
      "More recipes are on the way — check back soon!"
    );
    return;
  }

  container.innerHTML = filtered.map(r => recipeCardHTML(r, null)).join("");
  attachCardEvents(container);
}

// ── Recipe card HTML ──
function recipeCardHTML(recipe, score) {
  const colorIndex = RECIPES.indexOf(recipe) % 8;
  const mealLabels = recipe.mealTypes.map(m => `<span class="card-tag">${m}</span>`).join("");
  const badge = score !== null
    ? `<div class="match-badge ${score >= 70 ? "high" : score >= 40 ? "mid" : ""}">${score}% match</div>`
    : "";

  return `
    <div class="recipe-card" data-id="${recipe.id}">
      <div class="card-visual color-${colorIndex}">
        ${badge}
        <span class="card-emoji">${recipe.emoji}</span>
      </div>
      <div class="card-body">
        <div class="card-tags">
          ${mealLabels}
          ${recipe.tags.slice(0,2).map(t => `<span class="card-tag">${t}</span>`).join("")}
        </div>
        <div class="card-name">${recipe.name}</div>
        <div class="card-desc">${recipe.description}</div>
        <div class="card-meta">
          <span class="meta-item"><span class="meta-icon">⏱</span>${recipe.time}</span>
          <span class="meta-item"><span class="meta-icon">🔥</span>${recipe.calories} cal</span>
          <span class="meta-item"><span class="meta-icon">👥</span>Serves ${recipe.servings}</span>
        </div>
      </div>
    </div>
  `;
}

function attachCardEvents(container) {
  container.querySelectorAll(".recipe-card").forEach(card => {
    card.addEventListener("click", () => openModal(card.dataset.id));
  });
}

function noResultsHTML(icon, title, msg) {
  return `
    <div class="no-results">
      <div class="big-icon">${icon}</div>
      <h3>${title}</h3>
      <p>${msg}</p>
    </div>
  `;
}

// ── Modal ──
function openModal(recipeId) {
  const recipe = RECIPES.find(r => r.id === recipeId);
  if (!recipe) return;

  const colorIndex = RECIPES.indexOf(recipe) % 8;
  const gradients = [
    "linear-gradient(135deg,#3d1a08,#7a3010)",
    "linear-gradient(135deg,#0f2710,#1e5224)",
    "linear-gradient(135deg,#0d1f3a,#1a3d5c)",
    "linear-gradient(135deg,#2d0a2e,#5c1a5e)",
    "linear-gradient(135deg,#2a1a00,#5a3c00)",
    "linear-gradient(135deg,#0a1f2a,#12404f)",
    "linear-gradient(135deg,#1a1000,#3d2800)",
    "linear-gradient(135deg,#001a10,#003d20)",
  ];

  const ingredientsHTML = recipe.ingredients.map(ing => {
    const matched = selectedIngredients.has(normalise(ing.name));
    return `
      <div class="ingredient-item${matched ? " matched" : ""}">
        <span class="dot"></span>
        <div>
          <div>${ing.name}</div>
          <div class="ing-amount">${ing.amount}</div>
        </div>
      </div>
    `;
  }).join("");

  const instructionsHTML = recipe.instructions.map((step, i) => `
    <li class="instruction-step">
      <span class="step-num">${i + 1}</span>
      <span>${step}</span>
    </li>
  `).join("");

  $("modal-content").innerHTML = `
    <div class="modal-hero">
      <div class="modal-bg" style="background:${gradients[colorIndex]}"></div>
      <span style="position:relative;z-index:1;font-size:7rem;filter:drop-shadow(0 4px 16px rgba(0,0,0,.5))">${recipe.emoji}</span>
    </div>
    <div class="modal-body">
      <div class="modal-tags">
        ${recipe.mealTypes.map(m => `<span class="modal-tag">${m}</span>`).join("")}
        ${recipe.tags.map(t => `<span class="modal-tag">${t}</span>`).join("")}
      </div>
      <div class="modal-name">${recipe.name}</div>
      <div class="modal-desc">${recipe.description}</div>
      <div class="modal-meta">
        <div class="modal-meta-item"><span class="value">${recipe.time}</span><span class="label">Total Time</span></div>
        <div class="modal-meta-item"><span class="value">${recipe.calories}</span><span class="label">Calories</span></div>
        <div class="modal-meta-item"><span class="value">${recipe.servings}</span><span class="label">Servings</span></div>
        <div class="modal-meta-item"><span class="value">⭐ ${recipe.rating}</span><span class="label">Rating</span></div>
      </div>
      <div class="modal-section-title">Ingredients</div>
      <div class="ingredients-list">${ingredientsHTML}</div>
      <div class="modal-section-title">Instructions</div>
      <ol class="instructions-list">${instructionsHTML}</ol>
    </div>
  `;

  show($("modal-overlay"));
  document.body.style.overflow = "hidden";
}

function closeModal() {
  hide($("modal-overlay"));
  document.body.style.overflow = "";
}

$("modal-close").addEventListener("click", closeModal);
$("modal-overlay").addEventListener("click", e => {
  if (e.target === $("modal-overlay")) closeModal();
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeModal();
});

// ── Init: update hero stat counters ──
document.addEventListener("DOMContentLoaded", () => {
  const statEls = document.querySelectorAll(".stat span");
  if (statEls[0]) statEls[0].textContent = RECIPES.length;
  const mealSet = new Set(RECIPES.flatMap(r => r.mealTypes));
  if (statEls[1]) statEls[1].textContent = mealSet.size;
});
