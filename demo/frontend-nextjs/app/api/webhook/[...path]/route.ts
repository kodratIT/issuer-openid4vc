import { NextRequest, NextResponse } from "next/server";
import { events } from "@/lib/events";
import { exchangeCache, presentationCache } from "@/lib/cache";
import { logger } from "@/lib/logger";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const fullPath = `/webhook/${path.join("/")}`;
  const body = await request.json();

  logger.trace("Webhook received");
  logger.trace(fullPath);
  logger.trace(JSON.stringify(body));

  if (fullPath === "/webhook/topic/oid4vci/") {
    if (!body.exchange_id) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    const exchange: any = exchangeCache.get(body.exchange_id);
    if (!exchange) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    events.emit(`issuance-${exchange.registrationId}`, {
      type: "webhook",
      path: fullPath,
      data: body
    });
  }

  if (fullPath === "/webhook/topic/oid4vp/") {
    if (!body.pres_def_id) {
      logger.warn("Webhook received without pres_def_id");
      return NextResponse.json({ success: true }, { status: 200 });
    }

    const exchange: any = presentationCache.get(body.pres_def_id);
    if (!exchange) {
      logger.warn(`No exchange found for pres_def_id: ${body.pres_def_id}`);
      return NextResponse.json({ success: true }, { status: 200 });
    }

    logger.info(`Emitting webhook event for presentation-${exchange.presentationId}`);
    logger.info(`Webhook state: ${body.state}`);
    logger.info(`Webhook body keys: ${Object.keys(body).join(', ')}`);
    
    // Store webhook data in cache for later retrieval
    if (body.state === "presentation-valid") {
      logger.info("Storing verified presentation data in cache");
      presentationCache.set(`verified-${exchange.presentationId}`, {
        ...exchange,
        verifiedData: body,
        verifiedAt: new Date().toISOString()
      });
    }
    
    events.emit(`presentation-${exchange.presentationId}`, {
      type: "webhook",
      path: fullPath,
      data: body
    });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
