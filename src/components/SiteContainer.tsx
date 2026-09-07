export default function SiteContainer({
  children,
  className = "",
  narrow = false,
}: {
  children: React.ReactNode;
  className?: string;
  narrow?: boolean;
}) {
  return (
    <div className={`mx-auto w-full px-4 ${narrow ? "max-w-2xl" : "max-w-5xl"} ${className}`}>{children}</div>
  );
}
