/**
 * This file has been claimed for ownership from @keycloakify/keycloak-account-ui version 260700.0.4.
 * To relinquish ownership and restore this file to its original content, run the following command:
 *
 * $ npx keycloakify own --path "account/early-color-scheme.js" --public --revert
 *
 * The FloodNet account theme is intentionally light-only, so this early script
 * just pins the paper background and keeps the dark theme class off the page.
 */

{
    const BACKGROUND_COLOR_LIGHT_MODE = "#f4f1e9";
    const DARK_THEME_CLASS = "pf-v5-theme-dark";

    {
        const element = document.createElement("style");

        element.id = "root-color-scheme-style";

        element.innerHTML = ":root { color-scheme: light; }";

        document.head.appendChild(element);
    }

    document.documentElement.style.backgroundColor = BACKGROUND_COLOR_LIGHT_MODE;

    document.documentElement.classList.remove(DARK_THEME_CLASS);
}
