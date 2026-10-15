import { subscribe } from "@/lib/sampler";

export const dynamic = "force-dynamic";

const encoder = new TextEncoder();

export async function GET(request) {
  let unsubscribe = () => {};
  let heartbeat;

  const stream = new ReadableStream({
    start(controller) {
      const write = (text) => {
        try {
          controller.enqueue(encoder.encode(text));
        } catch {
          cleanup();
        }
      };

      function cleanup() {
        clearInterval(heartbeat);
        unsubscribe();
      }

      const off = subscribe(write);
      if (!off) {
        write("event: busy\ndata: {}\n\n");
        controller.close();
        return;
      }
      unsubscribe = off;

      // padding so browsers and proxies that buffer small responses start flushing,
      // plus the reconnect delay the browser should use
      write(`:${" ".repeat(2048)}\nretry: 5000\n\n`);

      // comment line keeps idle proxies from closing the connection
      heartbeat = setInterval(() => write(": ping\n\n"), 20000);

      request.signal.addEventListener("abort", () => {
        cleanup();
        try {
          controller.close();
        } catch {}
      });
    },
    cancel() {
      clearInterval(heartbeat);
      unsubscribe();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      // no-transform stops gzip from holding events back
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
