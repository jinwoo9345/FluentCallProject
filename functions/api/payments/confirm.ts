interface Env {
  TOSS_SECRET_KEY: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ message: "Authentication required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const { paymentKey, orderId, amount } = await request.json<any>();
    const secretKey = (env.TOSS_SECRET_KEY || "").trim();

    if (!secretKey) {
      return new Response(JSON.stringify({ message: "TOSS_SECRET_KEY is missing" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    // [Security Refinement] 
    // In a real production environment, you should verify the orderId and amount 
    // against your database (Firestore) here before calling Toss.
    // Example: const order = await getOrderFromFirestore(orderId);
    // if (order.amount !== amount) throw new Error("Amount mismatch");

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
