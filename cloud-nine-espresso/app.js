const products = {
  latte: { name: "Latte", price: 500, group: "coffee", image: "latte" },
  "cold-brew": { name: "Cold Brew", price: 500, group: "coffee", image: "cold-brew" },
  matcha: { name: "Matcha", price: 550, group: "tea", image: "matcha" },
  "dirty-soda": { name: "Dirty Soda", price: 700, group: "soda", image: "soda", note: "Made with Poppi" },
  drip: { name: "Drip", price: 325, group: "coffee" },
  americano: { name: "Americano", price: 425, group: "coffee" },
  chai: { name: "Chai", price: 550, group: "tea", image: "chai" },
  tea: { name: "Tea", price: 400, group: "tea" }
};
const groupNames = { coffee: "Coffee", tea: "Tea & matcha", soda: "Dirty sodas" };
const filters = ["all", "coffee", "tea", "soda", "signatures", "bakery"];
const cartKey = "cloud-nine-demo-cart";
const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const money = (price) => currency.format(price / 100);
const view = document.querySelector("#view");
const nav = document.querySelector("#main-nav");
const navToggle = document.querySelector(".nav-toggle");
const navOrder = document.querySelector("#nav-order");
const announce = document.querySelector("#live-message");
const toast = document.querySelector("#toast");
const confirmation = document.querySelector(".confirmation");
let cart = restoreCart();
let filter = "all";
let toastTimer;

function restoreCart() {
  try {
    const stored = JSON.parse(localStorage.getItem(cartKey));
    return Object.fromEntries(Object.keys(products).filter((id) => Number.isInteger(stored?.[id]) && stored[id] > 0).map((id) => [id, Math.min(30, stored[id])]));
  } catch {
    return {};
  }
}

function saveCart() {
  try {
    localStorage.setItem(cartKey, JSON.stringify(cart));
  } catch {
    // Cart changes are still available for the current page session.
  }
}

function setCartQuantity(id, change) {
  if (!products[id]) return;
  const previous = cart[id] || 0;
  const next = Math.max(0, Math.min(30, previous + change));
  if (next) cart[id] = next;
  else delete cart[id];
  saveCart();
  updateCartUI();
  if (change > 0) {
    const message = next > previous ? `${products[id].name} added to your pickup order` : "Maximum of 30 per item in this demo";
    announce.textContent = message;
    if (document.body.dataset.page === "menu") showToast(message);
  }
}

function totals() {
  return Object.entries(cart).reduce((acc, [id, quantity]) => ({
    count: acc.count + quantity,
    subtotal: acc.subtotal + quantity * products[id].price,
  }), { count: 0, subtotal: 0 });
}

function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 1700);
}

function tile(id, feature = false) {
  const p = products[id];
  const image = p.image ? `<img src="${p.image}.webp" alt="" width="500" height="500">` :
    `<div class="tile-placeholder"><span class="cloud" aria-hidden="true"></span><span>${groupNames[p.group]}</span></div>`;
  const notes = p.note ? `<small>${p.note}</small>` : "";
  const controls = feature ? "" : `<button type="button" class="add" aria-label="Add ${p.name}" data-add="${id}">+</button>`;
  const body = `${image}<div class="tile-info"><div><h3>${p.name}</h3>${notes}<strong>${money(p.price)}</strong></div>${controls}</div>`;
  return feature
    ? `<a class="tile featured" href="#menu-${p.group}">${body}</a>`
    : `<article class="tile">${body}</article>`;
}

function showFilter(name, speak = false) {
  filter = name;
  const productsGrid = view.querySelector("#menu-products");
  const mainProducts = !["signatures", "bakery"].includes(filter);
  const visible = mainProducts ? Object.keys(products).filter((id) => filter === "all" || products[id].group === filter) : [];
  productsGrid.hidden = !mainProducts;
  productsGrid.innerHTML = visible.map((id) => tile(id)).join("");
  view.querySelector("#signatures").hidden = !["all", "signatures"].includes(filter);
  view.querySelector("#bakery").hidden = !["all", "bakery"].includes(filter);
  view.querySelectorAll("[data-filter]").forEach((button) => button.setAttribute("aria-pressed", button.dataset.filter === filter));
  if (speak) view.querySelector("#filter-ribbon").textContent = mainProducts ? `${visible.length} drinks` : `Showing ${filter}`;
}

function updateCartUI() {
  const { count, subtotal } = totals();
  navOrder.href = count ? "#order" : "#menu";
  navOrder.textContent = count ? `Bag (${count})` : "Order pickup";
  const bar = view.querySelector(".cart-bar");
  if (bar) {
    bar.hidden = count === 0;
    view.querySelector("#cart-bar-label").textContent = `View pickup order · ${count} ${count === 1 ? "item" : "items"}`;
    view.querySelector("#cart-bar-total").textContent = money(subtotal);
  }
  const form = view.querySelector("#order-form");
  if (!form) return;
  const list = view.querySelector("#order-lines");
  const activeButton = document.activeElement.dataset;
  const previous = activeButton.adjust;
  const operation = activeButton.change;
  list.innerHTML = Object.entries(cart).map(([id, quantity]) => {
    const p = products[id];
    return `<div class="order-line">
      <div><h3>${p.name}</h3><span>${money(p.price)} each</span></div>
      <div class="line-right"><strong>${money(p.price * quantity)}</strong>
        <div class="quantity">
          <button type="button" data-adjust="${id}" data-change="-1" aria-label="Remove one ${p.name}">−</button>
          <span aria-label="Quantity">${quantity}</span>
          <button type="button" data-adjust="${id}" data-change="1" aria-label="Add one ${p.name}">+</button>
        </div>
      </div>
    </div>`;
  }).join("");
  form.hidden = count === 0;
  view.querySelector("#empty-cart").hidden = count !== 0;
  view.querySelector("#order-total").textContent = money(subtotal);
  if (previous) {
    const similar = list.querySelector(`[data-adjust="${previous}"][data-change="${operation}"]`);
    (similar || list.querySelector("button") || view.querySelector("#empty-cart .button")).focus();
  }
}

function showRoute(shouldFocus = false) {
  const route = location.hash.slice(1);
  const page = route === "order" ? "order" : route === "menu" || route.startsWith("menu-") ? "menu" : "home";
  document.body.dataset.page = page;
  view.replaceChildren(document.querySelector(`#${page}-template`).content.cloneNode(true));
  navToggle.setAttribute("aria-expanded", "false");
  navToggle.setAttribute("aria-label", "Open navigation");
  toast.hidden = true;
  clearTimeout(toastTimer);
  if (page === "home") view.querySelector("#home-favorites").innerHTML = ["latte", "matcha", "dirty-soda"].map((id) => tile(id, true)).join("");
  if (page === "menu") {
    const category = route.startsWith("menu-") ? route.slice(5) : filter;
    showFilter(filters.includes(category) ? category : "all");
  }
  updateCartUI();
  if (route === "story" || route === "visit") {
    const section = document.getElementById(route);
    section.tabIndex = -1;
    section.focus({ preventScroll: true });
    section.scrollIntoView();
  } else {
    window.scrollTo(0, 0);
    if (shouldFocus) view.querySelector("#main").focus({ preventScroll: true });
  }
}

document.querySelector(".skip").addEventListener("click", (event) => {
  event.preventDefault();
  view.querySelector("#main").focus();
});

navToggle.addEventListener("click", () => {
  const open = navToggle.getAttribute("aria-expanded") === "true";
  navToggle.setAttribute("aria-expanded", String(!open));
  navToggle.setAttribute("aria-label", open ? "Open navigation" : "Close navigation");
});
nav.addEventListener("click", () => navToggle.setAttribute("aria-expanded", "false"));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && navToggle.getAttribute("aria-expanded") === "true") {
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Open navigation");
    navToggle.focus();
  }
});

view.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const { add, adjust, change, filter: category } = button.dataset;
  if (category) showFilter(category, true);
  if (add || adjust) setCartQuantity(add || adjust, add ? 1 : Number(change));
});
view.addEventListener("change", (event) => {
  if (event.target.name !== "timing") return;
  const scheduled = event.target.value === "scheduled";
  const time = view.querySelector("#pickup-time");
  time.disabled = !scheduled;
  time.required = scheduled;
  view.querySelector("#pickup-time-label").hidden = !scheduled;
});
view.addEventListener("submit", (event) => {
  if (event.target.id !== "order-form") return;
  event.preventDefault();
  const nameInput = view.querySelector("#pickup-name");
  const name = nameInput.value.trim();
  if (!name) {
    nameInput.value = "";
    nameInput.reportValidity();
    return;
  }
  const time = view.querySelector("#pickup-time");
  const pickup = time.disabled ? "As soon as available" : `${time.value} Pacific`;
  document.querySelector("#confirmation-details").textContent = `Pickup for ${name} · ${pickup} · ${money(totals().subtotal)} subtotal.`;
  cart = {};
  saveCart();
  confirmation.showModal();
});

confirmation.addEventListener("close", () => { location.hash = "menu"; });
window.addEventListener("hashchange", () => showRoute(true));

document.querySelector("#ribbon").hidden = Date.now() >= Date.parse("2026-11-21T10:15:00-08:00");
showRoute();
