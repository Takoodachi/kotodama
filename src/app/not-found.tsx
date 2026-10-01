import { LinkButton } from "@/components/ui/Button";

/** Any address the app doesn't have. On GitHub Pages this is served as 404.html. */
export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <p className="eyebrow">
        <span lang="ja">迷子</span> · Page not found
      </p>
      <h1 className="mt-3 font-mincho text-3xl leading-tight text-paper">There&apos;s nothing at this address</h1>
      <p className="mt-3 text-sm leading-relaxed text-mist">The link may be old, or the address mistyped.</p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <LinkButton href="/practice" variant="primary">
          Practice
        </LinkButton>
        <LinkButton href="/">Home</LinkButton>
      </div>
    </div>
  );
}
