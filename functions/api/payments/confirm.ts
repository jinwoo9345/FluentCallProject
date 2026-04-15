interface Env {
  TOSS_SECRET_KEY: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const { paymentKey, orderId, amount } = await request.json<any>();
    const secretKey = (env.TOSS_SECRET_KEY || "").trim();

    if (!secretKey) {
      return new Response(JSON.stringify({ message: "TOSS_SECRET_KEY is missing" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    const encryptedSecretKey = btoa(secretKey + ":");

    const response = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        Authorization: `Basic ${encryptedSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    });

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ message: error.message || "Internal Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
