# FloodNet Keycloakify theme (draft)

An experimental replacement for the hand-written `floodnet/` FreeMarker theme,
built with [Keycloakify 11](https://keycloakify.dev).

Goal: keep the same FloodNet look (flood photo, glass card, logomark, mint
accent) but get a modern, responsive login/register flow with realtime
validation and a maintainable upgrade path. **Login pages only for now** — the
account console, admin console and email templates are still served by the
classic `floodnet/` theme.

| Desktop | Mobile |
| --- | --- |
| ![Login desktop](docs/login-desktop.jpg) | ![Login mobile](docs/login-mobile.jpg) |

![Register](docs/register-desktop.jpg)

## Layout

```
src/login/KcPage.tsx    entry point; uses Keycloakify's default pages
src/login/main.css      the whole FloodNet skin (single stylesheet)
src/login/assets/       background photo + logomark
src/main.tsx            app entry + dev-only page preview
vite.config.ts          theme name, Keycloak version targets
```

No Keycloak pages are ejected: Keycloakify renders Keycloak's own markup and
`main.css` re-skins it. That keeps the theme small and means every page
(sign-in, register, OTP, reset password, WebAuthn, errors) is styled at once.

## Develop

```bash
npm install
npm run dev
# http://localhost:5173/?page=login.ftl
# http://localhost:5173/?page=register.ftl
# any Keycloak page id: login-otp.ftl, login-reset-password.ftl, error.ftl, ...
```

The preview uses Keycloakify's mock `kcContext`; it is stripped from production
builds. Storybook is also wired up (`npm run storybook`).

## Build the jar

Needs a JDK and Maven on `PATH` (Keycloakify shells out to `mvn`):

```bash
npm run build-keycloak-theme
# -> dist_keycloak/floodnet-keycloak-theme.jar
```

`keycloakVersionTargets` in `vite.config.ts` is pinned to the
`all-other-versions` jar (covers Keycloak 26.x) and skips the 22–25 jar.

## Deploy

Mount the jar into Keycloak, then select `floodnet` as the **realm's login
theme** (Realm settings → Themes → Login theme, or
`kcadm.sh update realms/<realm> -s loginTheme=floodnet`).

```yaml
volumes:
  - ./keycloakify/dist_keycloak/floodnet-keycloak-theme.jar:/opt/keycloak/providers/floodnet-theme.jar
```

Do **not** set `KC_SPI_THEME_DEFAULT=floodnet` for this theme: it only ships the
login type, so Keycloak would also try to resolve the account/admin theme from
it and fail with a 500.

## Design notes

The card deliberately copies the classic theme's glass recipe rather than
layering a new "card" on top: no border, no hairline, no box shadow, the same
two translucent gradients (`#076b24` → `#110037`, `#00adff` → transparent) and
`backdrop-filter: blur(6px)` over the flood photo. The logomark lives inside the
glass. Polish is limited to typography rhythm, responsive sizing, focus states
and consistent controls.

## Notes / next steps

- The CSS is intentionally one file (~650 lines including comments). It
  overrides Keycloakify's default stylesheet rather than replacing it.
- Account console (`accountThemeImplementation`), admin console and email
  themes are not ported yet. Keycloakify can generate all three, but the
  account/admin consoles are much larger React surfaces.
- If you want to stay on the classic FTL theme, the same visual polish is
  achievable in ~100 lines of CSS; Keycloakify's payoff is the maintained page
  set, Storybook/dev preview, realtime validation and account/email theming.
