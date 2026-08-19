export default async function handler(request) {

    // فقط POST
    if (request.method !== "POST") {

        return new Response(
            JSON.stringify({
                error: "فقط درخواست POST مجاز است."
            }),
            {
                status: 405,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

    }


    try {

        // دریافت اطلاعات از سایت
        const body = await request.json();

        const prompt = body?.prompt;


        // بررسی prompt
        if (!prompt) {

            return new Response(
                JSON.stringify({
                    error: "متن درخواست ارسال نشده است."
                }),
                {
                    status: 400,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );

        }


        // ارسال درخواست به OpenRouter
        const response = await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json",

                    "Authorization":
                        `Bearer ${process.env.OPENROUTER_API_KEY}`,

                    "HTTP-Referer":
                        "https://hadaf.site",

                    "X-Title":
                        "Hadaf Pico AI"
                },

                body: JSON.stringify({

                    model: "openrouter/free",

                    messages: [

                        {
                            role: "system",

                            content:
                                "تو پیکو، شخصیت هوش مصنوعی سایت هدف هستی. فارسی، دوستانه، باحال و مناسب کودک و نوجوان صحبت کن."
                        },

                        {
                            role: "user",

                            content: prompt
                        }

                    ],

                    temperature: 0.7,

                    max_tokens: 500

                })

            }
        );


        // تبدیل پاسخ OpenRouter به JSON
        const data =
            await response.json();


        // اگر OpenRouter خطا داد
        if (!response.ok) {

            return new Response(

                JSON.stringify({
                    error:
                        data?.error?.message ||
                        "OpenRouter خطا داد."
                }),

                {
                    status: response.status,

                    headers: {
                        "Content-Type":
                            "application/json"
                    }
                }

            );

        }


        // گرفتن متن جواب
        const text =
            data?.choices?.[0]?.message?.content;


        // اگر جواب خالی بود
        if (!text) {

            return new Response(

                JSON.stringify({
                    error:
                        "پیکو پاسخی دریافت نکرد."
                }),

                {
                    status: 500,

                    headers: {
                        "Content-Type":
                            "application/json"
                    }
                }

            );

        }


        // پاسخ به سایت
        return new Response(

            JSON.stringify({
                text: text.trim()
            }),

            {
                status: 200,

                headers: {
                    "Content-Type":
                        "application/json"
                }
            }

        );


    } catch (error) {

        console.error(
            "Pico API Error:",
            error
        );


        return new Response(

            JSON.stringify({
                error:
                    "خطای سرور پیکو: " +
                    error.message
            }),

            {
                status: 500,

                headers: {
                    "Content-Type":
                        "application/json"
                }
            }

        );

    }

}
