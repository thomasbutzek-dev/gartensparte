import ReadingTour from "../ReadingTour";

export default async function WasserAblesenPage({ searchParams }: PageProps<"/admin/ablesen/wasser">) {
  return <ReadingTour kind="wasser" searchParams={searchParams} />;
}
