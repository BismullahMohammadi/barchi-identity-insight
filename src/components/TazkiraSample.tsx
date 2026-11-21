import { useState } from "react";
import { ContactRound, X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

const photo = "https://pajhwok.com/wp-content/uploads/2013/02/8480488827_7122a6a2fb_z.jpg";
const credit = "https://pajhwok.com/photo/afghan-computerized-identity-card/";
const reference =
  "https://www.sem.admin.ch/dam/sem/de/data/internationales/herkunftslaender/asien-nahost/afg/afg-dokumente-d.pdf.download.pdf/afg-dokumente-d.pdf#page=39";

export function TazkiraSample() {
  const [failed, setFailed] = useState(false);

  return (
    <Dialog.Root
      onOpenChange={(open) => {
        if (open) setFailed(false);
      }}
    >
      <Dialog.Trigger className="no-print inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-primary hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring">
        <ContactRound aria-hidden size={18} />د برېښنايي تذکرې نمونه
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="window-scrim fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-sm" />
        <Dialog.Content
          dir="rtl"
          className="window-panel fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[calc(100%-1.5rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border bg-card p-4 shadow-2xl sm:p-6"
        >
          <header className="mb-3 flex items-center justify-between gap-3">
            <Dialog.Title className="text-lg font-bold">د افغانستان برېښنايي تذکره</Dialog.Title>
            <Dialog.Close
              aria-label="بندول"
              className="grid size-11 place-items-center rounded-full border hover:bg-muted"
            >
              <X size={18} />
            </Dialog.Close>
          </header>
          <Dialog.Description className="mb-3 text-sm text-muted-foreground">
            په ۲۰۱۳ کال کې په کابل کې نندارې ته وړاندې شوې نمونه
          </Dialog.Description>
          {failed ? (
            <p role="status" className="rounded-xl bg-muted p-4">
              انځور پورته نه شو. نمونه په لاندې سرچینه کې کتلای شئ.
            </p>
          ) : (
            <img
              src={photo}
              alt="په کابل کې د برېښنايي تذکرې نندارې ته وړاندې شوې نمونه"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={() => setFailed(true)}
              className="mx-auto max-h-[48dvh] w-full rounded-xl bg-muted object-contain contrast-[1.04]"
            />
          )}
          <footer className="mt-3 flex flex-wrap items-center justify-between gap-x-4 text-sm text-primary">
            <a
              href={credit}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center underline underline-offset-4"
            >
              عکس: پژواک، حسیب مصلح
            </a>
            <a
              href={reference}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center underline underline-offset-4"
            >
              د کارت دواړه مخونه · د ۲۰۲۵ راپور
            </a>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
