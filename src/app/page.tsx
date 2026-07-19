import { CreateForm } from "@/components/CreateForm";
import { JoinForm } from "@/components/JoinForm";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center bg-rice px-4 py-10 sm:py-16">
      <div className="flex w-full max-w-md flex-col gap-8">
        <header className="flex flex-col items-center gap-2 text-center">
          <span className="text-5xl">🍣</span>
          <h1 className="font-display text-4xl font-bold tracking-tight text-nori">
            Sushi Counter
            <span className="text-salmon"> &amp; Battle</span>
          </h1>
          <p className="max-w-xs text-base text-nori-soft">
            Conta i pezzi, sfida gli amici e vinci la cena all-you-can-eat.
          </p>
        </header>

        <section className="rounded-2xl bg-card p-6 shadow-xl shadow-nori/5 ring-1 ring-soy-soft/40">
          <h2 className="font-display mb-4 text-xl font-semibold text-nori">
            Crea una nuova partita
          </h2>
          <CreateForm />
        </section>

        <div className="flex items-center gap-3 px-2">
          <div className="h-px flex-1 bg-soy-soft" />
          <span className="text-sm font-medium text-nori-soft">oppure</span>
          <div className="h-px flex-1 bg-soy-soft" />
        </div>

        <section className="rounded-2xl bg-card p-6 shadow-xl shadow-nori/5 ring-1 ring-soy-soft/40">
          <h2 className="font-display mb-4 text-xl font-semibold text-nori">
            Unisciti a una partita
          </h2>
          <JoinForm />
        </section>
      </div>
    </div>
  );
}
