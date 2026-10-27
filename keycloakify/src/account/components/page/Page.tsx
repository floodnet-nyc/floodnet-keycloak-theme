/**
 * This file has been claimed for ownership from @keycloakify/keycloak-account-ui version 260700.0.4.
 * To relinquish ownership and restore this file to its original content, run the following command:
 *
 * $ npx keycloakify own --path "account/components/page/Page.tsx" --revert
 */

/* eslint-disable */

// @ts-nocheck

import { PropsWithChildren } from "react";

type PageProps = {
    title: string;
    description: string;
};

export const Page = ({ title, description, children }: PropsWithChildren<PageProps>) => {
    return (
        <article className="fn-page">
            <header className="fn-page__head">
                <p className="fn-eyebrow">FloodNet account</p>
                <h1 className="fn-page__title" data-testid="page-heading">
                    {title}
                </h1>
                {description ? (
                    <p className="fn-page__description">{description}</p>
                ) : null}
            </header>
            <div className="fn-page__surface">{children}</div>
        </article>
    );
};
