// ============================================================
//  THE RECIPE BOX — App Logic
// ============================================================

// ── State ──
let selectedIngredients = new Set();
let selectedMainKey     = null;
let currentMealFilter   = "all";
let currentMode         = null;

// ── Favorites ──
const FAV_KEY       = "recipebox-favorites";
let FAVS            = new Set(JSON.parse(localStorage.getItem(FAV_KEY) || "[]"));
let showingFavorites = false;

function saveFavs() {
  localStorage.setItem(FAV_KEY, JSON.stringify([...FAVS]));
}

function updateFavBtn() {
  const btn = $("fav-btn");
  if (!btn) return;
  const count = FAVS.size;
  if (count > 0) {
    btn.innerHTML = `❤️ Favorites <span class="fav-count">${count}</span>`;
  } else {
    btn.innerHTML = `🤍 Favorites`;
  }
  btn.classList.toggle("active", showingFavorites);
  btn.classList.toggle("has-favs", count > 0);
}

// ── Main Ingredient Tiles ──
// ingKeys must match normalised ingredient names used in recipes.js
const MAINS = [
  { key: "chicken",    label: "Chicken",     emoji: "🍗", ingKeys: ["chicken thighs", "chicken legs", "chicken breast"] },
  { key: "beef",       label: "Beef",        emoji: "🥩", ingKeys: ["ground beef", "flank steak", "beef chuck", "ribeye steak", "beef bones"] },
  { key: "turkey",     label: "Turkey",      emoji: "🦃", ingKeys: ["ground turkey", "cooked turkey breast"] },
  { key: "pork",       label: "Pork",        emoji: "🐷", ingKeys: ["pork chops", "ground pork"] },
  { key: "shrimp",     label: "Shrimp",      emoji: "🦐", ingKeys: ["shrimp"] },
  { key: "salmon",     label: "Salmon",      emoji: "🐟", ingKeys: ["salmon fillets"] },
  { key: "eggs",       label: "Eggs",        emoji: "🥚", ingKeys: ["egg"] },
  { key: "pasta",      label: "Pasta",       emoji: "🍝", ingKeys: ["pasta", "spaghetti", "linguine", "orzo", "whole-wheat orzo"] },
  { key: "rice",       label: "Rice",        emoji: "🍚", ingKeys: ["arborio rice", "white rice"] },
  { key: "oats",       label: "Oats",        emoji: "🥣", ingKeys: ["rolled oats"] },
  { key: "avocado",    label: "Avocado",     emoji: "🥑", ingKeys: ["avocado"] },
  { key: "blackbeans", label: "Black Beans", emoji: "🫘", ingKeys: ["black beans"] },
  { key: "tomatoes",   label: "Tomatoes",    emoji: "🍅", ingKeys: ["tomatoes"] },
  { key: "whitefish",  label: "White Fish",      emoji: "🐠", ingKeys: ["cod fillets", "halibut", "snapper", "sea bass"] },
  { key: "baking",     label: "Baking",          emoji: "🧁", ingKeys: ["all-purpose flour", "almond flour"] },
  { key: "squash",     label: "Butternut Squash", emoji: "🎃", ingKeys: ["butternut squash"] },
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
  // Proteins — checked first to avoid false matches
  if (n === "egg" ||
      /(chicken breast|chicken thigh|chicken leg|ground turkey|cooked turkey breast|ground beef|flank steak|beef chuck|ribeye|beef bones|pork chop|ground pork|shrimp|salmon fillet|pancetta|guanciale|tuna)/.test(n))
    return "Proteins";
  // Grains & Starches
  if (/(pasta|spaghetti|linguine|fettuccine|penne|rigatoni|noodle|tortilla|arborio|breadcrumb|crouton|orzo|panko|white rice|jasmine rice|cooked rice|flour|oat|sourdough|\bbread\b)/.test(n))
    return "Grains & Starches";
  // Vegetables & Fresh Herbs (use "kalamata" not "olive" so olive oil falls to Pantry)
  if (/(onion|shallot|garlic|carrot|celery|tomato|bell pepper|mushroom|avocado|jalap|lime|lemon|basil|cilantro|parsley|dill|chive|ginger|spinach|cabbage|zucchini|potato|cucumber|romaine|lettuce|kalamata|caper|scallion|green onion|artichoke|squash|pumpkin pur|\bpeas?\b|sprout)/.test(n))
    return "Vegetables & Fresh Herbs";
  // Dairy
  if (/(cream|butter|milk|yogurt|cheese|mozzarella|sour cream|buttermilk|pecorino)/.test(n))
    return "Dairy";
  // Herbs & Spices
  if (/(thyme|oregano|paprika|cumin|chili|cinnamon|anise|\bsalt\b|pepper|bay leaf|vanilla|red pepper flake|chia|rosemary|clove|garam|turmeric|cayenne|nutmeg|baking powder|baking soda|sesame|fish sauce|soy sauce|oyster sauce|dried|tarragon)/.test(n))
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
    updateFavBtn();
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
let currentSearchQuery = "";

$("meal-tabs").addEventListener("click", e => {
  const tab = e.target.closest(".meal-tab");
  if (!tab) return;
  currentMealFilter = tab.dataset.meal;
  showingFavorites  = false;
  document.querySelectorAll(".meal-tab").forEach(t => t.classList.remove("active"));
  tab.classList.add("active");
  updateFavBtn();
  renderMealResults();
});

// ── Search bar ──
const searchInput = $("recipe-search");
const searchClear = $("recipe-search-clear");

searchInput.addEventListener("input", () => {
  currentSearchQuery = searchInput.value.trim().toLowerCase();
  searchClear.classList.toggle("hidden", currentSearchQuery === "");
  renderMealResults();
});

searchClear.addEventListener("click", () => {
  searchInput.value = "";
  currentSearchQuery = "";
  searchClear.classList.add("hidden");
  searchInput.focus();
  renderMealResults();
});

// ── Favorites button ──
$("fav-btn").addEventListener("click", () => {
  if (FAVS.size === 0) return;
  showingFavorites = !showingFavorites;
  updateFavBtn();
  renderMealResults();
});

function renderMealResults() {
  const container = $("meal-results");

  // Base list: favorites view or meal-type filter
  let filtered;
  if (showingFavorites) {
    filtered = RECIPES.filter(r => FAVS.has(r.id));
  } else {
    filtered = currentMealFilter === "all"
      ? RECIPES
      : RECIPES.filter(r => r.mealTypes.includes(currentMealFilter));
  }

  // Narrow by search query (partial match on name, description, tags)
  if (currentSearchQuery) {
    filtered = filtered.filter(r =>
      r.name.toLowerCase().includes(currentSearchQuery) ||
      r.description.toLowerCase().includes(currentSearchQuery) ||
      r.tags.some(t => t.toLowerCase().includes(currentSearchQuery))
    );
  }

  if (filtered.length === 0) {
    let icon, msg, sub;
    if (showingFavorites && currentSearchQuery) {
      icon = "❤️"; msg = `No favorites match "${searchInput.value}"`;
      sub  = "Try clearing the search to see all your saved recipes.";
    } else if (showingFavorites) {
      icon = "🤍"; msg = "No favorites saved yet";
      sub  = "Tap the 🤍 on any recipe card to save it here!";
    } else if (currentSearchQuery) {
      icon = "🔍"; msg = `No recipes matching "${searchInput.value}"`;
      sub  = "Try a different word or browse by meal type above.";
    } else {
      icon = "🥣"; msg = `No ${currentMealFilter} recipes yet`;
      sub  = "More recipes are on the way — check back soon!";
    }
    container.innerHTML = noResultsHTML(icon, msg, sub);
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

  const isFav = FAVS.has(recipe.id);
  const heartBtn = `<button class="card-heart${isFav ? " active" : ""}" data-fav="${recipe.id}" aria-label="${isFav ? "Remove from favorites" : "Save to favorites"}" title="${isFav ? "Remove from favorites" : "Save to favorites"}">${isFav ? "❤️" : "🤍"}</button>`;

  const imgPos = recipe.imagePosition || "center center";
  const cardVisual = recipe.image
    ? `<div class="card-visual card-photo" style="background-image:url('images/${recipe.image}');background-size:cover;background-position:${imgPos};">
        ${badge}
        ${heartBtn}
       </div>`
    : `<div class="card-visual color-${colorIndex}">
        ${badge}
        <span class="card-emoji">${recipe.emoji}</span>
        ${heartBtn}
       </div>`;

  return `
    <div class="recipe-card" data-id="${recipe.id}">
      ${cardVisual}
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
  container.querySelectorAll(".card-heart").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const id = btn.dataset.fav;
      if (FAVS.has(id)) {
        FAVS.delete(id);
        btn.classList.remove("active");
        btn.innerHTML = "🤍";
        btn.title = btn.setAttribute("aria-label", "Save to favorites") || "Save to favorites";
      } else {
        FAVS.add(id);
        btn.classList.add("active");
        btn.innerHTML = "❤️";
        btn.setAttribute("aria-label", "Remove from favorites");
        btn.title = "Remove from favorites";
        // Pop animation
        btn.classList.add("pop");
        btn.addEventListener("animationend", () => btn.classList.remove("pop"), { once: true });
      }
      saveFavs();
      updateFavBtn();
      if (showingFavorites) renderMealResults();
    });
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

// ══════════════════════════════════════════════════
//  SERVINGS SCALER UTILITIES
// ══════════════════════════════════════════════════

const UNICODE_FRACS = {
  '½': 1/2, '⅓': 1/3, '⅔': 2/3,
  '¼': 1/4, '¾': 3/4,
  '⅛': 1/8, '⅜': 3/8, '⅝': 5/8, '⅞': 7/8,
  '⅙': 1/6, '⅚': 5/6,
};

// Parse the leading numeric value from an amount string ("1½ cups" → 1.5, "cups")
function parseLeadingNumber(raw) {
  let s = raw.trim();
  let value = 0;
  let found = false;

  // Leading integer or decimal
  const numMatch = s.match(/^(\d+(?:\.\d+)?)/);
  if (numMatch) {
    value = parseFloat(numMatch[1]);
    s = s.slice(numMatch[1].length).trim();
    found = true;
  }

  // Attached or standalone unicode fraction  ("1½" or "½")
  for (const [frac, val] of Object.entries(UNICODE_FRACS)) {
    if (s.startsWith(frac)) {
      value += val;
      s = s.slice(frac.length).trim();
      found = true;
      break;
    }
  }

  return found ? { value, rest: s } : null;
}

// Convert a decimal to the nearest clean fraction string ("1.5" → "1½")
function toNiceFraction(n) {
  if (n <= 0) return '0';
  // Snap to nearest 8th for clean fractions
  const snapped = Math.round(n * 8) / 8;
  const whole   = Math.floor(snapped);
  const frac8   = Math.round((snapped - whole) * 8);
  const FRAC8   = ['', '⅛', '¼', '⅜', '½', '⅝', '¾', '⅞'];
  if (frac8 >= 8) return String(whole + 1);
  const fracStr = FRAC8[frac8];
  if (whole === 0) return fracStr || '0';
  return fracStr ? `${whole}${fracStr}` : String(whole);
}

// Scale a raw amount string by a ratio ("¾ cup" × 2 → "1½ cup")
function scaleAmount(amountStr, scale) {
  if (scale === 1) return amountStr;
  const parsed = parseLeadingNumber(amountStr);
  if (!parsed || parsed.value === 0) return amountStr; // "to taste", "for serving", etc.
  const scaled = parsed.value * scale;
  return toNiceFraction(scaled) + (parsed.rest ? ' ' + parsed.rest : '');
}

// ── Active modal state ──
let activeRecipeId  = null;
let activeServings  = 4;

const MODAL_GRADIENTS = [
  "linear-gradient(135deg,#3d1a08,#7a3010)",
  "linear-gradient(135deg,#0f2710,#1e5224)",
  "linear-gradient(135deg,#0d1f3a,#1a3d5c)",
  "linear-gradient(135deg,#2d0a2e,#5c1a5e)",
  "linear-gradient(135deg,#2a1a00,#5a3c00)",
  "linear-gradient(135deg,#0a1f2a,#12404f)",
  "linear-gradient(135deg,#1a1000,#3d2800)",
  "linear-gradient(135deg,#001a10,#003d20)",
];

// ── Modal ──
function openModal(recipeId) {
  activeRecipeId = recipeId;
  activeServings = 4; // always default to 4
  renderModal();
  show($("modal-overlay"));
  document.body.style.overflow = "hidden";
}

function renderModal() {
  const recipe = RECIPES.find(r => r.id === activeRecipeId);
  if (!recipe) return;

  const scale      = activeServings / recipe.servings;
  const colorIndex = RECIPES.indexOf(recipe) % 8;

  // Scaled ingredients
  const ingredientsHTML = recipe.ingredients.map(ing => {
    const matched      = selectedIngredients.has(normalise(ing.name));
    const scaledAmount = scaleAmount(ing.amount, scale);
    return `
      <div class="ingredient-item${matched ? " matched" : ""}">
        <span class="dot"></span>
        <div>
          <div>${ing.name}</div>
          <div class="ing-amount">${scaledAmount}</div>
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

  // Serving selector — highlight whichever matches activeServings
  const servingBtnsHTML = [2, 4, 6, 8].map(n => `
    <button class="serving-btn${n === activeServings ? " active" : ""}"
            data-s="${n}">${n}</button>
  `).join("");

  // Nutrition is stored per serving — doesn't change with serving count
  const calPerServing = recipe.calories;
  const n = recipe.nutrition;
  const nutritionHTML = n ? `
    <div class="nutrition-panel">
      <div class="nutrition-title">Nutrition per serving</div>
      <div class="nutrition-grid">
        <div class="macro-cell macro-protein">
          <span class="macro-val">${n.protein}g</span>
          <span class="macro-label">Protein</span>
        </div>
        <div class="macro-cell macro-carbs">
          <span class="macro-val">${n.carbs}g</span>
          <span class="macro-label">Carbs</span>
        </div>
        <div class="macro-cell macro-fat">
          <span class="macro-val">${n.fat}g</span>
          <span class="macro-label">Fat</span>
        </div>
        <div class="macro-cell macro-fiber">
          <span class="macro-val">${n.fiber}g</span>
          <span class="macro-label">Fiber</span>
        </div>
      </div>
    </div>` : "";

  const modalHero = recipe.image
    ? `<div class="modal-hero modal-hero-photo" style="background-image:url('images/${recipe.image}')"></div>`
    : `<div class="modal-hero">
        <div class="modal-bg" style="background:${MODAL_GRADIENTS[colorIndex]}"></div>
        <span style="position:relative;z-index:1;font-size:7rem;filter:drop-shadow(0 4px 16px rgba(0,0,0,.5))">${recipe.emoji}</span>
       </div>`;

  $("modal-content").innerHTML = `
    ${modalHero}
    <div class="modal-body">
      <div class="modal-tags">
        ${recipe.mealTypes.map(m => `<span class="modal-tag">${m}</span>`).join("")}
        ${recipe.tags.map(t  => `<span class="modal-tag">${t}</span>`).join("")}
      </div>
      <div class="modal-name">${recipe.name}</div>
      <div class="modal-desc">${recipe.description}</div>
      <div class="modal-meta">
        <div class="modal-meta-item"><span class="value">${recipe.time}</span><span class="label">Total Time</span></div>
        <div class="modal-meta-item"><span class="value">${calPerServing}</span><span class="label">Cal / Serving</span></div>
        <div class="modal-meta-item"><span class="value">⭐ ${recipe.rating}</span><span class="label">Rating</span></div>
      </div>

      <div class="serving-selector">
        <span class="serving-selector-label">Servings</span>
        ${servingBtnsHTML}
        <span class="serving-note">Amounts adjust automatically</span>
      </div>

      ${nutritionHTML}

      <div class="modal-section-title">Ingredients</div>
      <div class="ingredients-list">${ingredientsHTML}</div>
      <div class="modal-section-title">Instructions</div>
      <ol class="instructions-list">${instructionsHTML}</ol>
    </div>
  `;

  // Serving button clicks
  $("modal-content").querySelectorAll(".serving-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      activeServings = parseInt(btn.dataset.s);
      renderModal(); // re-render with new scale
      // Restore scroll position to ingredients
      btn.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });
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

// ══════════════════════════════════════════════════
//  FONT SIZE ACCESSIBILITY
// ══════════════════════════════════════════════════

function applyFontSize(size) {
  document.documentElement.classList.remove("text-md", "text-lg");
  if (size === "md") document.documentElement.classList.add("text-md");
  if (size === "lg") document.documentElement.classList.add("text-lg");
  document.querySelectorAll(".font-sz-btn").forEach(btn =>
    btn.classList.toggle("active", btn.dataset.size === size)
  );
  localStorage.setItem("recipebox-fontsize", size);
}

document.querySelectorAll(".font-sz-btn").forEach(btn => {
  btn.addEventListener("click", () => applyFontSize(btn.dataset.size));
});

// ── Init ──
document.addEventListener("DOMContentLoaded", () => {
  // Restore saved font size
  applyFontSize(localStorage.getItem("recipebox-fontsize") || "normal");

  // Update hero stat counters
  const statEls = document.querySelectorAll(".stat span");
  if (statEls[0]) statEls[0].textContent = RECIPES.length;
  const mealSet = new Set(RECIPES.flatMap(r => r.mealTypes));
  if (statEls[1]) statEls[1].textContent = mealSet.size;
});
