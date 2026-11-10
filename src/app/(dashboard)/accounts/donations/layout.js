import { notFound } from "next/navigation";

/**
 * Donations belonged to the feed-trading edition and is not part of Omni Hub.
 * The route files are kept on disk for data compatibility, but the segment is unreachable.
 */
export default function HiddenModuleLayout() {
  notFound();
}
