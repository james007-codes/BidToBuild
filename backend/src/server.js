import app from "./app.js";
import env from "./config/env.js";
import connectDB from "./config/db.js";
import { bootstrapPriorityModel } from "./services/priorityModel.js";
import { syncOrdersFile } from "./utils/ordersFile.js";

const startServer = async () => {
    await connectDB();

    app.listen(env.port, () => {
        console.log(`Server running on port ${env.port}`);
    });

    // First run: teach the priority model from complaints already in the database
    bootstrapPriorityModel();

    // Complaints raised before orders.json syncing existed, or while the file was replaced
    syncOrdersFile().catch((error) => console.warn(`orders.json sync failed: ${error.message}`));
};

startServer();