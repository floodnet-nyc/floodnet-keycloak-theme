/**
 * This file has been claimed for ownership from @keycloakify/keycloak-account-ui version 260700.0.4.
 * To relinquish ownership and restore this file to its original content, run the following command:
 *
 * $ npx keycloakify own --path "account/colorScheme.ts" --revert
 */

const DARK_THEME_CLASS = "pf-v5-theme-dark";

export function startColorSchemeManagement() {
    // The FloodNet account theme is a fixed light identity: warm paper, ink
    // rail, mint accents. PatternFly's dark palette would fight the design, so
    // opt out of the OS preference instead of shipping a half-styled dark mode.
    document
        .getElementById("root-color-scheme-style")
        ?.remove();

    const element = document.createElement("style");

    element.id = "root-color-scheme-style";

    element.innerHTML = ":root { color-scheme: light; }";

    document.head.appendChild(element);

    document.documentElement.style.removeProperty("background-color");

    document.documentElement.classList.remove(DARK_THEME_CLASS);
}
