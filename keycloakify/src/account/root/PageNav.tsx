/**
 * This file has been claimed for ownership from @keycloakify/keycloak-account-ui version 260700.0.4.
 * To relinquish ownership and restore this file to its original content, run the following command:
 *
 * $ npx keycloakify own --path "account/root/PageNav.tsx" --revert
 */

/* eslint-disable */

// @ts-nocheck

import { useEnvironment } from "../../shared/keycloak-ui-shared";
import { PageSidebar, PageSidebarBody, Spinner } from "../../shared/@patternfly/react-core";
import {
    ApplicationsIcon,
    BuildingIcon,
    DesktopIcon,
    FileAltIcon,
    IdBadgeIcon,
    KeyIcon,
    LinkIcon,
    ShieldAltIcon,
    UserIcon,
    UsersIcon
} from "../../shared/@patternfly/react-icons";
import { PropsWithChildren, ReactNode, Suspense, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { matchPath, useHref, useLinkClickHandler, useLocation } from "react-router-dom";

import fetchContentJson from "../content/fetchContent";
import type { TFuncKey } from "../i18n-type";
import type { AccountEnvironment, Feature } from "..";
import { usePromise } from "../utils/usePromise";

type RootMenuItem = {
    id?: string;
    label: TFuncKey;
    path: string;
    isVisible?: keyof Feature;
    modulePath?: string;
};

type MenuItemWithChildren = {
    label: TFuncKey;
    children: MenuItem[];
    isVisible?: keyof Feature;
};

export type MenuItem = RootMenuItem | MenuItemWithChildren;

const icons: Record<string, ReactNode> = {
    personalInfo: <UserIcon />,
    accountSecurity: <ShieldAltIcon />,
    applications: <ApplicationsIcon />,
    groups: <UsersIcon />,
    organizations: <BuildingIcon />,
    resources: <KeyIcon />,
    verifiableCredentials: <IdBadgeIcon />,
    signingIn: <KeyIcon />,
    deviceActivity: <DesktopIcon />,
    linkedAccounts: <LinkIcon />
};

export const PageNav = () => {
    const { t } = useTranslation();
    const [menuItems, setMenuItems] = useState<MenuItem[]>();
    const context = useEnvironment<AccountEnvironment>();

    usePromise(signal => fetchContentJson({ signal, context }), setMenuItems);

    return (
        <PageSidebar>
            <PageSidebarBody>
                <nav className="fn-nav" aria-label={t("account")}>
                    <p className="fn-nav__label">{t("account")}</p>
                    <Suspense fallback={<Spinner />}>
                        <ul className="fn-nav__list">
                            {menuItems
                                ?.filter(menuItem =>
                                    menuItem.isVisible
                                        ? context.environment.features[menuItem.isVisible]
                                        : true
                                )
                                .map(menuItem => (
                                    <NavMenuItem
                                        key={menuItem.label as string}
                                        menuItem={menuItem}
                                    />
                                ))}
                        </ul>
                    </Suspense>
                    <p className="fn-nav__footer">
                        <span>FloodNet</span> · NYC
                    </p>
                </nav>
            </PageSidebarBody>
        </PageSidebar>
    );
};

type NavMenuItemProps = {
    menuItem: MenuItem;
};

function NavMenuItem({ menuItem }: NavMenuItemProps) {
    const { t } = useTranslation();
    const { environment } = useEnvironment<AccountEnvironment>();
    const { pathname } = useLocation();
    const isActive = useMemo(
        () => matchMenuItem(pathname, menuItem, environment.baseUrl),
        [pathname, menuItem, environment.baseUrl]
    );

    if ("path" in menuItem) {
        return (
            <li>
                <NavLink
                    path={menuItem.path}
                    isActive={isActive}
                    icon={icons[menuItem.label as string] ?? <FileAltIcon />}
                >
                    {t(menuItem.label)}
                </NavLink>
            </li>
        );
    }

    return (
        <li className="fn-nav__group">
            <p className="fn-nav__group-label">{t(menuItem.label)}</p>
            <ul className="fn-nav__sublist">
                {menuItem.children
                    .filter(child =>
                        child.isVisible ? environment.features[child.isVisible] : true
                    )
                    .map(child => (
                        <NavMenuItem key={child.label as string} menuItem={child} />
                    ))}
            </ul>
        </li>
    );
}

function getFullUrl(path: string, baseUrl: string) {
    return `${new URL(baseUrl).pathname}${path}`;
}

function matchMenuItem(
    currentPath: string,
    menuItem: MenuItem,
    baseUrl: string
): boolean {
    if ("path" in menuItem) {
        return !!matchPath(getFullUrl(menuItem.path, baseUrl), currentPath);
    }

    return menuItem.children.some(child => matchMenuItem(currentPath, child, baseUrl));
}

type NavLinkProps = {
    path: string;
    isActive: boolean;
    icon?: ReactNode;
};

export const NavLink = ({
    path,
    isActive,
    icon,
    children
}: PropsWithChildren<NavLinkProps>) => {
    const { environment } = useEnvironment<AccountEnvironment>();
    const menuItemPath = getFullUrl(path, environment.baseUrl) + location.search;
    const href = useHref(menuItemPath);
    const handleClick = useLinkClickHandler(menuItemPath);
    const label = typeof children === "string" ? children : undefined;

    const onNavigate = () => {
        // On small screens the PatternFly sidebar is an off-canvas drawer;
        // close it again once a destination has been picked.
        if (!window.matchMedia("(min-width: 1200px)").matches) {
            document.getElementById("nav-toggle")?.click();
        }
    };

    return (
        <a
            data-testid={path}
            href={href}
            data-label={label}
            aria-label={label}
            aria-current={isActive ? "page" : undefined}
            className={`fn-nav__link${isActive ? " fn-nav__link--active" : ""}`}
            onClick={event => {
                handleClick(event as unknown as React.MouseEvent<HTMLAnchorElement>);
                onNavigate();
            }}
        >
            {icon ? (
                <span className="fn-nav__icon" aria-hidden="true">
                    {icon}
                </span>
            ) : (
                <span className="fn-nav__dot" aria-hidden="true" />
            )}
            <span className="fn-nav__text">{children}</span>
        </a>
    );
};
