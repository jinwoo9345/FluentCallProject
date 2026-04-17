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

    if (!paymentKey || !orderId || amount == null) {
      return new Response(JSON.stringify({ message: "필수 결제 정보가 누락되었습니다." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return new Response(JSON.stringify({ message: "유효하지 않은 결제 금액입니다." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

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
      body: JSON.stringify({ paymentKey, orderId, amount: numericAmount }),
    });

    const data = await response.json() as any;

    if (response.ok) {
      // Toss 응답 금액이 요청 금액과 다르면 거부
      if (data.totalAmount != null && Number(data.totalAmount) !== numericAmount) {
        return new Response(
          JSON.stringify({ message: "결제 금액 불일치가 감지되었습니다.", detail: { requested: numericAmount, actual: data.totalAmount } }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    }

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
