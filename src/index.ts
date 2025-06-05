const port = process.env.PORT ? Number(process.env.PORT) : 3000;

Bun.serve({
  port,
  routes: {
    "/health": Response.json({ status: "ok" }),
  },
  fetch() {
    return new Response("Not Found", { status: 404 });
  },
});

console.log(`HTTP server running on http://localhost:${port}`);
