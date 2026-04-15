interface Env {
  VITE_TOSS_CLIENT_KEY: string;
  VITE_EMAILJS_PUBLIC_KEY: string;
  VITE_EMAILJS_SERVICE_ID: string;
  VITE_EMAILJS_TEMPLATE_ID: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  return new Response(JSON.stringify({
    tossClientKey: (env.VITE_TOSS_CLIENT_KEY || "").trim(),
    emailjsPublicKey: (env.VITE_EMAILJS_PUBLIC_KEY || "").trim(),
    emailjsServiceId: (env.VITE_EMAILJS_SERVICE_ID || "").trim(),
    emailjsTemplateId: (env.VITE_EMAILJS_TEMPLATE_ID || "").trim(),
  }), {
    headers: {
      "Content-Type": "application/json",
      "X-Custom-Server": "Cloudflare-Pages-Functions"
    }
  });
};
