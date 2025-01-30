type AsyncPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  params: Promise<{ [slug: string]: string }>;
};
