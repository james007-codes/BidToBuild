const AI_SERVICE_URL = "http://127.0.0.1:8000";


export async function sendMessageToAI(message, threadId) {

    const response = await fetch(
        `${AI_SERVICE_URL}/api/chat/`,
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                message,
                thread_id: threadId
            })
        }
    );


    if (!response.ok) {

        const errorText = await response.text();

        throw new Error(
            `AI service error ${response.status}: ${errorText}`
        );
    }


    return await response.json();
}