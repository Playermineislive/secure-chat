import { createAppServer } from "./src/index";

const port = process.env.PORT || 3000;
const server = createAppServer();

server.listen(port, () => {
  console.log("Server running on port " + port);
});
