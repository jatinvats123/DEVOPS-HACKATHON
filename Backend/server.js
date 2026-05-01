import app from "./src/app.js";
import { config } from "./src/config/config.js";
import ConnectDB from "./src/config/database.js";

const PORT = process.env.PORT || 8080;


// Connect to the database and start the server
ConnectDB()


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})