import ReadingTour from "./ReadingTour";

export default async function AblesenPage({ searchParams }: PageProps<"/admin/ablesen">) {
  return <ReadingTour kind="strom" searchParams={searchParams} />;
}
