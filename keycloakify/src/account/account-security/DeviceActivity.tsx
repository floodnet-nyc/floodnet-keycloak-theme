/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "account/account-security/DeviceActivity.tsx"
 *
 * This file is provided by @keycloakify/keycloak-account-ui version 260700.0.4.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import {
    ContinueCancelModal,
    label,
    useEnvironment
} from "../../shared/keycloak-ui-shared";
import {
    Button,
    Spinner
} from "../../shared/@patternfly/react-core";
import {
    DesktopIcon,
    MobileAltIcon,
    SyncAltIcon
} from "../../shared/@patternfly/react-icons";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { AccountEnvironment } from "..";
import { deleteSession, getDevices } from "../api/methods";
import {
    ClientRepresentation,
    DeviceRepresentation,
    SessionRepresentation
} from "../api/representations";
import { Page } from "../components/page/Page";
import { formatDate } from "../utils/formatDate";
import { useAccountAlerts } from "../utils/useAccountAlerts";
import { usePromise } from "../utils/usePromise";

export const DeviceActivity = () => {
    const { t } = useTranslation();
    const context = useEnvironment<AccountEnvironment>();
    const { addAlert, addError } = useAccountAlerts();

    const [devices, setDevices] = useState<DeviceRepresentation[]>();
    const [key, setKey] = useState(0);
    const refresh = () => setKey(key + 1);

    const moveCurrentToTop = (devices: DeviceRepresentation[]) => {
        let currentDevice = devices[0];

        const index = devices.findIndex(d => d.current);
        currentDevice = devices.splice(index, 1)[0];
        devices.unshift(currentDevice);

        const sessionIndex = currentDevice.sessions.findIndex(s => s.current);
        const currentSession = currentDevice.sessions.splice(sessionIndex, 1)[0];
        currentDevice.sessions.unshift(currentSession);

        setDevices(devices);
    };

    usePromise(signal => getDevices({ signal, context }), moveCurrentToTop, [key]);

    const signOutAll = async () => {
        await deleteSession(context);
        await context.keycloak.logout();
    };

    const signOutSession = async (
        session: SessionRepresentation,
        device: DeviceRepresentation
    ) => {
        try {
            await deleteSession(context, session.id);
            addAlert(t("signedOutSession", { browser: session.browser, os: device.os }));
            refresh();
        } catch (error) {
            addError("errorSignOutMessage", error);
        }
    };

    const makeClientsString = (clients: ClientRepresentation[]): string => {
        let clientsString = "";
        clients.forEach((client, index) => {
            let clientName: string;
            if (client.clientName !== "") {
                clientName = label(t, client.clientName);
            } else {
                clientName = client.clientId;
            }

            clientsString += clientName;

            if (clients.length > index + 1) clientsString += ", ";
        });

        return clientsString;
    };

    if (!devices) {
        return <Spinner />;
    }

    const rows = devices.flatMap(device =>
        device.sessions.map(session => ({ device, session }))
    );

    const showSignOutAll =
        devices.length > 1 || (devices[0]?.sessions.length ?? 0) > 1;

    const format = (seconds: number) =>
        formatDate(new Date(seconds * 1000), context.environment.locale);

    return (
        <Page title={t("deviceActivity")} description={t("signedInDevicesExplanation")}>
            <div className="fn-devices">
                <div className="fn-devices__toolbar">
                    <h2 className="fn-devices__heading">{t("signedInDevices")}</h2>
                    <div className="fn-devices__actions">
                        <Button
                            id="refresh-page"
                            variant="link"
                            onClick={() => refresh()}
                            icon={<SyncAltIcon />}
                        >
                            {t("refreshPage")}
                        </Button>

                        {showSignOutAll && (
                            <div className="fn-devices__signout-all">
                                <ContinueCancelModal
                                    buttonTitle={t("signOutAllDevices")}
                                    buttonVariant="primary"
                                    modalTitle={t("signOutAllDevices")}
                                    continueLabel={t("confirm")}
                                    cancelLabel={t("cancel")}
                                    onContinue={() => signOutAll()}
                                >
                                    {t("signOutAllDevicesWarning")}
                                </ContinueCancelModal>
                            </div>
                        )}
                    </div>
                </div>

                <div className="fn-devices__list">
                    {rows.map(({ device, session }, index) => {
                        const osName = device.os
                            .toLowerCase()
                            .includes("unknown")
                            ? t("unknownOperatingSystem")
                            : device.os;
                        const osVersion =
                            device.osVersion &&
                            !device.osVersion.toLowerCase().includes("unknown")
                                ? device.osVersion
                                : "";
                        const osTitle = [osName, osVersion].filter(Boolean).join(" ");
                        const current = session.current;

                        return (
                            <article
                                key={`${device.id}-${session.id}-${index}`}
                                data-testid={`row-${index}`}
                                className={`fn-device ${
                                    current ? "fn-device--current" : ""
                                }`}
                            >
                                <div className="fn-device__head">
                                    <span className="fn-device__icon" aria-hidden="true">
                                        {device.mobile ? (
                                            <MobileAltIcon />
                                        ) : (
                                            <DesktopIcon />
                                        )}
                                    </span>

                                    <div className="fn-device__identity">
                                        <h3 className="fn-device__name">{osTitle}</h3>
                                        <p className="fn-device__browser">
                                            {session.browser.replace("/", " ")}
                                        </p>
                                    </div>

                                    <div className="fn-device__aside">
                                        {current ? (
                                            <span className="fn-device__badge">
                                                {t("currentSession")}
                                            </span>
                                        ) : (
                                            <div className="fn-device__action">
                                                <ContinueCancelModal
                                                    buttonTitle={t("signOut")}
                                                    buttonVariant="secondary"
                                                    modalTitle={t("signOut")}
                                                    continueLabel={t("confirm")}
                                                    cancelLabel={t("cancel")}
                                                    onContinue={() =>
                                                        signOutSession(session, device)
                                                    }
                                                >
                                                    {t("signOutWarning")}
                                                </ContinueCancelModal>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <dl className="fn-device__meta">
                                    <div className="fn-device__meta-item">
                                        <dt>{t("ipAddress")}</dt>
                                        <dd>{session.ipAddress}</dd>
                                    </div>
                                    <div className="fn-device__meta-item">
                                        <dt>{t("lastAccessedOn")}</dt>
                                        <dd>{format(session.lastAccess)}</dd>
                                    </div>
                                    <div className="fn-device__meta-item">
                                        <dt>{t("clients")}</dt>
                                        <dd>{makeClientsString(session.clients)}</dd>
                                    </div>
                                    <div className="fn-device__meta-item">
                                        <dt>{t("started")}</dt>
                                        <dd>{format(session.started)}</dd>
                                    </div>
                                    <div className="fn-device__meta-item">
                                        <dt>{t("expires")}</dt>
                                        <dd>{format(session.expires)}</dd>
                                    </div>
                                </dl>
                            </article>
                        );
                    })}
                </div>
            </div>
        </Page>
    );
};

export default DeviceActivity;
