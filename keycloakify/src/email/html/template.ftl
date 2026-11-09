<#--
  This file has been claimed for ownership from @keycloakify/email-native version 260007.0.0.
  To relinquish ownership and restore this file to its original content, run the following command:
  
  $ npx keycloakify own --path "email/html/template.ftl" --revert
-->

<#macro emailLayout>
<!doctype html>
<html lang="${locale.language}" dir="${(ltr)?then('ltr','rtl')}" style="margin:0;padding:0;background:#eaf1f4;">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
    <title>${realmName!"Account Notification"}</title>
    <style type="text/css">
        html {
            background-color: #eaf1f4;
        }

        body {
            margin: 0;
            padding: 0;
            background: #eaf1f4;
            color: #33465a;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
        }

        table {
            border-collapse: separate;
            border-spacing: 0;
        }

        img {
            border: 0;
            outline: none;
            text-decoration: none;
        }

        .email-bg {
            width: 100%;
            background-color: #eaf1f4;
        }

        .card {
            width: 100%;
            max-width: 620px;
            background-color: #fbfdff;
            border: 1px solid #d7e3e9;
            border-radius: 10px;
            overflow: hidden;
        }

        .header {
            background-color: #081b2e;
            padding: 22px 30px;
        }

        .brand {
            color: #f2fbff;
            font-size: 17px;
            line-height: 1.2;
            font-weight: 700;
            letter-spacing: 0.2px;
        }

        .brand-small {
            color: #85a5b7;
            font-size: 10px;
            line-height: 1.3;
            font-weight: 600;
            letter-spacing: 1.7px;
            text-transform: uppercase;
            padding-top: 4px;
        }

        .rule {
            height: 3px;
            font-size: 0;
            line-height: 3px;
            background-color: #5ed6c3;
        }

        .content {
            padding: 32px 36px 34px;
            background-color: #fbfdff;
            color: #33465a;
        }

        .content p,
        .content div,
        .content ul,
        .content ol,
        .content li {
            margin: 0 0 15px;
            color: #33465a;
            font-size: 15px;
            line-height: 1.62;
        }

        .content p:last-child,
        .content div:last-child,
        .content ul:last-child,
        .content ol:last-child {
            margin-bottom: 0;
        }

        .content h1,
        .content h2,
        .content h3,
        .content h4 {
            margin: 0 0 14px;
            color: #0a1c31;
            line-height: 1.3;
            font-weight: 700;
        }

        .content h1 { font-size: 25px; letter-spacing: -0.2px; }
        .content h2 { font-size: 21px; }
        .content h3 { font-size: 18px; }

        .content a {
            color: #0d6d66;
            text-decoration: underline;
            text-underline-offset: 2px;
            word-break: break-word;
        }

        .content a.button,
        .content p > a:only-child,
        .content div > a:only-child {
            display: inline-block;
            margin: 5px 0 17px;
            padding: 12px 22px;
            border-radius: 6px;
            background-color: #0d6d66;
            color: #ffffff;
            text-decoration: none;
            font-size: 14px;
            line-height: 1.2;
            font-weight: 700;
            letter-spacing: 0.1px;
        }

        .footer {
            background-color: #f4f8fa;
            border-top: 1px solid #dce7ec;
            padding: 16px 30px;
        }

        .footer td {
            color: #657a8a;
            font-size: 12px;
            line-height: 1.5;
        }

        .footer a {
            color: #3f6c7e;
            text-decoration: underline;
            text-underline-offset: 2px;
        }

        .mono {
            font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
            font-size: 11px;
            letter-spacing: 0.4px;
        }

        @media (prefers-color-scheme: dark) {
            html {
                background-color: #050d18 !important;
            }

            body {
                background-color: #050d18 !important;
                color: #c0d2df !important;
            }

            .email-bg {
                background-color: #050d18 !important;
            }

            .card {
                background-color: #0c1c2e !important;
                border-color: #1c3448 !important;
            }

            .header {
                background-color: #071522 !important;
            }

            .brand {
                color: #effaff !important;
            }

            .brand-small {
                color: #7b9caf !important;
            }

            .content {
                background-color: #0c1c2e !important;
                color: #c0d2df !important;
            }

            .content p,
            .content div,
            .content ul,
            .content ol,
            .content li {
                color: #c0d2df !important;
            }

            .content h1,
            .content h2,
            .content h3,
            .content h4 {
                color: #f1f8fc !important;
            }

            .content a {
                color: #8fd8ff !important;
            }

            .content a.button,
            .content p > a:only-child,
            .content div > a:only-child {
                background-color: #76e0cd !important;
                color: #06231f !important;
            }

            .footer {
                background-color: #091725 !important;
                border-top-color: #193246 !important;
            }

            .footer td {
                color: #8ba5b6 !important;
            }

            .footer a {
                color: #a9c7d7 !important;
            }
        }

        @media only screen and (max-width: 640px) {
            .header {
                padding: 18px 20px !important;
            }

            .content {
                padding: 25px 20px 27px !important;
            }

            .content h1 {
                font-size: 22px !important;
            }

            .footer {
                padding: 14px 20px !important;
            }

            .footer .side {
                display: block !important;
                padding-top: 5px !important;
                text-align: left !important;
            }
        }
    </style>
</head>
<body class="email-body">
    <table role="presentation" class="email-bg" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#eaf1f4">
        <tr>
            <td align="center" style="padding:28px 12px;">
                <table role="presentation" class="card" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#fbfdff" style="width:100%;max-width:620px;margin:0 auto;background-color:#fbfdff;border:1px solid #d7e3e9;border-radius:10px;overflow:hidden;">
                    <tr>
                        <td class="header" bgcolor="#081b2e" style="padding:22px 30px;background-color:#081b2e;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td width="46" valign="middle" style="width:46px;padding-right:12px;">
                                        <img src="${url.resourcesUrl}/img/floodnet_logomark.png" width="40" height="40" alt="FloodNet NYC" style="display:block;width:40px;height:40px;border:0;outline:none;text-decoration:none;" />
                                    </td>
                                    <td valign="middle">
                                        <div class="brand" style="color:#f2fbff;font-size:17px;line-height:1.2;font-weight:700;letter-spacing:0.2px;">FloodNet NYC</div>
                                        <div class="brand-small" style="color:#85a5b7;font-size:10px;line-height:1.3;font-weight:600;letter-spacing:1.7px;text-transform:uppercase;padding-top:4px;">Real-time flood monitoring</div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td class="rule" bgcolor="#5ed6c3" style="height:3px;font-size:0;line-height:3px;background-color:#5ed6c3;">&nbsp;</td>
                    </tr>
                    <tr>
                        <td class="content" bgcolor="#fbfdff" style="padding:32px 36px 34px;background-color:#fbfdff;color:#33465a;">
                            <#nested>
                        </td>
                    </tr>
                    <tr>
                        <td class="footer" bgcolor="#f4f8fa" style="padding:16px 30px;background-color:#f4f8fa;border-top:1px solid #dce7ec;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td style="color:#657a8a;font-size:12px;line-height:1.5;">
                                        &copy; <a href="https://www.floodnet.nyc" style="color:#3f6c7e;text-decoration:underline;text-underline-offset:2px;">FloodNet</a> &middot; New York
                                    </td>
                                    <td class="side" align="right" style="color:#657a8a;font-size:12px;line-height:1.5;text-align:right;">
                                        <a href="https://www.floodnet.nyc" style="color:#3f6c7e;text-decoration:underline;text-underline-offset:2px;" class="mono">FLOODNET.NYC</a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
</#macro>
