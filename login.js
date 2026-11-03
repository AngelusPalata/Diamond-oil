const form = document.getElementById("login-form");
const message = document.getElementById("login-message");
const translations = window.dashboardTranslations || {};
const defaultLanguage = "fr";

function t(key, fallback = "") {
  const map = translations[window.__authLang || defaultLanguage] || translations[defaultLanguage] || {};
  return map[key] || fallback;
}

function applyTranslations(lang = defaultLanguage) {
  window.__authLang = lang;
  document.documentElement.lang = lang;

  document.getElementById("login-title").textContent = t("loginTitle", "Connexion");
  document.getElementById("login-subtitle").textContent = t("loginSubtitle", "Bienvenue dans le tableau de bord vendeur.");
  document.getElementById("username-label").textContent = t("usernameLabel", "Nom d'utilisateur");
  document.getElementById("password-label").textContent = t("passwordLabel", "Mot de passe");
  document.getElementById("login-button").textContent = t("loginButton", "Se connecter");

  const showText = t("showPassword", "Afficher le mot de passe");
  const hideText = t("hidePassword", "Masquer le mot de passe");

  document.querySelectorAll("[data-toggle-password]").forEach((button) => {
    const isHidden = button.getAttribute("data-password-hidden") === "true";
    button.setAttribute("aria-label", isHidden ? showText : hideText);
    button.title = isHidden ? showText : hideText;
  });

  document.querySelectorAll(".lang-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.authLang === lang);
  });
}

function togglePasswordVisibility(inputId) {
  const input = document.getElementById(inputId);
  const button = document.querySelector(`[data-toggle-password="${inputId}"]`);
  if (!input || !button) return;

  const showText = t("showPassword", "Afficher le mot de passe");
  const hideText = t("hidePassword", "Masquer le mot de passe");
  const willShow = input.type === "password";
  input.type = willShow ? "text" : "password";
  button.setAttribute("aria-pressed", String(willShow));
  button.setAttribute("data-password-hidden", String(!willShow));
  button.setAttribute("aria-label", willShow ? hideText : showText);
  button.title = willShow ? hideText : showText;
}

function showMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle("error", isError);
}

document.querySelectorAll("[data-toggle-password]").forEach((button) => {
  button.addEventListener("click", () => togglePasswordVisibility(button.dataset.togglePassword));
});

document.querySelectorAll("[data-auth-lang]").forEach((button) => {
  button.addEventListener("click", () => applyTranslations(button.dataset.authLang));
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  if (!username || !password) {
    showMessage(t("loginError", "Veuillez remplir le nom d'utilisateur et le mot de passe."), true);
    return;
  }

  try {
    const response = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Connexion impossible.");
    }

    window.location.href = data.redirect || "/seller";
  } catch (error) {
    showMessage(error.message || "Connexion impossible.", true);
  }
});

applyTranslations(defaultLanguage);
