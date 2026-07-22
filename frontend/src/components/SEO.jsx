import { Helmet } from "react-helmet-async";

const SITE_URL = "https://medassist-tau.vercel.app";
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

export default function SEO({
  title,
  description,
  keywords,
  image = DEFAULT_IMAGE,
  url = `${SITE_URL}/`,
  structuredData,
}) {
  const schema = structuredData ?? {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "MedAssist",
    url: SITE_URL,
    description: "AI Powered Healthcare Assistant",
    publisher: {
      "@type": "Organization",
      name: "MedAssist",
    },
  };

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content="MedAssist" />

      <link rel="canonical" href={url} />

      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={url} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}
