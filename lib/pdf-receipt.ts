import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPricePaise: number;
}

export interface OrderCustomer {
  name: string;
  phone: string;
  email?: string;
  address: string;
  area?: string;
  city: string;
  state: string;
  pin: string;
  notes?: string;
}

export interface OrderFees {
  shippingPaise?: number;
  installationPaise?: number;
  shippingFree?: boolean;
  installationFree?: boolean;
  installNeeded?: boolean;
  couponCode?: string | null;
  note?: string;
}

export interface OrderRecord {
  id: string;
  requestId?: string;
  createdAt: string;
  status: string;
  paymentMethod: string;
  customer: OrderCustomer;
  items: OrderItem[];
  subtotalPaise: number;
  totalPaise?: number;
  fulfilmentType: string;
  fulfilmentLabel?: string;
  shippingStatus?: string;
  fees?: OrderFees;
  ownerId?: string | null;
}

function sanitizeText(str: string): string {
  return String(str || "")
    .replace(/[—–]/g, "-")
    .replace(/[·•]/g, "|")
    .replace(/…/g, "...")
    .replace(/₹/g, "Rs. ")
    .replace(/[^\x20-\x7E\t\n\r]/g, " ");
}

function formatInr(paise: number): string {
  const rupees = (paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `Rs. ${rupees}`;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Kolkata",
    });
  } catch {
    return iso;
  }
}

export async function generateOrderReceiptPdf(order: OrderRecord): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Balconia Receipt ${order.id}`);
  doc.setAuthor("Balconia (care@balconia.in)");
  doc.setSubject(`Order Receipt for ${order.id}`);

  // Standard A4: 595.28 x 841.89 points
  const page = doc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();

  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await doc.embedFont(StandardFonts.HelveticaOblique);

  // Colors
  const primaryGreen = rgb(0.22, 0.3, 0.21); // #384c36
  const textDark = rgb(0.15, 0.2, 0.15); // #263426
  const textMuted = rgb(0.42, 0.47, 0.4); // #6c7766
  const lineLight = rgb(0.85, 0.87, 0.82); // #dcded1
  const bgBox = rgb(0.97, 0.96, 0.93); // #f8f5ed

  let y = height - 50;

  // Header Banner
  page.drawRectangle({
    x: 40,
    y: y - 55,
    width: width - 80,
    height: 65,
    color: primaryGreen,
  });

  page.drawText("BALCONIA", {
    x: 55,
    y: y - 25,
    size: 24,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawText("Make room for little moments | www.balconia.in", {
    x: 55,
    y: y - 42,
    size: 10,
    font: fontRegular,
    color: rgb(0.9, 0.94, 0.88),
  });

  page.drawText("OFFICIAL RECEIPT", {
    x: width - 210,
    y: y - 28,
    size: 13,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawText("CASH ON DELIVERY", {
    x: width - 210,
    y: y - 42,
    size: 9,
    font: fontBold,
    color: rgb(0.95, 0.85, 0.4),
  });

  y -= 75;

  // Order Details Bar
  page.drawRectangle({
    x: 40,
    y: y - 35,
    width: width - 80,
    height: 35,
    color: bgBox,
    borderColor: lineLight,
    borderWidth: 1,
  });

  page.drawText(`Order Reference: ${order.id}`, {
    x: 50,
    y: y - 22,
    size: 10,
    font: fontBold,
    color: primaryGreen,
  });

  page.drawText(`Date: ${sanitizeText(formatDate(order.createdAt))}`, {
    x: 340,
    y: y - 22,
    size: 9,
    font: fontRegular,
    color: textDark,
  });

  y -= 50;

  // Two columns: Customer Details vs Company Info
  const colWidth = (width - 100) / 2;

  // Left Column: Customer
  page.drawText("DELIVERY & CUSTOMER DETAILS", {
    x: 45,
    y,
    size: 9,
    font: fontBold,
    color: primaryGreen,
  });

  let custY = y - 16;
  page.drawText(`Name: ${sanitizeText(order.customer.name)}`, {
    x: 45,
    y: custY,
    size: 9,
    font: fontBold,
    color: textDark,
  });
  custY -= 14;

  page.drawText(`Mobile: +91 ${sanitizeText(order.customer.phone)}`, {
    x: 45,
    y: custY,
    size: 9,
    font: fontRegular,
    color: textDark,
  });
  custY -= 14;

  if (order.customer.email) {
    page.drawText(`Email: ${sanitizeText(order.customer.email)}`, {
      x: 45,
      y: custY,
      size: 9,
      font: fontRegular,
      color: textDark,
    });
    custY -= 14;
  }

  // Address lines
  const addressLine1 = sanitizeText(order.customer.address);
  const addressLine2 = sanitizeText([order.customer.area, order.customer.city].filter(Boolean).join(", "));
  const addressLine3 = sanitizeText(`${order.customer.state} - ${order.customer.pin}`);

  page.drawText(`Address: ${addressLine1.slice(0, 42)}`, {
    x: 45,
    y: custY,
    size: 8.5,
    font: fontRegular,
    color: textDark,
  });
  custY -= 12;

  if (addressLine1.length > 42) {
    page.drawText(`  ${addressLine1.slice(42, 85)}`, {
      x: 45,
      y: custY,
      size: 8.5,
      font: fontRegular,
      color: textDark,
    });
    custY -= 12;
  }

  page.drawText(`  ${addressLine2}`, {
    x: 45,
    y: custY,
    size: 8.5,
    font: fontRegular,
    color: textDark,
  });
  custY -= 12;

  page.drawText(`  ${addressLine3}`, {
    x: 45,
    y: custY,
    size: 8.5,
    font: fontRegular,
    color: textDark,
  });

  // Right Column: Fulfillment & Balconia Care
  const rightX = 40 + colWidth + 20;
  page.drawText("FULFILLMENT & BALCONIA CARE", {
    x: rightX,
    y,
    size: 9,
    font: fontBold,
    color: primaryGreen,
  });

  let rightY = y - 16;
  const isInstallation =
    order.fulfilmentType === "installation" ||
    order.fulfilmentType === "balconia";
  const fulfillmentTitle = isInstallation
    ? "Option B: Products + Professional Installation"
    : "Option A: Products Only - DIY";

  page.drawText(`Fulfillment Choice:`, {
    x: rightX,
    y: rightY,
    size: 8.5,
    font: fontBold,
    color: primaryGreen,
  });
  rightY -= 13;

  page.drawText(fulfillmentTitle, {
    x: rightX,
    y: rightY,
    size: 8.5,
    font: fontBold,
    color: textDark,
  });
  rightY -= 15;

  page.drawText(`Payment Mode: Cash on Delivery (COD)`, {
    x: rightX,
    y: rightY,
    size: 8.5,
    font: fontRegular,
    color: textDark,
  });
  rightY -= 13;

  page.drawText(`Payment Status: Pending on Delivery`, {
    x: rightX,
    y: rightY,
    size: 8.5,
    font: fontRegular,
    color: textDark,
  });
  rightY -= 15;

  page.drawText(`Customer Care: care@balconia.in`, {
    x: rightX,
    y: rightY,
    size: 8.5,
    font: fontRegular,
    color: textDark,
  });
  rightY -= 13;

  page.drawText(`Phone: +91 8448528555`, {
    x: rightX,
    y: rightY,
    size: 8.5,
    font: fontRegular,
    color: textDark,
  });
  rightY -= 13;

  page.drawText(`Hub: DLF Phase V, Sector 53, Gurugram`, {
    x: rightX,
    y: rightY,
    size: 8.5,
    font: fontRegular,
    color: textMuted,
  });

  y = Math.min(custY, rightY) - 25;

  // Itemized Table Header
  page.drawRectangle({
    x: 40,
    y: y - 22,
    width: width - 80,
    height: 22,
    color: primaryGreen,
  });

  page.drawText("ITEM DESCRIPTION", {
    x: 50,
    y: y - 15,
    size: 8.5,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawText("QTY", {
    x: 350,
    y: y - 15,
    size: 8.5,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawText("UNIT PRICE", {
    x: 405,
    y: y - 15,
    size: 8.5,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawText("TOTAL", {
    x: 495,
    y: y - 15,
    size: 8.5,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  y -= 25;

  // Items List
  let subtotalCalculated = 0;
  for (let i = 0; i < order.items.length; i++) {
    const item = order.items[i];
    const itemTotal = item.unitPricePaise * item.quantity;
    subtotalCalculated += itemTotal;

    if (i % 2 === 1) {
      page.drawRectangle({
        x: 40,
        y: y - 18,
        width: width - 80,
        height: 20,
        color: bgBox,
      });
    }

    const rawName = sanitizeText(item.name);
    const itemName = rawName.length > 44 ? rawName.slice(0, 42) + "..." : rawName;
    page.drawText(itemName, {
      x: 50,
      y: y - 12,
      size: 8.5,
      font: fontRegular,
      color: textDark,
    });

    page.drawText(String(item.quantity), {
      x: 360,
      y: y - 12,
      size: 8.5,
      font: fontRegular,
      color: textDark,
    });

    page.drawText(formatInr(item.unitPricePaise), {
      x: 405,
      y: y - 12,
      size: 8.5,
      font: fontRegular,
      color: textDark,
    });

    page.drawText(formatInr(itemTotal), {
      x: 495,
      y: y - 12,
      size: 8.5,
      font: fontBold,
      color: textDark,
    });

    y -= 20;
  }

  // Divider line
  page.drawLine({
    start: { x: 40, y: y - 5 },
    end: { x: width - 40, y: y - 5 },
    thickness: 1,
    color: lineLight,
  });

  y -= 20;

  // Totals Section
  const totalsLeftX = 330;
  const totalsValX = 495;

  // Subtotal
  page.drawText("Product Subtotal:", {
    x: totalsLeftX,
    y,
    size: 9,
    font: fontRegular,
    color: textDark,
  });
  page.drawText(formatInr(order.subtotalPaise), {
    x: totalsValX,
    y,
    size: 9,
    font: fontBold,
    color: textDark,
  });
  y -= 16;

  // Delivery
  const shippingPaise = order.fees?.shippingPaise ?? 15000;
  const isShipFree = order.fees?.shippingFree || shippingPaise === 0;
  page.drawText("Delivery Charges:", {
    x: totalsLeftX,
    y,
    size: 9,
    font: fontRegular,
    color: textDark,
  });
  page.drawText(isShipFree ? "FREE" : formatInr(shippingPaise), {
    x: totalsValX,
    y,
    size: 9,
    font: fontBold,
    color: isShipFree ? primaryGreen : textDark,
  });
  y -= 16;

  // Installation (if applicable)
  const installationPaise = order.fees?.installationPaise ?? (isInstallation ? 50000 : 0);
  const isInstallFree = isInstallation && (order.fees?.installationFree || installationPaise === 0);
  if (isInstallation) {
    page.drawText("Professional Installation:", {
      x: totalsLeftX,
      y,
      size: 9,
      font: fontRegular,
      color: textDark,
    });
    page.drawText(isInstallFree ? "FREE" : formatInr(installationPaise), {
      x: totalsValX,
      y,
      size: 9,
      font: fontBold,
      color: isInstallFree ? primaryGreen : textDark,
    });
    y -= 16;
  }

  // Coupon / Discount
  if (order.fees?.couponCode) {
    page.drawText(`Discount (Code: ${sanitizeText(order.fees.couponCode)}):`, {
      x: totalsLeftX,
      y,
      size: 9,
      font: fontRegular,
      color: primaryGreen,
    });
    page.drawText("Offer Applied", {
      x: totalsValX,
      y,
      size: 9,
      font: fontBold,
      color: primaryGreen,
    });
    y -= 16;
  }

  // Grand Total Box
  const finalTotalPaise =
    order.totalPaise ??
    (order.subtotalPaise + (isShipFree ? 0 : shippingPaise) + (isInstallation ? (isInstallFree ? 0 : installationPaise) : 0));

  const boxHeight = 28;
  y -= 8;
  const boxY = y - boxHeight;

  page.drawRectangle({
    x: totalsLeftX - 10,
    y: boxY,
    width: width - totalsLeftX - 30,
    height: boxHeight,
    color: primaryGreen,
  });

  const textY = boxY + 9;

  page.drawText("TOTAL PAYABLE (COD):", {
    x: totalsLeftX,
    y: textY,
    size: 10,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawText(formatInr(finalTotalPaise), {
    x: totalsValX,
    y: textY,
    size: 11,
    font: fontBold,
    color: rgb(0.95, 0.85, 0.4),
  });

  y = boxY - 20;

  // Notice & Terms
  page.drawRectangle({
    x: 40,
    y: y - 50,
    width: width - 80,
    height: 50,
    color: bgBox,
    borderColor: lineLight,
    borderWidth: 1,
  });

  page.drawText("Important Information regarding Cash on Delivery:", {
    x: 50,
    y: y - 15,
    size: 8.5,
    font: fontBold,
    color: textDark,
  });

  page.drawText(
    "1. Payment is collected upon delivery. Please inspect your pieces and planters with the delivery executive.",
    {
      x: 50,
      y: y - 27,
      size: 8,
      font: fontRegular,
      color: textMuted,
    }
  );

  page.drawText(
    "2. For returns or queries, contact us at care@balconia.in or WhatsApp 8448528555 within 7 days of delivery.",
    {
      x: 50,
      y: y - 39,
      size: 8,
      font: fontRegular,
      color: textMuted,
    }
  );

  // Bottom Footer
  page.drawText(
    "Thank you for choosing Balconia - Make room for little moments",
    {
      x: width / 2 - 130,
      y: 35,
      size: 8.5,
      font: fontOblique,
      color: primaryGreen,
    }
  );

  return await doc.save();
}
