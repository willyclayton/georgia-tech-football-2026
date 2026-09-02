import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        {/* viewport-fit=cover enables safe-area insets; max-scale stops iOS focus-zoom fighting the layout */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, shrink-to-fit=no"
        />
        <meta name="theme-color" content="#051E39" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <title>Georgia Tech Football</title>
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              :root {
                --app-height: 100dvh;
                --app-top: 0px;
              }
              html, body, #root {
                height: var(--app-height, 100dvh);
                /* Floor so a stale/small JS pixel value cannot leave a navy gap */
                min-height: 100svh;
                min-height: 100dvh;
                width: 100%;
                margin: 0;
                padding: 0;
                overflow: hidden;
                overscroll-behavior: none;
                background-color: #051E39;
                -webkit-text-size-adjust: 100%;
                touch-action: pan-y;
              }
              #root {
                display: flex;
                flex-direction: column;
                position: fixed;
                top: var(--app-top, 0px);
                left: 0;
                right: 0;
                bottom: auto;
              }
              /* Keep RN web inputs from triggering Safari auto-zoom */
              input, textarea, select {
                font-size: 16px !important;
              }
            `,
          }}
        />
        {/* Pin --app-height to the visible viewport. Do not min() with innerHeight —
            on iOS that value is often the *small* layout viewport and undershoots. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                var root = document.documentElement;
                function apply() {
                  var vv = window.visualViewport;
                  var h = Math.round((vv && vv.height) || window.innerHeight || 0);
                  if (!h) return;
                  var t = Math.round(vv ? vv.offsetTop : 0);
                  root.style.setProperty('--app-height', h + 'px');
                  root.style.setProperty('--app-top', t + 'px');
                }
                function applySoon() {
                  apply();
                  requestAnimationFrame(apply);
                }
                apply();
                if (window.visualViewport) {
                  window.visualViewport.addEventListener('resize', apply);
                  window.visualViewport.addEventListener('scroll', apply);
                }
                window.addEventListener('resize', apply);
                window.addEventListener('orientationchange', applySoon);
                window.addEventListener('pageshow', applySoon);
                document.addEventListener('visibilitychange', function () {
                  if (document.visibilityState === 'visible') applySoon();
                });
                requestAnimationFrame(function () {
                  apply();
                  requestAnimationFrame(apply);
                });
              })();
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
