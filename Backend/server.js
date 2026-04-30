<<<<<<< HEAD
import app from './src/app.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
=======
import { app } from "./src/app.js";
import { config } from "./src/config/config.js";
import ConnectDB from "./src/config/database.js";

ConnectDB();
app.listen(config.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
>>>>>>> 5981f9081e6317169dcbc8e91c5ba62a74254063
});