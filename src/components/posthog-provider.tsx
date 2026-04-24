"use client";

import Script from "next/script";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

declare global {
  interface Window {
    posthog?: {
      identify: (distinctId: string, props?: Record<string, unknown>) => void;
      reset: () => void;
      capture: (event: string, props?: Record<string, unknown>) => void;
    };
  }
}

export function PostHogProvider() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

  useEffect(() => {
    if (!key || typeof window === "undefined") return;

    const supabase = createClient();

    const identifyFromSession = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (user && window.posthog) {
        window.posthog.identify(user.id, {
          email: user.email,
          name: user.user_metadata?.full_name,
        });
      }
    };

    // Try once on mount, then retry briefly in case snippet isn't ready yet
    identifyFromSession();
    const retry = setTimeout(identifyFromSession, 1500);

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user && window.posthog) {
        window.posthog.identify(session.user.id, {
          email: session.user.email,
          name: session.user.user_metadata?.full_name,
        });
      } else if (event === "SIGNED_OUT" && window.posthog) {
        window.posthog.reset();
      }
    });

    return () => {
      clearTimeout(retry);
      sub.subscription.unsubscribe();
    };
  }, [key]);

  if (!key) return null;

  const snippet = `
!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init ut me Ce Te ks Os ve Fe As $s register register_once register_for_session unregister unregister_for_session lr Vs getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSurveysLoaded onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey canRenderSurveyAsync identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty xs Ss createPersonProfile Is opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing Ms debug getPageViewId captureTraceFeedback captureTraceMetric".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
posthog.init('${key}', {
  api_host: '${host}',
  person_profiles: 'identified_only',
  capture_pageview: true,
  capture_pageleave: true,
  session_recording: {
    maskAllInputs: false,
    maskInputOptions: { password: true }
  }
});
`;

  return (
    <Script id="posthog-snippet" strategy="afterInteractive">
      {snippet}
    </Script>
  );
}
