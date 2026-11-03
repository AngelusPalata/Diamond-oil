const form = document.getElementById("change-password-form");
const message = document.getElementById("change-password-message");
const translations = window.dashboardTranslations || {};
const defaultLanguage = "fr";

function t(key, fallback = "") {
  const map = translations[window.__authLang || defaultLanguage] || translations[defaultLanguage] || {};
  return map[key] || fallback;
}

function applyTranslations(lang = defaultLanguage) {
  window.__authLang = lang;
  document.documentElement.lang = lang;

  document.getElementById("change-password-title").textContent = t("changePasswordTitle", "Changer le mot de passe");
  document.getElementById("change-password-subtitle").textContent = t("changePasswordSubtitle", "Choisissez un nouveau mot de passe pour sécuriser votre compte.");
  document.getElementById("new-password-label").textContent = t("newPasswordLabel", "Nouveau mot de passe");
  document.getElementById("confirm-password-label").textContent = t("confirmPasswordLabel", "Confirmer le mot de passe");
  document.getElementById("save-password-button").textContent = t("savePasswordButton", "Enregistrer le nouveau mot de passe");

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

  const newPassword = document.getElementById("new-password").value;
  const confirmPassword = document.getElementById("confirm-password").value;

  if (!newPassword || !confirmPassword) {
    showMessage(t("requiredFields", "Veuillez remplir les deux champs."), true);
    return;
  }

  if (newPassword.length < 6) {
    showMessage(t("passwordLength", "Le mot de passe doit contenir au moins 6 caractères."), true);
    return;
  }

  if (newPassword !== confirmPassword) {
    showMessage(t("passwordMismatch", "Les deux mots de passe ne correspondent pas."), true);
    return;
  }

  try {
    const response = await fetch("/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword, confirmPassword })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Impossible de changer le mot de passe.");
    }

    window.location.href = data.redirect || "/seller";
  } catch (error) {
    showMessage(error.message || "Impossible de changer le mot de passe.", true);
  }
});

applyTranslations(defaultLanguage);
