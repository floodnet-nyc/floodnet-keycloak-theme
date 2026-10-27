import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { keycloakify } from "keycloakify/vite-plugin";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        keycloakify({
            themeName: "floodnet",
            accountThemeImplementation: "Single-Page",
            // Only build the jar we actually deploy (Keycloak 26 is in the
            // "all other versions" range). Set to `false` to skip a range.
            keycloakVersionTargets: {
                "all-other-versions": "floodnet-keycloak-theme.jar",
                "22-to-25": false
            }
        })
    ]
});
