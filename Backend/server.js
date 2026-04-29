import { app } from "./src/app.js";
import { config } from "./src/config/config.js";
import ConnectDB from "./src/config/database.js";

ConnectDB();
app.listen(config.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});