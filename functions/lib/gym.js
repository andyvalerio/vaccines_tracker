"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeGymRestTimer = exports.cancelGymRestTimer = exports.scheduleGymRestTimer = void 0;
const https_1 = require("firebase-functions/v2/https");
const tasks_1 = require("firebase-functions/v2/tasks");
const messaging_1 = require("firebase-admin/messaging");
const tasks_2 = require("@google-cloud/tasks");
const PROJECT_ID = "vaccine-tracker-pupicci";
const REGION = "europe-west1";
const QUEUE_NAME = "executeGymRestTimer";
const FUNCTION_URL = `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/executeGymRestTimer`;
const TASK_NAME_PREFIX = `projects/${PROJECT_ID}/locations/${REGION}/queues/${QUEUE_NAME}/tasks/`;
exports.scheduleGymRestTimer = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'The user must be authenticated.');
    }
    const { deviceToken, restTimeSeconds } = request.data;
    if (!deviceToken) {
        throw new https_1.HttpsError('invalid-argument', 'Device token is required');
    }
    const scheduleDelay = restTimeSeconds || 60;
    // Calculate delivery time
    const scheduleTime = new Date(Date.now() + scheduleDelay * 1000);
    const tasksClient = new tasks_2.CloudTasksClient();
    const parent = tasksClient.queuePath(PROJECT_ID, REGION, QUEUE_NAME);
    const task = {
        httpRequest: {
            httpMethod: "POST",
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
    const [created] = await tasksClient.createTask({ parent, task });
    // The caller keeps this name so it can cancel the push if the rest ends early.
    return {
        success: true,
        taskName: created.name || null,
        message: `Scheduled notification for ${scheduleTime.toISOString()}`
    };
});
exports.cancelGymRestTimer = (0, https_1.onCall)({ region: "europe-west1" }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'The user must be authenticated.');
    }
    const { taskName } = request.data;
    if (!taskName || typeof taskName !== "string") {
        throw new https_1.HttpsError('invalid-argument', 'Task name is required');
    }
    // Only tasks this app queued in its own rest-timer queue may be deleted.
    if (!taskName.startsWith(TASK_NAME_PREFIX)) {
        throw new https_1.HttpsError('permission-denied', 'That task cannot be cancelled');
    }
    const tasksClient = new tasks_2.CloudTasksClient();
    try {
        await tasksClient.deleteTask({ name: taskName });
    }
    catch (error) {
        // NOT_FOUND (5) means the push already fired or was already cancelled — nothing left to do.
        if (error?.code !== 5) {
            console.error("Failed to cancel rest timer task", error);
            throw new https_1.HttpsError('internal', 'Failed to cancel the rest timer');
        }
    }
    return { success: true };
});
exports.executeGymRestTimer = (0, tasks_1.onTaskDispatched)({
    retryConfig: { maxAttempts: 3 },
    rateLimits: { maxConcurrentDispatches: 20 },
    region: "europe-west1"
}, async (req) => {
    const { deviceToken } = req.data;
    try {
        await (0, messaging_1.getMessaging)().send({
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
    }
    catch (error) {
        console.error("Error sending push notification", error);
    }
});
//# sourceMappingURL=gym.js.map