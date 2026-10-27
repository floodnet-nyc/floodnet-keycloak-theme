import { createRoot } from "react-dom/client";
import { StrictMode } from "react";
import { KcPage, type KcContext } from "./kc.gen";

// Dev-only preview: run `npm run dev` and open e.g.
//   http://localhost:5173/?page=login.ftl
//   http://localhost:5173/?page=register.ftl
// Any Keycloak page id works. The mock is loaded lazily and this branch is
// removed from production builds, so it never ships to Keycloak.
function render() {
    createRoot(document.getElementById("root")!).render(
        <StrictMode>
            {!window.kcContext ? (
                <h1>No Keycloak Context</h1>
            ) : (
                <KcPage kcContext={window.kcContext} />
            )}
        </StrictMode>
    );
}

if (import.meta.env.DEV) {
    void import("./login/KcPageStory").then(({ getKcContextMock }) => {
        const pageId =
            new URLSearchParams(window.location.search).get("page") ??
            "login.ftl";

        // The mock helper is generic over the page id; the preview is not.
        const getMock = getKcContextMock as unknown as (params: {
            pageId: string;
            overrides: Record<string, never>;
        }) => KcContext;

        window.kcContext = getMock({ pageId, overrides: {} });

        render();
    });
} else {
    render();
}
