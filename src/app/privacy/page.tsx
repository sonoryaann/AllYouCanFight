import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — All You Can Fight",
  description: "Come All You Can Fight tratta i tuoi dati.",
};

export default function PrivacyPage() {
  return (
    <div className="flex flex-1 flex-col items-center bg-rice px-4 py-10">
      <article className="flex w-full max-w-2xl flex-col gap-6 rounded-2xl bg-card p-6 shadow-xl shadow-nori/5 ring-1 ring-soy-soft/40 sm:p-8">
        <header className="flex flex-col gap-1">
          <h1 className="font-display text-3xl font-bold text-nori">Privacy Policy</h1>
          <p className="text-sm text-nori-soft">Ultimo aggiornamento: 20 luglio 2026</p>
        </header>

        <p className="text-nori-soft">
          Questa informativa descrive come vengono trattati i dati personali quando usi
          l&apos;applicazione web <strong>All You Can Fight</strong> (di seguito &quot;l&apos;App&quot;),
          in conformità al Regolamento (UE) 2016/679 (GDPR).
        </p>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-lg font-semibold text-nori">Titolare del trattamento</h2>
          <p className="text-nori-soft">
            Il titolare del trattamento è <strong>RyanWare</strong>. Per qualsiasi richiesta relativa
            ai tuoi dati puoi scrivere a{" "}
            <a href="mailto:info@ryanware.it" className="font-medium text-salmon-dark underline">
              info@ryanware.it
            </a>
            .
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-lg font-semibold text-nori">Dati che raccogliamo</h2>
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-nori-soft">
            <li>
              <strong>Username</strong> che scegli per entrare in una partita (visibile agli altri
              giocatori della stessa stanza). Ti invitiamo a non usare dati personali reali: uno
              soprannome è più che sufficiente.
            </li>
            <li>
              <strong>Attività di gioco</strong>: i piatti che ordini e segni come mangiati e i
              relativi punteggi, per far funzionare la classifica e le missioni.
            </li>
            <li>
              <strong>Identificativo di sessione anonimo</strong>: un identificativo tecnico generato
              automaticamente (autenticazione anonima) e salvato nella memoria del tuo browser, usato
              solo per collegarti alla tua partita. Non è un cookie di tracciamento e non ti
              identifica personalmente.
            </li>
            <li>
              <strong>Statistiche di utilizzo aggregate</strong> tramite Vercel Web Analytics
              (numero di visite, pagine viste, provenienza): dati <strong>aggregati e anonimi</strong>,
              raccolti <strong>senza cookie</strong> e senza profilazione.
            </li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-lg font-semibold text-nori">Finalità e base giuridica</h2>
          <p className="text-nori-soft">
            Trattiamo i dati per <strong>fornire il servizio</strong> che richiedi (creare o
            partecipare a una partita, calcolare classifica, missioni e premi) — base giuridica:
            esecuzione del servizio su tua richiesta. Le statistiche di utilizzo aggregate rispondono
            al nostro legittimo interesse a capire come viene usata l&apos;App, in forma anonima.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-lg font-semibold text-nori">Dove sono conservati i dati</h2>
          <p className="text-nori-soft">
            I dati di gioco sono conservati tramite <strong>Supabase</strong> su server situati
            nell&apos;<strong>Unione Europea (Francoforte, Germania)</strong>. Non vendiamo i tuoi
            dati, non li usiamo per pubblicità e non effettuiamo profilazione.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-lg font-semibold text-nori">Conservazione</h2>
          <p className="text-nori-soft">
            I dati di una partita vengono conservati per il tempo necessario a giocare e a mostrare i
            risultati. Puoi richiederne la cancellazione in qualsiasi momento (vedi sotto).
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-lg font-semibold text-nori">Cookie</h2>
          <p className="text-nori-soft">
            L&apos;App <strong>non usa cookie di profilazione o di terze parti</strong>. Utilizziamo
            solo la memoria locale del browser per il funzionamento tecnico del gioco (la sessione
            anonima). Per questo non è necessario alcun banner di consenso.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-lg font-semibold text-nori">Account Google (opzionale)</h2>
          <p className="text-nori-soft">
            Puoi scegliere di accedere con il tuo account Google per avere un profilo persistente.
            In questo caso trattiamo <strong>nome e immagine del profilo</strong> forniti da Google,
            usati solo per la tua identità nell&apos;App e nelle classifiche. L&apos;accesso utilizza
            un <strong>cookie di sessione strettamente necessario</strong> al funzionamento
            dell&apos;autenticazione: non aggiunge alcun tracker e non richiede un banner di
            consenso. Puoi <strong>eliminare il tuo account e tutti i dati collegati</strong> in
            qualsiasi momento, in autonomia, dalla pagina <strong>Profilo</strong>, oppure scrivendo
            a{" "}
            <a href="mailto:info@ryanware.it" className="font-medium text-salmon-dark underline">
              info@ryanware.it
            </a>
            . Anche questi dati sono conservati tramite Supabase su server nell&apos;Unione Europea.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-lg font-semibold text-nori">I tuoi diritti</h2>
          <p className="text-nori-soft">
            Hai diritto di accesso, rettifica, cancellazione, limitazione e opposizione al
            trattamento, oltre al diritto di proporre reclamo all&apos;autorità di controllo (in
            Italia, il Garante per la protezione dei dati personali). Per esercitare questi diritti
            scrivi a{" "}
            <a href="mailto:info@ryanware.it" className="font-medium text-salmon-dark underline">
              info@ryanware.it
            </a>
            .
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-lg font-semibold text-nori">Modifiche</h2>
          <p className="text-nori-soft">
            Questa informativa può essere aggiornata nel tempo. La data in alto indica l&apos;ultima
            revisione.
          </p>
        </section>

        <Link
          href="/"
          className="tap-active mt-2 inline-flex h-12 items-center justify-center self-start rounded-xl bg-nori px-6 font-display font-semibold text-white"
        >
          ← Torna alla home
        </Link>
      </article>
    </div>
  );
}
