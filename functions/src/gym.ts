import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onTaskDispatched } from "firebase-functions/v2/tasks";
import { getMessaging } from "firebase-admin/messaging";
import { CloudTasksClient } from "@google-cloud/tasks";

export const scheduleGymRestTimer = onCall({ region: "europe-west1" }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The user must be authenticated.');
    }

    const { deviceToken, restTimeSeconds } = request.data;
    if (!deviceToken) {
        throw new HttpsError('invalid-argument', 'Device token is required');
    }

    const scheduleDelay = restTimeSeconds || 60;

    // Calculate delivery time
    const scheduleTime = new Date(Date.now() + scheduleDelay * 1000);

    const PROJECT_ID = "vaccine-tracker-pupicci";
    const REGION = "europe-west1";
    const QUEUE_NAME = "executeGymRestTimer";
    const FUNCTION_URL = `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/executeGymRestTimer`;

    const tasksClient = new CloudTasksClient();
    const parent = tasksClient.queuePath(PROJECT_ID, REGION, QUEUE_NAME);

    const task: any = {
        httpRequest: {
            httpMethod: "POST" as const,
            url: FUNCTION_URL,
            headers: { "Content-Type": "application/json" },
            body: Buffer.from(JSON.stringify({ data: { deviceToken } })).toString("base64"),
            oidcToken: {
                serviceAccountEmail: `167738804252-compute@developer.gserviceaccount.com`,
            },
        },
        scheduleTime: {
            seconds: Math.floor(scheduleTime.getTime() / 1000),
        },
    };

    await tasksClient.createTask({ parent, task });

    return { success: true, message: `Scheduled notification for ${scheduleTime.toISOString()}` };
});

export const executeGymRestTimer = onTaskDispatched({
    retryConfig: { maxAttempts: 3 },
    rateLimits: { maxConcurrentDispatches: 20 },
    region: "europe-west1"
}, async (req) => {
    const { deviceToken } = req.data;

    try {
        await getMessaging().send({
            token: deviceToken,
            // FIX 1: Use 'data' instead of 'notification' to stop the browser's automatic duplicate popup
            // FIX 2: Values in FCM 'data' MUST be strictly strings (FCM requirement for data payloads)
            data: {
                title: 'Gym Tracker',
                body: 'Rest time is over! Time for your next set.',
                click_action_url: 'https://valerio.nu/vaccines/'
            },
        });
        console.log("Successfully sent push notification");
    } catch (error) {
        console.error("Error sending push notification", error);
    }
});