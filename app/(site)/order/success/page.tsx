import Link from "next/link";
import { whatsappLink } from "@/lib/whatsapp";

type Props = { searchParams: { order?: string; utr?: string } };

export default function OrderSuccessPage({ searchParams }: Props) {
  const order = searchParams.order || "BAL-XXXX";
  const utr = searchParams.utr || "";
  const wa = whatsappLink(
    `Hi Balconia, I paid via UPI for order ${order}${utr ? ` (UTR: ${utr})` : ""}. Please confirm.`
  );

  return (
    <div className="mx-auto flex min-h-[70svh] max-w-lg flex-col items-start justify-center px-4 py-20 md:px-8">
      <p className="furniture text-grey">Thank you</p>
      <h1 className="display mt-3 text-[clamp(2.5rem,8vw,4.5rem)] tracking-[-0.05em]">
        Payment noted
      </h1>
      <p className="mt-4 text-ink/70">
        Order{" "}
        <span className="tabular-nums text-accent">{order}</span>
        {utr ? (
          <>
            {" "}
            · UTR <span className="tabular-nums">{utr}</span>
          </>
        ) : null}
      </p>
      <p className="mt-2 text-sm text-ink/60">
        We will verify your UPI payment and WhatsApp you within a few hours.
        Shipping starts after confirmation.
      </p>
      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary"
        >
          Confirm on WhatsApp
        </a>
        <Link href="/shop" className="btn-outline">
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
