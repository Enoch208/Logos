import { SpecialistDetail } from "@/components/dashboard/specialist/SpecialistDetail";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  return { title: `${name} · Logos` };
}

export default async function SpecialistDetailPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  return (
    <div className="mx-auto w-full max-w-[1100px] px-5 py-8 md:px-8 md:py-10">
      <SpecialistDetail name={name} />
    </div>
  );
}
