const translations = {
  fr: {
    menuOpen: "Ouvrir le menu",
    menuClose: "Fermer le menu",
    switchLanguage: "Passer en anglais",
    cartOpen: "Ouvrir le panier",
    cartClose: "Fermer le panier",
    navHome: "Accueil",
    navProducts: "Parfums",
    navReviews: "Avis",
    cartTitle: "Votre panier",
    emptyCart: "Votre panier est vide.",
    total: "Total :",
    quantity: "Quantité",
    removeOne: (name) => `Retirer un ${name}`,
    addOne: (name) => `Ajouter un ${name}`,
    fullName: "Nom complet",
    phone: "Téléphone",
    address: "Adresse de livraison",
    paymentMethod: "Mode de paiement",
    cashOnDelivery: "Paiement à la livraison",
    mpesa: "M-Pesa",
    orangeMoney: "Orange Money",
    airtelMoney: "Airtel Money",
    mobileMoneyNote: "Pour Mobile Money, le vendeur vous communiquera les informations de paiement sur WhatsApp. La commande sera confirmée après vérification du paiement.",
    orderNotes: "Notes de commande",
    namePlaceholder: "Votre nom",
    phonePlaceholder: "Votre numéro de téléphone",
    addressPlaceholder: "Rue, ville, région",
    notesPlaceholder: "Notes facultatives",
    checkout: "Commander sur WhatsApp",
    openWhatsapp: "Ouvrir la commande dans WhatsApp",
    tagline: "Portez votre signature",
    selection: "La sélection Diamond Oil",
    ourFragrance: "Notre parfum",
    productSummary: "Un parfum mixte, chaud et gourmand, aux accents épicés et ambrés.",
    learnMore: "Découvrir la description",
    productFullDescription: "Une fragrance de caractère, à la fois sensuelle et sophistiquée, pour celles et ceux qui aiment les parfums envoûtants.",
    cardamom: "Cardamome",
    cardamomDesc: "Une touche épicée et raffinée.",
    caramel: "Caramel fondant",
    caramelDesc: "Une douceur gourmande et addictive.",
    amberWood: "Bois ambré",
    amberWoodDesc: "Un fond chaud, profond et élégant.",
    addToCart: "Ajouter au panier",
    customerLove: "Avis clients",
    reviewsTitle: "Les avis de nos clients",
    reviewOne: "« Ton huile, mon coup de cœur : je me lave avec et je n’utilise même plus l’eau de Cologne. Une pépite, ça sent tellement bon. »",
    reviewTwo: "« J’ai reçu tellement de compliments, wow… C’est une dinguerie ! »",
    reviewThree: "« Quelqu’un m’a dit : “Qu’est-ce qui sent bon comme ça ?” C’était vraiment le meilleur compliment que j’ai reçu. »",
    reviewCustomer: "Cliente Diamond Oil",
    reviewRating: "5 étoiles sur 5",
    orderNow: (amount) => `Commander · $${amount}`,
    heroAlt: "Flacon de parfum Diamond Oil",
    productAlt: "Flacon du parfum AZZARO The Most Wanted",
    instagramLabel: "Instagram",
    whatsappLabel: "WhatsApp",
    designerCredit: "Par AngelusDesign",
    invalidProduct: "Ce produit ne peut pas être ajouté : son nom ou son prix est manquant.",
    invalidQuantity: "Veuillez choisir une quantité entière d’au moins 1.",
    addedToCart: (name) => `${name} ajouté au panier.`,
    emptyCheckout: "Ajoutez au moins un produit à votre panier avant de continuer.",
    missingDetails: "Veuillez renseigner votre nom, votre téléphone et votre adresse avant de continuer.",
    whatsappUnavailable: "Vos informations sont prêtes, mais la commande WhatsApp n’est pas encore activée. La boutique doit ajouter son numéro WhatsApp.",
    whatsappOpened: "Votre commande est prête. Vérifiez-la dans WhatsApp puis appuyez sur Envoyer.",
    whatsappGreeting: "Bonjour Diamond Oil, je souhaite passer une commande.",
    products: "Produits :",
    each: "l’unité",
    orderTotal: "Total de la commande :",
    customerName: "Nom :",
    customerPhone: "Téléphone :",
    customerAddress: "Adresse :",
    customerPayment: "Mode de paiement :",
    customerNotes: "Notes :",
    noNotes: "Aucune note"
  },
  en: {
    menuOpen: "Open menu",
    menuClose: "Close menu",
    switchLanguage: "Passer en français",
    cartOpen: "Open shopping cart",
    cartClose: "Close shopping cart",
    navHome: "Home",
    navProducts: "Products",
    navReviews: "Reviews",
    cartTitle: "Your Cart",
    emptyCart: "Your cart is empty.",
    total: "Total:",
    quantity: "Quantity",
    removeOne: (name) => `Remove one ${name}`,
    addOne: (name) => `Add one ${name}`,
    fullName: "Full name",
    phone: "Phone number",
    address: "Delivery address",
    paymentMethod: "Payment method",
    cashOnDelivery: "Cash on delivery",
    mpesa: "M-Pesa",
    orangeMoney: "Orange Money",
    airtelMoney: "Airtel Money",
    mobileMoneyNote: "For Mobile Money, the seller will share payment details on WhatsApp. Your order will be confirmed after the payment is verified.",
    orderNotes: "Order notes",
    namePlaceholder: "Your name",
    phonePlaceholder: "Your phone number",
    addressPlaceholder: "Street, city, area",
    notesPlaceholder: "Optional notes",
    checkout: "Order on WhatsApp",
    openWhatsapp: "Open order in WhatsApp",
    tagline: "Wear Your Signature",
    selection: "The Diamond Oil selection",
    ourFragrance: "Our fragrance",
    productSummary: "A unisex fragrance that is warm and gourmand, with spicy and amber notes.",
    learnMore: "Discover the fragrance",
    productFullDescription: "A distinctive fragrance that is sensual and sophisticated, for anyone who loves captivating scents.",
    cardamom: "Cardamom",
    cardamomDesc: "A refined, spicy touch.",
    caramel: "Melted caramel",
    caramelDesc: "An addictive gourmand sweetness.",
    amberWood: "Amber woods",
    amberWoodDesc: "A warm, deep, elegant base.",
    addToCart: "Add to cart",
    customerLove: "Customer love",
    reviewsTitle: "What our customers say",
    reviewOne: "“Your oil is my favorite: I wash with it and don’t even use cologne anymore. It’s a gem; it smells so good.”",
    reviewTwo: "“I got so many compliments, wow… it’s incredible!”",
    reviewThree: "“Someone asked me, ‘What smells so good?’ It was really the best compliment I’ve ever received.”",
    reviewCustomer: "Diamond Oil customer",
    reviewRating: "5 out of 5 stars",
    orderNow: (amount) => `Order now · $${amount}`,
    heroAlt: "Diamond Oil perfume bottle",
    productAlt: "AZZARO The Most Wanted perfume bottle",
    instagramLabel: "Instagram",
    whatsappLabel: "WhatsApp",
    designerCredit: "By AngelusDesign",
    invalidProduct: "This product cannot be added because its name or price is missing.",
    invalidQuantity: "Choose a whole-number quantity of at least 1.",
    addedToCart: (name) => `${name} added to your cart.`,
    emptyCheckout: "Please add at least one product to your cart before continuing.",
    missingDetails: "Please enter your name, phone number, and address before continuing.",
    whatsappUnavailable: "Your details are ready, but WhatsApp ordering is not active yet. The shop must add its WhatsApp number first.",
    whatsappOpened: "Your order is ready. Review it in WhatsApp and tap Send.",
    whatsappGreeting: "Hello Diamond Oil, I would like to place an order.",
    products: "Products:",
    each: "each",
    orderTotal: "Order total:",
    customerName: "Name:",
    customerPhone: "Phone:",
    customerAddress: "Address:",
    customerPayment: "Payment method:",
    customerNotes: "Notes:",
    noNotes: "No extra notes"
  }
};

let currentLanguage = "fr";
try {
  const savedLanguage = localStorage.getItem("diamondOilLanguage");
  if (savedLanguage === "en" || savedLanguage === "fr") {
    currentLanguage = savedLanguage;
  }
} catch (error) {
  console.error("Could not read the saved language preference.", error);
}

function text(key, ...args) {
  const value = translations[currentLanguage][key];
  return typeof value === "function" ? value(...args) : value;
}

function translatePage() {
  document.documentElement.lang = currentLanguage;
  document.querySelectorAll("[data-i18n]").forEach(function(element) {
    element.textContent = text(element.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(function(element) {
    element.placeholder = text(element.dataset.i18nPlaceholder);
  });
  document.querySelectorAll("[data-i18n-aria]").forEach(function(element) {
    element.setAttribute("aria-label", text(element.dataset.i18nAria));
  });
  document.querySelectorAll("[data-i18n-alt]").forEach(function(element) {
    element.alt = text(element.dataset.i18nAlt);
  });

  const languageButton = document.getElementById("language-btn");
  languageButton.textContent = currentLanguage === "fr" ? "EN" : "FR";
  languageButton.setAttribute("aria-label", text("switchLanguage"));
  menuBtn.setAttribute("aria-label", text(sideMenu.classList.contains("open") ? "menuClose" : "menuOpen"));
  cartBtn.setAttribute("aria-label", text(cartPanel.classList.contains("open") ? "cartClose" : "cartOpen"));
  renderCart();
}

const menuBtn = document.getElementById("menu-btn");
const sideMenu = document.getElementById("side-menu");
const languageBtn = document.getElementById("language-btn");
const bottomOrderBtn = document.getElementById("bottom-order-btn");

menuBtn.addEventListener("click", function() {
  const isOpen = sideMenu.classList.toggle("open");
  menuBtn.setAttribute("aria-expanded", String(isOpen));
  menuBtn.setAttribute("aria-label", text(isOpen ? "menuClose" : "menuOpen"));
});

languageBtn.addEventListener("click", function() {
  currentLanguage = currentLanguage === "fr" ? "en" : "fr";
  translatePage();
  try {
    localStorage.setItem("diamondOilLanguage", currentLanguage);
  } catch (error) {
    console.error("Could not save the language preference.", error);
  }
});

const product1 = document.querySelector("#main-visual");

window.addEventListener("load", function() {
  setTimeout(function() {
    product1.style.transform = "translateY(0)";
    product1.style.opacity = "1";
  }, 300);
});
document.addEventListener("click", function(event) {
  const clickedInsideMenu = sideMenu.contains(event.target);
  const clickedMenuBtn = menuBtn.contains(event.target);

  if (!clickedInsideMenu && !clickedMenuBtn && sideMenu.classList.contains("open")) {
    sideMenu.classList.remove("open");
    menuBtn.setAttribute("aria-expanded", "false");
    menuBtn.setAttribute("aria-label", text("menuOpen"));
  }
});
const cartBtn = document.getElementById("cart-btn");
const cartPanel = document.getElementById("cart-panel");
const checkoutBtn = document.getElementById("checkout-btn");
const orderName = document.getElementById("order-name");
const orderPhone = document.getElementById("order-phone");
const orderAddress = document.getElementById("order-address");
const paymentMethod = document.getElementById("payment-method");
const orderNotes = document.getElementById("order-notes");
const orderStatus = document.getElementById("order-status");
const orderWhatsappLink = document.getElementById("order-whatsapp-link");
const cartItemsElement = document.getElementById("cart-items");
const cartCount = document.getElementById("cart-count");
const cartTotal = document.getElementById("cart-total");
const cartItems = new Map();

function setCartOpen(isOpen) {
  cartPanel.classList.toggle("open", isOpen);
  cartBtn.setAttribute("aria-expanded", String(isOpen));
  cartBtn.setAttribute("aria-label", text(isOpen ? "cartClose" : "cartOpen"));
}

function clearOrderStatus() {
  orderStatus.hidden = true;
  orderStatus.textContent = "";
  orderWhatsappLink.hidden = true;
  orderWhatsappLink.removeAttribute("href");
}

function renderCart() {
  cartItemsElement.replaceChildren();

  if (cartItems.size === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.id = "empty-cart-msg";
    emptyMessage.textContent = text("emptyCart");
    cartItemsElement.append(emptyMessage);
  }

  let itemCount = 0;
  let total = 0;

  cartItems.forEach(function(item, id) {
    itemCount += item.quantity;
    const lineTotal = item.price * item.quantity;
    total += lineTotal;

    const row = document.createElement("div");
    row.className = "cart-item";

    const details = document.createElement("span");
    details.className = "cart-item-details";
    details.textContent = `${item.name} × ${item.quantity} — $${lineTotal.toFixed(2)}`;

    const controls = document.createElement("div");
    controls.className = "cart-item-controls";

    const decreaseButton = document.createElement("button");
    decreaseButton.type = "button";
    decreaseButton.textContent = "−";
    decreaseButton.setAttribute("aria-label", text("removeOne", item.name));
    decreaseButton.dataset.cartAction = "decrease";
    decreaseButton.dataset.cartItemId = id;

    const increaseButton = document.createElement("button");
    increaseButton.type = "button";
    increaseButton.textContent = "+";
    increaseButton.setAttribute("aria-label", text("addOne", item.name));
    increaseButton.dataset.cartAction = "increase";
    increaseButton.dataset.cartItemId = id;

    controls.append(decreaseButton, increaseButton);
    row.append(details, controls);
    cartItemsElement.append(row);
  });

  cartCount.textContent = String(itemCount);
  cartTotal.textContent = `${text("total")} $${total.toFixed(2)}`;
  bottomOrderBtn.hidden = itemCount === 0;
  bottomOrderBtn.textContent = text("orderNow", total.toFixed(2));
}

cartBtn.addEventListener("click", function() {
  setCartOpen(!cartPanel.classList.contains("open"));
});

bottomOrderBtn.addEventListener("click", function() {
  setCartOpen(true);
});
document.addEventListener("click", function(event) {
  if (!(event.target instanceof Element)) {
    return;
  }

  const addToCartButton = event.target.closest("[data-add-to-cart]");
  if (addToCartButton) {
    const name = addToCartButton.dataset.productName?.trim();
    const price = Number(addToCartButton.dataset.productPrice);
    const quantityField = addToCartButton.closest(".product-details")?.querySelector("[data-product-quantity]");
    const quantity = quantityField ? Number(quantityField.value) : 1;
    if (!name || !Number.isFinite(price) || price < 0) {
      orderStatus.textContent = text("invalidProduct");
      orderStatus.hidden = false;
      return;
    }
    if (!Number.isSafeInteger(quantity) || quantity < 1) {
      orderStatus.textContent = text("invalidQuantity");
      orderStatus.hidden = false;
      quantityField?.focus();
      return;
    }

    const id = addToCartButton.dataset.productId || `${name}:${price}`;
    const existingItem = cartItems.get(id);
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cartItems.set(id, { name, price, quantity });
    }

    renderCart();
    clearOrderStatus();
    orderStatus.textContent = text("addedToCart", name);
    orderStatus.hidden = false;
    return;
  }

  const cartActionButton = event.target.closest("[data-cart-action]");
  if (cartActionButton) {
    const id = cartActionButton.dataset.cartItemId;
    const item = cartItems.get(id);
    if (!item) {
      return;
    }

    if (cartActionButton.dataset.cartAction === "increase") {
      item.quantity += 1;
    } else {
      item.quantity -= 1;
      if (item.quantity <= 0) {
        cartItems.delete(id);
      }
    }

    renderCart();
    clearOrderStatus();
    return;
  }

  const clickedInsideCart = cartPanel.contains(event.target);
  const clickedCartBtn = cartBtn.contains(event.target);
  const clickedBottomOrderBtn = bottomOrderBtn.contains(event.target);

  if (!clickedInsideCart && !clickedCartBtn && !clickedBottomOrderBtn && cartPanel.classList.contains("open")) {
    setCartOpen(false);
  }
});

checkoutBtn.addEventListener("click", function() {
  if (cartItems.size === 0) {
    orderStatus.textContent = text("emptyCheckout");
    orderStatus.hidden = false;
    orderWhatsappLink.hidden = true;
    return;
  }

  const name = orderName.value.trim();
  const phone = orderPhone.value.trim();
  const address = orderAddress.value.trim();
  const notes = orderNotes.value.trim();

  if (!name || !phone || !address) {
    orderStatus.textContent = text("missingDetails");
    orderStatus.hidden = false;
    orderWhatsappLink.hidden = true;
    return;
  }

  const whatsappNumber = "243996572988";
  const orderLines = Array.from(cartItems.values()).map(function(item) {
    const lineTotal = item.price * item.quantity;
    return `- ${item.name} × ${item.quantity} @ $${item.price.toFixed(2)} ${text("each")} = $${lineTotal.toFixed(2)}`;
  });
  const total = Array.from(cartItems.values()).reduce(function(sum, item) {
    return sum + item.price * item.quantity;
  }, 0);
  const message = [
    text("whatsappGreeting"),
    "",
    text("products"),
    ...orderLines,
    `${text("orderTotal")} $${total.toFixed(2)}`,
    "",
    `${text("customerName")} ${name}`,
    `${text("customerPhone")} ${phone}`,
    `${text("customerAddress")} ${address}`,
    `${text("customerPayment")} ${text(paymentMethod.value)}`,
    `${text("customerNotes")} ${notes || text("noNotes")}`
  ].join("\n");

  if (!/^\d+$/.test(whatsappNumber)) {
    orderStatus.textContent = text("whatsappUnavailable");
    orderStatus.hidden = false;
    orderWhatsappLink.hidden = true;
    return;
  }

  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
  orderStatus.textContent = text("whatsappOpened");
  orderStatus.hidden = false;
  orderWhatsappLink.href = whatsappUrl;
  orderWhatsappLink.hidden = false;
  window.open(whatsappUrl, "_blank", "noopener,noreferrer");
});

translatePage();

const fadeElements = document.querySelectorAll(".fade-in");

const fadeObserver = new IntersectionObserver(function(entries) {
  entries.forEach(function(entry) {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
    }
  });
}, { threshold: 0.10 });

fadeElements.forEach(function(el) {
  fadeObserver.observe(el);
});