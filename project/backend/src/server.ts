import http from "http";
import express from "express";
import httpProxy from "http-proxy";

const app = express();
const server = http.createServer(app);

const astroProxy = httpProxy.createProxyServer({
    target: "http://frontend.bpa.internal:3000",
    ws: true
});

server.on("upgrade", (req, socket, head) => astroProxy.ws(req, socket, head));
app.use('/{*splat}', async (req, res) => {
    const orig = await fetch(`http://frontend.bpa.internal:3000${req.originalUrl}`);
    orig.headers.forEach((value, key) => res.setHeader(key, value));
    res.status(orig.status);

    const data = await orig.arrayBuffer();
    res.send(Buffer.from(data));
});

const PORT = process.env.PORT ?? 80;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
