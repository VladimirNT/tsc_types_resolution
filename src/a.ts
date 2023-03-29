import express from "express"
//import http from "node:http"

;(async function init() {
    const PORT = 10001

    const app = express()
    //const httpServer = http.createServer(app)

    // note: обработчики http запросов тут
    app.get("/", (_, res: express.Response) => {
        res.json({ status: "ok" })
    })
})()
