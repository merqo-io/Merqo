import { redirect } from "next/navigation";

// Health lives under Products now; keeps old bookmarks and in-app links working.
export default function AdminHealthRedirect(): never {
  redirect("/admin/products");
}
