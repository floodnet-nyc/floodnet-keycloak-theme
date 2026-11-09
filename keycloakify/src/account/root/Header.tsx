/**
 * This file has been claimed for ownership from @keycloakify/keycloak-account-ui version 260700.0.4.
 * To relinquish ownership and restore this file to its original content, run the following command:
 *
 * $ npx keycloakify own --path "account/root/Header.tsx" --revert
 */

/* eslint-disable */

// @ts-nocheck

import logoUrl from "../assets/floodnet-logomark-ink.png";
import { KeycloakMasthead, label, useEnvironment } from "../../shared/keycloak-ui-shared";
import { Button } from "../../shared/@patternfly/react-core";
import { CogIcon, ExternalLinkSquareAltIcon } from "../../shared/@patternfly/react-icons";
import { useTranslation } from "react-i18next";
import { useHref } from "react-router-dom";
import { useEffect, useState } from "react";
import { getGroups } from "../api/methods";

import { AccountEnvironment } from "..";

import style from "./header.module.css";

const ReferrerLink = () => {
    const { environment } = useEnvironment<AccountEnvironment>();
    const { t } = useTranslation();

    return environment.referrerUrl ? (
        <Button
            data-testid="referrer-link"
            component="a"
            href={environment.referrerUrl.replace("_hash_", "#")}
            variant="link"
            icon={<ExternalLinkSquareAltIcon />}
            iconPosition="right"
            isInline
        >
            {t("backTo", {
                app: label(t, environment.referrerName, environment.referrerUrl)
            })}
        </Button>
    ) : null;
};

// Groups whose members can use this realm's admin console (see the realm's
// realm-management roles in iot-platform config/keycloak/realm.yaml).
const ADMIN_GROUP_PATHS = ["/server-admin"];

// "Admin console" link for admins only. The account console's token carries
// no realm-management roles, so membership comes from the account API's
// /groups. Any failure (e.g. the user lacks view-groups) just hides the link.
const AdminConsoleLink = () => {
    const context = useEnvironment();
    const { environment } = context;
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const controller = new AbortController();
        getGroups({ signal: controller.signal, context })
            .then(groups =>
                setIsAdmin(groups.some(({ path }) => ADMIN_GROUP_PATHS.includes(path)))
            )
            .catch(() => setIsAdmin(false));
        return () => controller.abort();
    }, []);

    if (!isAdmin) return null;

    const href = `${environment.serverBaseUrl.replace(/\/$/, "")}/admin/${encodeURIComponent(environment.realm)}/console/`;

    return (
        <Button
            data-testid="admin-console-link"
            component="a"
            href={href}
            variant="link"
            icon={<CogIcon />}
            isInline
        >
            Admin console
        </Button>
    );
};

function getInitials(token: { given_name?: string; family_name?: string; preferred_username?: string } | undefined) {
    if (!token) return "FN";

    const initials = [token.given_name, token.family_name]
        .filter(Boolean)
        .map(part => part![0])
        .join("");

    if (initials.length > 0) return initials.toUpperCase();

    const username = token.preferred_username ?? "";
    return (username.slice(0, 2) || "FN").toUpperCase();
}

function getAvatarDataUrl(token: Parameters<typeof getInitials>[0]) {
    const initials = getInitials(token);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="#0e2233"/><text x="32" y="41" text-anchor="middle" font-family="Avenir Next, Segoe UI, Arial, sans-serif" font-size="23" font-weight="700" fill="#6affd3">${initials}</text></svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const Header = () => {
    const { environment, keycloak } = useEnvironment();
    const { t } = useTranslation();

    const logoHref = environment.logoUrl ? environment.logoUrl : "/";
    const internalLogoHref = useHref(logoHref);

    // User can indicate that he wants an internal URL by starting it with "/"
    const indexHref = logoHref.startsWith("/") ? internalLogoHref : logoHref;

    return (
        <KeycloakMasthead
            data-testid="page-header"
            keycloak={keycloak}
            features={{ hasManageAccount: false }}
            brand={{
                href: indexHref,
                src: logoUrl,
                alt: t("logo"),
                className: style.brand
            }}
            avatar={{
                src: getAvatarDataUrl(keycloak.idTokenParsed),
                alt: t("avatar")
            }}
            toolbarItems={[
                ...(environment.referrerUrl ? [<ReferrerLink key="link" />] : []),
                <AdminConsoleLink key="admin" />
            ]}
        />
    );
};
