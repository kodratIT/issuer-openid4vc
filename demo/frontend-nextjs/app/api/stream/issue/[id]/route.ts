import { NextRequest } from "next/server";
import { events } from "@/lib/events";
import { logger } from "@/lib/logger";
import QRCode from "qrcode-svg";

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const encoder = new TextEncoder();

  logger.trace("SSE Stream started!");

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`event: debug\ndata: \n\n`));
      controller.enqueue(encoder.encode(`event: qrcode\ndata: \n\n`));

      const listener = (data: any) => {
        if (data.type === "message") {
          controller.enqueue(
            encoder.encode(`event: message\ndata: ${data.message}<br />\n\n`)
          );
          return;
        }

        if (data.type === "debug-message") {
          controller.enqueue(
            encoder.encode(`event: message\ndata: <div style="text-indent: -1rem; padding-left: 1rem;">&gt; ${data.message}: ${JSON.stringify(data.data)}</div>\n\n`)
          );
        }

        if (data.type === "webhook") {
          logger.trace(JSON.stringify(data, null, 2));
          controller.enqueue(
            encoder.encode(`event: message\ndata: <div style="text-indent: -1rem; padding-left: 1rem;">&gt; Webhook data: ${JSON.stringify(data.data)}</div>\n\n`)
          );

          const state = data?.data?.state;

          if (data.path === "/webhook/topic/oid4vci/") {
            if (state === "issued") {
              controller.enqueue(
                encoder.encode(`event: qrcode\ndata: Credential Issued!\n\n`)
              );
              return;
            }
          }
        }

        controller.enqueue(
          encoder.encode(`event: debug\ndata: ${JSON.stringify(data)}\n\n`)
        );

        if ("qrcode" in data) {
          const qrcode = new QRCode({
            content: data.qrcode,
            padding: 4,
            width: 256,
            height: 256,
            color: "#000000",
            background: "#ffffff",
            ecl: "M",
          });
          logger.debug(data.qrcode);
          controller.enqueue(
            encoder.encode(`event: qrcode\ndata: ${qrcode.svg().replace(/\r?\n|\r/g, " ")}\n\n`)
          );
        }
      };

      events.on(`issuance-${id}`, listener);

      request.signal.addEventListener("abort", () => {
        events.off(`issuance-${id}`, listener);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Connection": "keep-alive",
      "Cache-Control": "no-cache",
      "Content-Type": "text/event-stream",
    },
  });
}
