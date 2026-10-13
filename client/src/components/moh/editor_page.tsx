import { Render } from "@puckeditor/core";
import { Header } from "@/components/general/header";
import { config, initialData } from "@/components/moh/editor_config";

export function EditorPage() {
  return (
    <>
      <Header />
      <main className="min-h-[calc(100vh-4.5rem)] overflow-x-auto bg-muted/40 px-4 py-12 text-foreground sm:px-6 lg:px-8">
        <Render config={config} data={initialData} />
      </main>
    </>
  );
}