export function ErrorState({ error }: { error: string }) {
  return (
    <div
      className={
        "w-full h-full min-h-60 flex flex-col justify-center items-center bg-rose-100 dark:bg-rose-900 text-red text-center rounded-md p-2"
      }
    >
      <div className="mb-2 text-sm text-rose-500 dark:text-rose-400">
        {error}
      </div>
    </div>
  );
}