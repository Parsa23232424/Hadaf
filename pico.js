export default async function handler(req, res) {

    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Method Not Allowed"
        });
    }

    try {

        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({
                error: "Prompt ارسال نشده است."
            });
        }

        const response = await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",

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
                                "تو پیکو، شخصیت هوش مصنوعی بازی هدف هستی. فارسی، دوستانه و مناسب کودک و نوجوان صحبت کن."
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

        const data = await response.json();

        if (!response.ok) {

            return res.status(response.status).json({
                error:
                    data?.error?.message ||
                    "خطا از OpenRouter"
            });

        }

        const text =
            data?.choices?.[0]?.message?.content;

        if (!text) {

            return res.status(500).json({
                error: "OpenRouter پاسخ متنی نداد."
            });

        }

        return res.status(200).json({
            text: text.trim()
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            error: "خطای داخلی سرور"
        });

    }
}
