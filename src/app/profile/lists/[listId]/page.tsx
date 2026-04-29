import { Metadata } from "next";
import { ListDetailView } from "@/components/lists/ListDetailView";

export const metadata: Metadata = {
  title: "List",
};

interface ProfileListPageProps {
  params: Promise<{
    listId: string;
  }>;
}

export default async function ProfileListPage({ params }: ProfileListPageProps) {
  const { listId } = await params;
  return <ListDetailView listId={listId} />;
}
