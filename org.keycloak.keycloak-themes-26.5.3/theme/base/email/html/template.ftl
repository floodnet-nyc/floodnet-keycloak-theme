<#macro emailLayout>
<!doctype html>
<html lang="${locale.language}" dir="${(ltr)?then('ltr','rtl')}" style="margin:0;padding:0;background:#f3f6fb;">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
    <title>${realmName!"Account Notification"}</title>
    <style type="text/css">
        body {
            margin: 0;
            padding: 0;
            background: #f3f6fb;
            color: #1a2740;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }

        table {
            border-collapse: separate;
            border-spacing: 0;
        }

        .email-bg {
            width: 100%;
            padding: 24px 12px;
            background: #f3f6fb;
        }

        .card {
            width: 100%;
            max-width: 620px;
            border: 1px solid #dce4f2;
            border-radius: 14px;
            overflow: hidden;
            background: #ffffff;
            box-shadow: 0 8px 28px rgba(16, 26, 49, 0.08);
        }

        .header {
            padding: 18px 24px;
            background: #0f1f3d;
            border-bottom: 1px solid #23375f;
            color: #f5f8ff;
            text-align: left;
            font-size: 18px;
            line-height: 1.3;
            font-weight: 700;
            letter-spacing: 0.2px;
        }

        .content {
            padding: 22px 24px;
            color: #1a2740;
            text-align: left;
        }

        .content p,
        .content div,
        .content ul,
        .content ol,
        .content li {
            margin: 0 0 12px;
            color: #1a2740;
            font-size: 15px;
            line-height: 1.55;
        }

        .content h1,
        .content h2,
        .content h3,
        .content h4 {
            margin: 0 0 14px;
            color: #111d33;
            line-height: 1.3;
        }

        .content a {
            color: #1456c3;
            text-decoration: underline;
            text-underline-offset: 2px;
            word-break: break-word;
        }

        .content a.button,
        .content p > a:only-child,
        .content div > a:only-child {
            display: inline-block;
            margin: 8px 0 6px;
            padding: 10px 16px;
            border-radius: 8px;
            border: 1px solid #0f4bb4;
            background: #1456c3;
            color: #ffffff;
            text-decoration: none;
            font-size: 14px;
            font-weight: 600;
            line-height: 1.2;
        }

        .footer {
            padding: 14px 24px;
            border-top: 1px solid #e1e8f4;
            background: #f7f9fc;
            color: #5a6a87;
            text-align: center;
            font-size: 12px;
            line-height: 1.45;
        }

        .footer a {
            color: #4a5f85;
            text-decoration: underline;
            text-underline-offset: 2px;
        }

        @media (prefers-color-scheme: dark) {
            html,
            body,
            .email-bg {
                background: #111a2b !important;
                color: #dbe4f5 !important;
            }

            .card {
                background: #18243b !important;
                border-color: #2b3b5a !important;
                box-shadow: none !important;
            }

            .header {
                background: #0f1b32 !important;
                border-bottom-color: #2b3b5a !important;
                color: #f2f6ff !important;
            }

            .content,
            .content p,
            .content div,
            .content ul,
            .content ol,
            .content li,
            .content h1,
            .content h2,
            .content h3,
            .content h4 {
                background: #18243b !important;
                color: #dbe4f5 !important;
            }

            .content a {
                color: #8ab5ff !important;
            }

            .content a.button,
            .content p > a:only-child,
            .content div > a:only-child {
                background: #2563eb !important;
                border-color: #2563eb !important;
                color: #ffffff !important;
            }

            .footer {
                background: #152137 !important;
                border-top-color: #2b3b5a !important;
                color: #a9bad8 !important;
            }

            .footer a {
                color: #c1d3f1 !important;
            }
        }

        @media only screen and (max-width: 620px) {
            .email-bg {
                padding: 10px 0;
            }

            .card {
                border-left: 0;
                border-right: 0;
                border-radius: 0;
            }

            .header,
            .content,
            .footer {
                padding-left: 16px;
                padding-right: 16px;
            }
        }
    </style>
</head>
<body>
    <table role="presentation" class="email-bg" width="100%">
        <tr>
            <td align="center">
                <table role="presentation" class="card" width="620">
                    <tr>
                        <td class="header">${realmName!"Account Notification"}</td>
                    </tr>
                    <tr>
                        <td class="content">
                            <#nested>
                        </td>
                    </tr>
                    <tr>
                        <td class="footer">&copy; ${.now?string["yyyy"]} ${realmName!"Keycloak"}</td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
</#macro>
