import { NextRequest } from "next/server";
import { events } from "@/lib/events";
import { logger } from "@/lib/logger";

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const encoder = new TextEncoder();

  logger.trace("SSE Stream started for presentation!");

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

          if (data.path === "/webhook/topic/oid4vp/") {
            if (state === "request-retrieved") {
              controller.enqueue(
                encoder.encode(`event: status\ndata: <div style="text-align: center;">QRCode Scanned, awaiting presentation...</div>\n\n`)
              );
            }
            if (state === "presentation-invalid") {
              controller.enqueue(
                encoder.encode(`event: status\ndata: <div style="text-align: center;">Presentation verification failed</div>\n\n`)
              );
            }
            if (state === "presentation-valid") {
              controller.enqueue(
                encoder.encode(`event: status\ndata: <div style="text-align: center;">Presentation Verified!</div>\n\n`)
              );

              // Log webhook data structure for debugging
              logger.info({ keys: Object.keys(data.data) }, "Presentation valid - webhook data keys");
              logger.info({ webhookData: data.data }, "Full webhook data");

              // Send presentation data to frontend
              // Try multiple possible fields where presentation data might be
              let presentationData = null;

              if (data.data.verified_claims) {
                logger.info("Using verified_claims");
                presentationData = data.data.verified_claims;
              } else if (data.data.presentation) {
                logger.info("Using presentation");
                presentationData = data.data.presentation;
              } else if (data.data.vp_token) {
                logger.info("Using vp_token");
                presentationData = data.data.vp_token;
              } else if (data.data.claims) {
                logger.info("Using claims");
                presentationData = data.data.claims;
              } else {
                logger.info("Using full data object");
                // Send the whole data object for debugging
                presentationData = data.data;
              }

              if (presentationData) {
                logger.info("Sending presentation-data event");
                controller.enqueue(
                  encoder.encode(`event: presentation-data\ndata: ${JSON.stringify(presentationData)}\n\n`)
                );
              } else {
                logger.warn("No presentation data found to send");
              }
            }
          }
        }

        controller.enqueue(
          encoder.encode(`event: debug\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      events.on(`presentation-${id}`, listener);

      request.signal.addEventListener("abort", () => {
        events.off(`presentation-${id}`, listener);
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
