import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { StudioShell } from "@/components/studio-shell";
import { I18nProvider } from "@/lib/i18n-context";
import { readLocaleHint } from "@/lib/read-locale-hint";
import { allPetIdleSheetUrls } from "@/lib/png-sequence";
import appCss from "../styles.css?url";

const petSheetLinks = allPetIdleSheetUrls().map((href) => ({
  rel: "preload" as const,
  href,
  as: "image" as const,
  type: "image/webp" as const,
}));

const APP_NAME = "EventLog Isles";
const APP_DESC =
  "Two little isles, waiting for you to raise some critters. Feed them full, play together, give them cute names, and see what happens across the two isles.";
const AUTHOR = "Ray";
const AUTHOR_X = "https://x.com/xesrevinu";
const AUTHOR_HANDLE = "@xesrevinu";
const THEME = "#fff3c4";
const host = import.meta.env.VITE_PUBLIC_HOSTNAME;
const origin = host ? `https://${host}` : undefined;
const ogImage = origin ? `${origin}/og.jpg` : undefined;
const xBanner = origin ? `${origin}/x-banner.jpg` : undefined;

export const Route = createRootRoute({
  loader: async () => ({
    localeHint: await readLocaleHint(),
  }),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content:
          "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover",
      },
      { title: APP_NAME },
      { name: "description", content: APP_DESC },
      { name: "author", content: `${AUTHOR} ${AUTHOR_HANDLE}` },
      { name: "creator", content: AUTHOR },
      { name: "application-name", content: APP_NAME },
      { name: "color-scheme", content: "light" },
      { name: "theme-color", content: THEME },
      { name: "format-detection", content: "telephone=no, email=no, address=no" },
      { name: "referrer", content: "strict-origin-when-cross-origin" },
      { name: "robots", content: "index,follow" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: APP_NAME },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "msapplication-TileColor", content: THEME },
      { name: "msapplication-tap-highlight", content: "no" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: AUTHOR_HANDLE },
      { name: "twitter:creator", content: AUTHOR_HANDLE },
      { name: "twitter:title", content: APP_NAME },
      { name: "twitter:description", content: APP_DESC },
      { property: "og:title", content: APP_NAME },
      { property: "og:description", content: APP_DESC },
      { property: "og:site_name", content: APP_NAME },
      { property: "og:type", content: "x:game" },
      { property: "og:locale", content: "en_US" },
      { property: "og:locale:alternate", content: "zh_CN" },
      ...(origin ? [{ property: "og:url", content: `${origin}/` }] : []),
      ...(ogImage
        ? [
            { property: "og:image", content: ogImage },
            { property: "og:image:type", content: "image/jpeg" },
            { property: "og:image:width", content: "1200" },
            { property: "og:image:height", content: "630" },
            {
              property: "og:image:alt",
              content: "EventLog Isles — two little isles, waiting for someone to raise",
            },
            { name: "twitter:image", content: ogImage },
            {
              name: "twitter:image:alt",
              content: "EventLog Isles — two little isles, waiting for someone to raise",
            },
          ]
        : []),
      ...(xBanner
        ? [
            { property: "x:game:image", content: xBanner },
            { property: "x:game:image:width", content: "1200" },
            { property: "x:game:image:height", content: "264" },
          ]
        : []),
    ],
    links: [
      ...(origin ? [{ rel: "canonical", href: `${origin}/` }] : []),
      { rel: "author", href: AUTHOR_X },
      { rel: "me", href: AUTHOR_X },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32.png" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "stylesheet", href: appCss },
      ...petSheetLinks,
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&family=Nunito:wght@700;800&family=ZCOOL+KuaiLe&display=swap",
      },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  const { localeHint } = Route.useLoaderData();
  return (
    <html
      lang={localeHint === "zh" ? "zh-Hans" : "en"}
      className="antialiased"
      suppressHydrationWarning
    >
      <head>
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        <AuthProvider>
          <I18nProvider hint={localeHint}>
            <StudioShell>
              <Outlet />
            </StudioShell>
          </I18nProvider>
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}
