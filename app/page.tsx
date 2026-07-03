import HomePageClient from "@/components/home-page-client";
import { getPublicAiConfig } from "@/lib/ai/config";
import { listBooks } from "@/lib/storage/books";

export default async function HomePage() {
  const [books, aiConfig] = await Promise.all([listBooks(), getPublicAiConfig()]);

  return (
    <HomePageClient
      initialBooks={books}
      initialHasApiKey={aiConfig.hasApiKey}
    />
  );
}
