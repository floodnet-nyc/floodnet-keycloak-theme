<#macro emailLayout>
<!doctype html>
<html lang="${locale.language}" dir="${(ltr)?then('ltr','rtl')}">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
    <title>${realmName!"FloodNet"}</title>
    <style type="text/css">
        /* Dark mode (Apple Mail, some clients) */
        @media (prefers-color-scheme: dark) {
            /* 0d131f */
            .bg-body { background:#445370 !important;color:#e8edf7 !important; }
            .card { background:#121a2b !important; }
            .btn { color:#000000 !important; }
            /* .muted    { color:#b8c3d9 !important; } */
        }
        .bg-body {
            margin: 0;
            padding: 24px 12px;
            /* background: #424f72; */
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background:#f3f6fb;
            color:#0b1a3a;
        }

        table {
            border-spacing: 0;
            border-collapse: separate;
        }

        /* .outer {
            width: 100%;
            background: #424f72;
        } */

        /* .card {
            width: 100%;
            max-width: 640px;
            margin: 0 auto;
            border-radius: 18px;
            overflow: hidden;
            background:#ffffff;
            box-shadow: 0 -9px 15px rgba(6, 16, 168, 0.19) inset, 0 10px 30px rgba(2, 0, 60, 0.27);
        } */

        /* .hero {
            padding: 40px 28px 30px;
            text-align: center;
            background: linear-gradient(135deg, #4d8f86 0%, #7ca4ca 100%);
        } */

        .logo {
            width: 158px;
            max-width: 72%;
            display: block;
            margin: 0 auto 18px;
        }

        .kicker {
            margin: 10px 0 0;
            font-size: 48px;
            line-height: 1.14;
            font-weight: 700;
            color: #eff8ff;
        }

        .sub {
            margin: 10px 0 0;
            font-size: 16px;
            line-height: 1.4;
            font-weight: 600;
            color: rgba(8, 17, 32, 0.7);
        }

        /* .content {
            padding: 28px;
            text-align: center;
        } */

        .content p,
        .content div {
            margin: 0 0 12px;
            font-size: 17px;
            line-height: 1.55;
            /* color: #dce7ff; */
        }

        /* .content a {
            color: #7fd6ff;
            text-decoration: underline;
            text-underline-offset: 2px;
            word-break: break-word;
        } */

        .content a.button,
        .content p > a:only-child,
        .content div > a:only-child {
            display: inline-block;
            margin: 14px auto 6px;
            padding: 12px 26px;
            border-radius: 999px;
            background: linear-gradient(135deg, #5fa69b 0%, #4f8f95 100%);
            color: #e8faff;
            text-decoration: none;
            font-weight: 700;
            font-size: 20px;
            line-height: 1.1;
        }

        .notice-wrap {
            padding: 0 28px 30px;
            background: #101c36;
        }

        .notice {
            border: 1px solid #2b456f;
            border-radius: 12px;
            background: #16284b;
            padding: 16px 18px;
            text-align: center;
            color: #bfd1ef;
            font-size: 15px;
            line-height: 1.45;
        }

        .footer {
            padding: 20px 24px;
            text-align: center;
            background: #1a2a4f;
            color: #a5bde0;
            font-size: 14px;
            line-height: 1.45;
        }

        .footer a {
            color: #cfe0ff;
            text-decoration: underline;
            text-underline-offset: 2px;
        }

        @media only screen and (max-width: 640px) {
            body {
                padding: 12px 8px;
            }

            .hero {
                padding: 28px 18px 24px;
            }

            .brand {
                font-size: 16px;
            }

            .kicker {
                font-size: 34px;
            }

            .content,
            .notice-wrap {
                padding-left: 18px;
                padding-right: 18px;
            }

            .content p,
            .content div {
                font-size: 16px;
            }
        }
    </style>
</head>
<body class="bg-body">
    <table role="presentation" class="outer" width="100%">
        <tr>
            <td align="center">
                <table role="presentation" class="card" style="
                    width: 100%;
                    max-width: 600px;
                    margin: 0 auto;
                    border-radius: 18px;
                    overflow: hidden;
                    background:#ffffff;
                    box-shadow: 0 -9px 15px rgba(6, 16, 168, 0.19) inset, 0 10px 30px rgba(2, 0, 60, 0.27);
                ">
                    <tr>
                        <td class="hero" style="
                            padding:16px 24px 16px 24px;
                            text-align: center;
                            color: #fff;
                            text-shadow: 0 1px 5px rgba(0, 0, 0, 0.09);
                            backdrop-filter: blur(3px);
                            box-shadow: 0 0 40px rgba(2, 12, 144, 0.5) inset;
                            background-color: #54857d;
                            background-image: linear-gradient(45deg, #ffffff45, #00000033), linear-gradient(291deg, #46a8ff45, #bdcac733);
                            background-position: center;
                            background-size: cover; 
                        ">
                            <!-- <img class="logo" src="${url.resourcesUrl}/img/floodnet_logomark.png" alt="FloodNet NYC" /> -->
                            <img src="https://static.wixstatic.com/media/a9a703_ff7c73779eb6430a896327bd6e958d93~mv2.png/v1/fill/w_192,h_192,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/floodnet_logo_mark.png" alt="FloodNet Logo" 
                                 style="display:inline-block;border:0;outline:none;text-decoration:none;padding-bottom: 10px; max-width: 80px;" />
                            <p class="brand" style="
                                margin: 0;
                                font-size: 18px;
                                line-height: 1.28;
                                font-weight: 700;
                            ">FloodNet NYC</p>
                            <!-- <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td>
                                    </td>
                                </tr>
                            </table> -->
                        </td>
                    </tr>
                    <tr>
                        <td class="content" style="
                            padding: 28px 48px;
                            text-align: center;
                        ">
                            <#nested>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <!-- rgba(164, 164, 164, 0.06) -->
                        <td class="subtle-overlay" style="
                            padding:16px 24px;
                            background: rgba(116, 128, 255, 0.1);
                        ">
                        <table role="presentation" width="100%">
                            <tr>
                            <td class="center" style="font-size:12px;text-align: center;">
                                © <a href="https://www.floodnet.nyc" style="color: inherit;">FloodNet</a> • New York
                            </td>
                            </tr>
                        </table>
                        </td>
                    </tr>

                    <!-- <tr>
                        <td class="footer">&copy; <a href="https://floodnet.nyc">FloodNet</a> &middot; New York</td>
                    </tr> -->
                </table>

                <!-- Logo chip -->
                <table role="presentation" class="container" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;margin-top:12px;">
                <tr>
                <td align="center">
                    <span class="subtle-overlay" style="
                        display:inline-block;padding:6px 10px;
                        background: rgba(116, 128, 255, 0.1);
                        border:1px solid #90909047;border-radius:999px;
                        color:#8ea0bd;
                        font-size:11px;
                    ">
                    🌧️ Real-time flood monitoring
                    </span>
                </td>
                </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
</#macro>
